export const INSPECTION_KEY = 'nova-saude.impersonation';
export function inspectionActive() {
  return sessionStorage.getItem(INSPECTION_KEY) !== null;
}
