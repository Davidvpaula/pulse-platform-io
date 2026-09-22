import type { ProfileKey } from './profiles';

export function previewAllowed(dev: boolean, enabled: string | undefined, hostname: string) {
  return dev && enabled === 'true' && ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
}

export const LOCAL_PREVIEW = previewAllowed(import.meta.env.DEV, import.meta.env.VITE_LOCAL_PREVIEW, window.location.hostname);
const KEY = 'pulse.local-profile';
const keys: ProfileKey[] = ['paciente', 'admin', 'secretaria', 'colaborador', 'medico', 'empresa'];
export function previewProfile(): ProfileKey | null {
  if (!LOCAL_PREVIEW) return null;
  const value = sessionStorage.getItem(KEY) as ProfileKey;
  return keys.includes(value) ? value : null;
}
export function selectPreviewProfile(profile: ProfileKey) {
  if (LOCAL_PREVIEW && keys.includes(profile)) sessionStorage.setItem(KEY, profile);
}

// No request reaches the configured Supabase project in local preview.
// Reads show empty states; writes fail explicitly instead of pretending to save.
export const previewFetch: typeof fetch = async (input, init) => {
  const request = input instanceof Request ? input : null;
  const method = (init?.method ?? request?.method ?? 'GET').toUpperCase();
  const headers = new Headers(init?.headers ?? request?.headers);
  if (!['GET', 'HEAD'].includes(method)) {
    return new Response(JSON.stringify({ message: 'Prévia local: operação não enviada. Configure um backend de testes para salvar.', code: 'LOCAL_PREVIEW' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }
  return new Response(method === 'HEAD' ? null : JSON.stringify(headers.get('accept')?.includes('vnd.pgrst.object') ? null : []), {
    status: 200, headers: { 'Content-Type': 'application/json', 'Content-Range': '*/0' },
  });
};
