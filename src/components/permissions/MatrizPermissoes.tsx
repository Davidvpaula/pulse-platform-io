import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useSession } from "@/lib/session";
import { Loader2, ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RISCO_COLORS } from "@/lib/permissions/constants";

interface Perm { permission_key: string; modulo: string; descricao: string; risco: string; ordem: number }

interface Props {
  /** "perfil" salva em permissoes_perfil(role,...) | "funcao" em function_permissions(funcao_interna,...) */
  scope: "perfil" | "funcao";
  scopeValue: string;
}

type AppRole = Database["public"]["Enums"]["app_role"];
type FuncaoInterna = Database["public"]["Enums"]["funcao_interna"];

export function MatrizPermissoes({ scope, scopeValue }: Props) {
  const { session } = useSession();
  const [catalog, setCatalog] = useState<Perm[]>([]);
  const [ativos, setAtivos] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: cat } = await supabase
        .from("permissions_catalog")
        .select("*")
        .order("ordem");
      setCatalog(cat || []);

      if (scope === "perfil") {
        const { data } = await supabase
          .from("permissoes_perfil")
          .select("permission_key,ativo")
          .eq("role", scopeValue as AppRole);
        setAtivos(new Set((data || []).filter(d => d.ativo).map(d => d.permission_key)));
      } else {
        const { data } = await supabase
          .from("function_permissions")
          .select("permission_key,ativo")
          .eq("funcao_interna", scopeValue as FuncaoInterna);
        setAtivos(new Set((data || []).filter(d => d.ativo).map(d => d.permission_key)));
      }
      setLoading(false);
    })();
  }, [scope, scopeValue]);

  async function toggle(key: string, value: boolean) {
    const next = new Set(ativos);
    if (value) next.add(key); else next.delete(key);
    setAtivos(next);

    try {
      if (scope === "perfil") {
        if (value) {
          await supabase.from("permissoes_perfil").upsert(
            { role: scopeValue as any, permission_key: key, ativo: true },
            { onConflict: "role,permission_key" },
          );
        } else {
          await supabase.from("permissoes_perfil")
            .delete().eq("role", scopeValue as any).eq("permission_key", key);
        }
      } else {
        if (value) {
          await supabase.from("function_permissions").upsert(
            { funcao_interna: scopeValue as any, permission_key: key, ativo: true },
            { onConflict: "funcao_interna,permission_key" },
          );
        } else {
          await supabase.from("function_permissions")
            .delete().eq("funcao_interna", scopeValue as any).eq("permission_key", key);
        }
      }
      await supabase.from("permission_audit_logs").insert({
        scope,
        target_role: scope === "perfil" ? (scopeValue as any) : null,
        target_funcao: scope === "funcao" ? (scopeValue as any) : null,
        permission_key: key,
        acao: value ? "concedida" : "revogada",
        valor_antes: { ativo: !value },
        valor_depois: { ativo: value },
        changed_by: session?.user?.id ?? null,
      });
      toast.success(value ? "Permissão concedida" : "Permissão removida");
    } catch (e: any) {
      toast.error("Erro: " + e.message);
      // rollback visual
      const rb = new Set(ativos);
      setAtivos(rb);
    }
  }

  const filtrado = catalog.filter(
    p => !busca || p.descricao.toLowerCase().includes(busca.toLowerCase())
      || p.permission_key.toLowerCase().includes(busca.toLowerCase()),
  );
  const grupos = Array.from(new Set(filtrado.map(p => p.modulo)));

  if (loading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
    </div>;
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Buscar permissão (ex: financeiro, agenda...)"
        value={busca}
        onChange={e => setBusca(e.target.value)}
        className="max-w-md"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {grupos.map(mod => (
          <div key={mod} className="card-elevated">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">{mod}</h3>
            </div>
            <ul className="divide-y divide-border">
              {filtrado.filter(p => p.modulo === mod).map(p => (
                <li key={p.permission_key} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{p.descricao}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${RISCO_COLORS[p.risco]}`}>
                        {p.risco}
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-muted-foreground">{p.permission_key}</p>
                  </div>
                  <Switch
                    checked={ativos.has(p.permission_key)}
                    onCheckedChange={v => toggle(p.permission_key, v)}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
