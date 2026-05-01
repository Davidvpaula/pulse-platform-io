import { supabase } from "@/integrations/supabase/client";
import { collectMenuKeys, colaboradorMenu, type MenuNode } from "./menuCatalog";

/**
 * Validação leve em dev: avisa no console se alguma chave referenciada
 * pelos menus não existir em public.permissions_catalog. Roda 1x por sessão.
 */

let didRun = false;

export async function validateMenuKeys(extraMenus: MenuNode[][] = []) {
  if (didRun) return;
  if (!import.meta.env.DEV) { didRun = true; return; }
  didRun = true;

  try {
    const { data, error } = await supabase
      .from("permissions_catalog")
      .select("permission_key");
    if (error || !data) return;

    const known = new Set(data.map((r: any) => r.permission_key));
    const used = new Set<string>([
      ...collectMenuKeys(colaboradorMenu),
      ...extraMenus.flatMap(m => collectMenuKeys(m)),
    ]);

    const missing = [...used].filter(k => !known.has(k));
    if (missing.length) {
      // eslint-disable-next-line no-console
      console.warn("[menu] Permission keys referenciadas no menu mas ausentes em permissions_catalog:", missing);
    }
  } catch {
    /* silencioso — diagnóstico opcional */
  }
}
