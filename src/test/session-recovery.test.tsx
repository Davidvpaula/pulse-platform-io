import { act, cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider, useSession } from '@/lib/session';

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), roles: vi.fn(), unsubscribe: vi.fn(), listener: null as null | ((event: string, next: Session | null) => void) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: {
    getSession: mocks.getSession,
    onAuthStateChange: (listener: typeof mocks.listener) => { mocks.listener = listener; return { data: { subscription: { unsubscribe: mocks.unsubscribe } } }; },
    signOut: vi.fn().mockResolvedValue({ error: null }),
  },
  from: () => ({ select: () => ({ eq: mocks.roles }) }),
} }));
vi.mock('@/lib/clinico', () => ({ ensurePaciente: vi.fn().mockResolvedValue(undefined) }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
const session = (id: string) => ({ user: { id } }) as Session;
function Consumer() {
  const { loading, session, roles, error, retry } = useSession();
  return <><output data-testid="state">{JSON.stringify({ loading, uid: session?.user.id, roles, error })}</output><button onClick={retry}>retry</button></>;
}
const state = () => JSON.parse(screen.getByTestId('state').textContent!);
const mount = (client = new QueryClient()) => render(<QueryClientProvider client={client}><SessionProvider><Consumer /></SessionProvider></QueryClientProvider>);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mocks.roles.mockResolvedValue({ data: [], error: null });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('session recovery and identity isolation', () => {
  it('recovers after getSession rejects', async () => {
    mocks.getSession.mockRejectedValueOnce(new Error('offline'));
    mount();
    await waitFor(() => expect(state().error).toBeTruthy());
    expect(state().loading).toBe(false);
    fireEvent.click(screen.getByText('retry'));
    await waitFor(() => expect(state()).toMatchObject({ error: null, loading: false, roles: [] }));
  });
  it('fails closed when roles cannot be loaded', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: session('a') }, error: null });
    mocks.roles.mockResolvedValue({ data: null, error: { message: 'connection failed' } });
    mount();
    await waitFor(() => expect(state().error).toBeTruthy());
    expect(state().uid).toBeUndefined();
    expect(state().roles).toEqual([]);
  });
  it('ignores a late initial session after logout', async () => {
    const initial = deferred<{ data: { session: Session }; error: null }>();
    mocks.getSession.mockReturnValue(initial.promise);
    mount();
    act(() => mocks.listener!('SIGNED_OUT', null));
    await act(async () => initial.resolve({ data: { session: session('old') }, error: null }));
    expect(state()).toMatchObject({ loading: false, roles: [] });
    expect(state().uid).toBeUndefined();
    expect(mocks.roles).not.toHaveBeenCalled();
  });
  it('does not attach old administrator roles to a new user', async () => {
    const oldRoles = deferred<{ data: { role: string }[]; error: null }>();
    mocks.getSession.mockResolvedValue({ data: { session: session('old-admin') }, error: null });
    mocks.roles.mockReturnValueOnce(oldRoles.promise).mockResolvedValue({ data: [{ role: 'medico' }], error: null });
    mount();
    await waitFor(() => expect(mocks.roles).toHaveBeenCalledWith('user_id', 'old-admin'));
    act(() => mocks.listener!('SIGNED_IN', session('new-doctor')));
    await waitFor(() => expect(state().roles).toEqual(['medico']));
    await act(async () => oldRoles.resolve({ data: [{ role: 'admin' }], error: null }));
    expect(state()).toMatchObject({ uid: 'new-doctor', roles: ['medico'], loading: false });
  });
  it('times out a stalled session request and allows retry', async () => {
    vi.useFakeTimers();
    mocks.getSession.mockReturnValue(new Promise(() => {}));
    mount();
    await act(async () => { await vi.advanceTimersByTimeAsync(12_001); });
    expect(state().loading).toBe(false);
    expect(state().error).toBeTruthy();
  });
  it('unsubscribes when the provider is removed', () => {
    const view = mount();
    view.unmount();
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
  });
  it('discards private query data when the identity changes', async () => {
    const client = new QueryClient();
    mocks.getSession.mockResolvedValue({ data: { session: session('first') }, error: null });
    mount(client);
    await waitFor(() => expect(state().loading).toBe(false));
    client.setQueryData(['private-records'], ['first-user-record']);
    act(() => mocks.listener!('SIGNED_IN', session('second')));
    expect(client.getQueryData(['private-records'])).toBeUndefined();
    await waitFor(() => expect(state().uid).toBe('second'));
    client.setQueryData(['private-records'], ['second-user-record']);
    act(() => mocks.listener!('SIGNED_OUT', null));
    expect(client.getQueryData(['private-records'])).toBeUndefined();
  });
  it('keeps forms and roles ready during a same-user token renewal', async () => {
    const client = new QueryClient();
    mocks.getSession.mockResolvedValue({ data: { session: session('same') }, error: null });
    mocks.roles.mockResolvedValue({ data: [{ role: 'medico' }], error: null });
    mount(client);
    await waitFor(() => expect(state().roles).toEqual(['medico']));
    client.setQueryData(['draft'], 'unsaved-form-context');
    act(() => mocks.listener!('TOKEN_REFRESHED', session('same')));
    expect(state()).toMatchObject({ uid: 'same', roles: ['medico'], loading: false });
    expect(client.getQueryData(['draft'])).toBe('unsaved-form-context');
    expect(mocks.roles).toHaveBeenCalledTimes(1);
  });
});
