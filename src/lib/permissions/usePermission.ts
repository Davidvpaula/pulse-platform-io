import { usePermissionsBatch, clearPermissionsBatchCache } from './usePermissionsBatch';

/** Menu, rotas e ações consultam a mesma fonte reativa. */
export function usePermission(keys: string | string[]) {
  const list = Array.isArray(keys) ? keys : [keys];
  const state = usePermissionsBatch(list);
  return { ...state, hasAny: list.some(state.has), hasAll: list.length > 0 && list.every(state.has) };
}

export const clearPermissionCache = clearPermissionsBatchCache;
