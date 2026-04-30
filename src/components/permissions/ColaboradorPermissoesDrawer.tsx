import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ORIGEM_LABEL, RISCO_COLORS } from "@/lib/permissions/constants";
import { clearPermissionCache } from "@/lib/permissions/usePermission";

interface ColabResumo { user_id: string; nome_completo: string; funcao_interna: string; status_conta: string }

interface Props {
  colaborador: ColabResumo | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface PermEf {
  permission_key: string; modulo: string; descricao: string; risco: string;
  permitido: boolean; origem: string;
}

export function ColaboradorPermissoesDrawer({ colaborador, open, onOpenChange }: Props) {
  const [perms, setPerms] = useState<PermEf[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    if (!colaborador || !open) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("permissoes_efetivas", { _user_id: colaborador.user_id });
      if (error) toast.error(error.message);
      setPerms((data as PermEf[]) || []);
      setLoading(false);
    })();
  }, [colaborador, open]);

  async function override(p: PermEf, novoEfeito: "grant" | "revoke" | null) {
    if (!colaborador) return;
    const motivo = novoEfeito ? prompt(`Motivo para ${novoEfeito === "grant" ? "conceder" : "bloquear"} "${p.descricao}":`) : null;
    if (novoEfeito && !motivo) return;

    try {
      if (novoEfeito === null) {
        await supabase.rpc("colaborador_remover_permissao", {
          _user_id: colaborador.user_id, _key: p.permission_key, _motivo: "Restaurado para padrão",
        });
      } else {
        await supabase.rpc("colaborador_set_permissao", {
          _user_id: colaborador.user_id, _key: p.permission_key, _efeito: novoEfeito as any, _motivo: motivo,
        });
      }
      await supabase.from("permission_audit_logs").insert({
        scope: "colaborador",
        target_user_id: colaborador.user_id,
        permission_key: p.permission_key,
        acao: novoEfeito === null ? "restaurada" : (novoEfeito === "grant" ? "concedida" : "revogada"),
        valor_antes: { origem: p.origem, permitido: p.permitido },
        valor_depois: { override: novoEfeito },
        motivo,
      });
      clearPermissionCache();
      const { data } = await supabase.rpc("permissoes_efetivas", { _user_id: colaborador.user_id });
      setPerms((data as PermEf[]) || []);
      toast.success("Permissão atualizada");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function copiarDe() {
    if (!colaborador) return;
    const email = prompt("E-mail do colaborador para copiar permissões individuais:");
    if (!email) return;
    const { data: src } = await supabase.from("colaboradores").select("user_id").eq("email", email).maybeSingle();
    if (!src) { toast.error("Colaborador não encontrado"); return; }
    const { data: srcPerms } = await supabase.from("permissoes_colaborador")
      .select("permission_key,efeito,motivo").eq("user_id", src.user_id);
    if (!srcPerms?.length) { toast.info("Origem não tem overrides individuais"); return; }
    for (const sp of srcPerms) {
      await supabase.rpc("colaborador_set_permissao", {
        _user_id: colaborador.user_id, _key: sp.permission_key, _efeito: sp.efeito as any,
        _motivo: `Copiada de ${email}`,
      });
    }
    clearPermissionCache();
    const { data } = await supabase.rpc("permissoes_efetivas", { _user_id: colaborador.user_id });
    setPerms((data as PermEf[]) || []);
    toast.success(`${srcPerms.length} permissões copiadas`);
  }

  async function revogarTudo() {
    if (!colaborador) return;
    if (!confirm("Remover TODAS as concessões individuais? Permissões via função/perfil permanecem.")) return;
    await supabase.from("permissoes_colaborador").delete().eq("user_id", colaborador.user_id);
    clearPermissionCache();
    const { data } = await supabase.rpc("permissoes_efetivas", { _user_id: colaborador.user_id });
    setPerms((data as PermEf[]) || []);
    toast.success("Overrides removidos");
  }

  const filt = perms.filter(p => !busca
    || p.descricao.toLowerCase().includes(busca.toLowerCase())
    || p.permission_key.toLowerCase().includes(busca.toLowerCase())
    || p.modulo.toLowerCase().includes(busca.toLowerCase()));
  const grupos = Array.from(new Set(filt.map(p => p.modulo)));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>{colaborador?.nome_completo}</SheetTitle>
          <p className="text-sm text-muted-foreground">
            Função: <strong>{colaborador?.funcao_interna}</strong> · Status: <strong>{colaborador?.status_conta}</strong>
          </p>
        </SheetHeader>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Input placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} className="max-w-xs" />
          <Button variant="outline" size="sm" onClick={copiarDe}>Copiar de outro…</Button>
          <Button variant="outline" size="sm" onClick={revogarTudo}>
            <RotateCcw className="mr-1 h-3 w-3" /> Limpar overrides
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {grupos.map(mod => (
              <div key={mod} className="card-elevated">
                <div className="border-b border-border px-4 py-2 text-sm font-semibold">{mod}</div>
                <ul className="divide-y divide-border">
                  {filt.filter(p => p.modulo === mod).map(p => {
                    const ov = ORIGEM_LABEL[p.origem];
                    const isOverride = p.origem === "grant_individual" || p.origem === "revoke_individual";
                    return (
                      <li key={p.permission_key} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">{p.descricao}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${RISCO_COLORS[p.risco]}`}>{p.risco}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ov.cls}`}>{ov.label}</span>
                          </div>
                          <p className="font-mono text-[11px] text-muted-foreground">{p.permission_key}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={p.permitido}
                            onCheckedChange={v => override(p, v ? "grant" : "revoke")}
                          />
                          {isOverride && (
                            <Button size="sm" variant="ghost" onClick={() => override(p, null)} title="Restaurar padrão">
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
