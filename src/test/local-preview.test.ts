import { describe, expect, it } from 'vitest';
import { previewAllowed, previewFetch } from '@/lib/local-preview';

describe('local preview isolation', () => {
  it('requires development, explicit opt-in and loopback hostname', () => {
    expect(previewAllowed(true, 'true', '127.0.0.1')).toBe(true);
    expect(previewAllowed(false, 'true', 'localhost')).toBe(false);
    expect(previewAllowed(true, undefined, 'localhost')).toBe(false);
    expect(previewAllowed(true, 'true', 'pulse.example.com')).toBe(false);
    expect(previewAllowed(true, 'true', 'localhost.example.com')).toBe(false);
  });
  it('returns empty reads without network access', async () => {
    const response = await previewFetch('https://example.invalid/rest/v1/pacientes');
    expect(await response.json()).toEqual([]);
    expect(response.headers.get('Content-Range')).toBe('*/0');
  });
  it.each(['POST', 'PATCH', 'PUT', 'DELETE'])('rejects %s mutations', async method => {
    const response = await previewFetch('https://example.invalid/rest/v1/pacientes', { method });
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe('LOCAL_PREVIEW');
  });
});
