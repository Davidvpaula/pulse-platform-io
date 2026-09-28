import { inspectionActive } from './inspection-state';
/** Protege a inspeção administrativa e desativa provedores no ambiente local. */
export function createBackendFetch(base: typeof fetch, disableExternal: boolean): typeof fetch {
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const readRpc = ['/rest/v1/rpc/admin_inspecionar_usuario', '/rest/v1/rpc/impersonation_finalizar', '/rest/v1/rpc/has_permissions_batch'];
    if (inspectionActive() && !['GET', 'HEAD'].includes(method) && !url.pathname.startsWith('/auth/v1/') && !readRpc.includes(url.pathname)) {
      return new Response(JSON.stringify({ message: 'Inspeção somente leitura: encerre a inspeção para alterar dados.', code: 'READ_ONLY' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
    const internalFunctions = ['/functions/v1/admin-criar-paciente', '/functions/v1/admin-invite-colaborador'];
    if (disableExternal && url.pathname.startsWith('/functions/v1/') && !internalFunctions.includes(url.pathname)) {
      return new Response(JSON.stringify({ message: 'Integração externa desativada neste ambiente local.', code: 'EXTERNAL_DISABLED' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } });
    }
    return base(input, init);
  };
}
