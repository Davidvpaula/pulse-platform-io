export function localBackendAllowed(dev: boolean, enabled: string | undefined, hostname: string, backendUrl: string) {
  if (!dev || enabled !== 'true' || !['127.0.0.1', 'localhost', '[::1]'].includes(hostname)) return false;
  try {
    const url = new URL(backendUrl);
    return ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  } catch { return false; }
}
export const LOCAL_BACKEND = localBackendAllowed(import.meta.env.DEV, import.meta.env.VITE_LOCAL_BACKEND,
  window.location.hostname, import.meta.env.VITE_SUPABASE_URL);
