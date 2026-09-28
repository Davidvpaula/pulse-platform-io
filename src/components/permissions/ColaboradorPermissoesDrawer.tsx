import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RotateCcw, Zap, Eye } from "lucide-react";
import { toast } from "sonner";
import { ORIGEM_LABEL, RISCO_COLORS } from "@/lib/permissions/constants";
import { clearPermissionsBatchCache } from "@/lib/permissions/usePermissionsBatch";
import { ROLE_TEMPLATES, type RoleTemplate } from "@/lib/permissions/roleTemplates";
import { MenuPreview } from "./MenuPreview";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { requireSuccess } from "@/lib/supabase-result";

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

function invalidateCaches() {
  clearPermissionsBatchCache();
}

export function ColaboradorPermissoesDrawer({ colaborador, open, onOpenChange }: Props) {
  const [perms, setPerms] = useState<PermEf[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!colaborador || !open) return;
    let cancelled = false;
    setPerms([]);
    (async () => {
      setLoading(true);
      try {
        const data = await requireSuccess(supabase.rpc("permissoes_efetivas", { _user_id: colaborador.user_id }));
        if (!cancelled) setPerms((data as PermEf[]) || []);
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : 'Falha ao carregar permissões');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [colaborador, open]);

  // Mapa de permissões para o MenuPreview
  const permMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const p of perms) map[p.permission_key] = p.permitido;
    return map;
  }, [perms]);

  async function reloadPerms() {
    if (!colaborador) return;
    const data = await requireSuccess(supabase.rpc("permissoes_efetivas", { _user_id: colaborador.user_id }));
    setPerms((data as PermEf[]) || []);
  }

  async function override(p: PermEf, novoEfeito: "grant" | "revoke" | null) {
    if (!colaborador || saving) return;
    const motivo = novoEfeito ? prompt(`Motivo para ${novoEfeito === "grant" ? "conceder" : "bloquear"} "${p.descricao}":`) : null;
    if (novoEfeito && !motivo) return;

    setSaving(true);
    try {
      if (novoEfeito === null) {
        await requireSuccess(supabase.rpc("colaborador_remover_permissao", {
          _user_id: colaborador.user_id, _key: p.permission_key, _motivo: "Restaurado para padrão",
        }));
      } else {
        await requireSuccess(supabase.rpc("colaborador_set_permissao", {
          _user_id: colaborador.user_id, _key: p.permission_key, _efeito: novoEfeito as any, _motivo: motivo,
        }));
      }
      // Audit log agora é gerado automaticamente pelo trigger no banco
      invalidateCaches();
      await reloadPerms();
      toast.success("Permissão atualizada");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function executarLote(modo: string, motivo: string, keys: string[] = [], origem: string | null = null) {
    if (!colaborador || saving) return;
    setSaving(true);
    try {
      const total = await requireSuccess(supabase.rpc('colaborador_permissoes_lote' as never, {
        _user_id: colaborador.user_id, _modo: modo, _keys: keys, _origem: origem, _motivo: motivo,
      } as never));
      invalidateCaches();
      await reloadPerms();
      toast.success(`${total} permissão(ões) atualizada(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao atualizar permissões');
    } finally {
      setSaving(false);
    }
  }

  async function aplicarTemplate(template: RoleTemplate) {
    if (!colaborador) return;
    if (!confirm(`Aplicar template "${template.label}"?\nIsso concederá ${template.permissions.length} permissões. Overrides existentes serão mantidos.`)) return;

    await executarLote('template', `Template: ${template.label}`, template.permissions);
  }

  async function copiarDe() {
    if (!colaborador) return;
    const email = prompt("E-mail do colaborador para copiar permissões individuais:");
    if (!email) return;
    const { data: src, error } = await supabase.from("colaboradores").select("user_id").eq("email", email.trim()).maybeSingle();
    if (error) { toast.error(error.message); return; }
    if (!src) { toast.error("Colaborador não encontrado"); return; }
    await executarLote('copiar', `Copiada de ${email}`, [], src.user_id);
  }

  async function revogarTudo() {
    if (!colaborador) return;
    if (!confirm("Remover concessões E bloqueios individuais? Permissões da função/perfil voltam a valer.")) return;
    await executarLote('limpar', 'Restaurar permissões da função/perfil');
  }

  const filt = perms.filter(p => !busca
    || p.descricao.toLowerCase().includes(busca.toLowerCase())
    || p.permission_key.toLowerCase().includes(busca.toLowerCase())
    || p.modulo.toLowerCase().includes(busca.toLowerCase()));
  const grupos = Array.from(new Set(filt.map(p => p.modulo)));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-4xl">
        <fieldset disabled={saving} className="min-w-0">
        <SheetHeader>
          <SheetTitle>{colaborador?.nome_completo}</SheetTitle>
          <p className="text-sm text-muted-foreground">
            Função: <strong>{colaborador?.funcao_interna}</strong> · Status: <strong>{colaborador?.status_conta}</strong>
          </p>
        </SheetHeader>

        {/* Templates */}
        <Collapsible className="mt-4">
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            <Zap className="h-4 w-4" /> Aplicar template de função
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {ROLE_TEMPLATES.map(t => (
                <button
                  key={t.key}
                  onClick={() => aplicarTemplate(t)}
                  className="rounded-lg border border-border p-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <p className="text-sm font-semibold">{t.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t.description}</p>
                  <Badge variant="outline" className="mt-1.5 text-[10px]">
                    {t.permissions.length} permissões
                  </Badge>
                </button>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Input placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} className="max-w-xs" />
          <Button variant="outline" size="sm" onClick={copiarDe}>Copiar de outro…</Button>
          <Button variant="outline" size="sm" onClick={revogarTudo}>
            <RotateCcw className="mr-1 h-3 w-3" /> Limpar overrides
          </Button>
          <Button
            variant={showPreview ? "default" : "outline"}
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="mr-1 h-3 w-3" /> {showPreview ? "Ocultar preview" : "Preview do menu"}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : (
          <div className="mt-4 flex gap-4">
            {/* Coluna principal: permissões */}
            <div className={`space-y-4 ${showPreview ? "flex-1 min-w-0" : "w-full"}`}>
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

            {/* Coluna lateral: preview do menu */}
            {showPreview && (
              <div className="w-64 shrink-0 sticky top-4 self-start">
                <MenuPreview permissoes={permMap} showDiagnostics />
              </div>
            )}
          </div>
        )}
        </fieldset>
      </SheetContent>
    </Sheet>
  );
}
