import { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  Save,
  Loader2,
  Plus,
  Trash2,
  Search,
  Info,
  Pencil,
  Power,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getRepasseGlobal,
  setRepasseGlobal,
  listOverridesParticulares,
  upsertOverrideParticular,
  deleteOverride,
  toggleOverrideAtivo,
  searchMedicosAtivos,
  type ComissaoOverrideRow,
  type MedicoOption,
} from "@/lib/financeiroConfig";
import { MotivoDialog } from "@/components/financeiro/MotivoDialog";
import { RepasseAuditoriaCard } from "@/components/financeiro/RepasseAuditoriaCard";
import { RepasseSplitInput } from "@/components/financeiro/RepasseSplitInput";

const Section = ({
  icon: Icon,
  title,
  description,
  children,
  action,
}: {
  icon: typeof Wallet;
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <section className="card-elevated p-6">
    <div className="mb-4 flex items-start justify-between gap-3 border-b border-border pb-3">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold leading-tight">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {action}
    </div>
    {children}
  </section>
);

const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...p}
    className={cn(
      "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary",
      p.className,
    )}
  />
);

export default function AdminFinanceiroConfig() {
  // ---------------- Repasse global ----------------
  const [medicoPct, setMedicoPct] = useState<number>(56);
  const [globalValid, setGlobalValid] = useState<boolean>(true);
  const [loadingGlobal, setLoadingGlobal] = useState(true);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const plataformaPct = useMemo(
    () => Math.max(0, Math.min(100, Math.round((100 - medicoPct) * 100) / 100)),
    [medicoPct],
  );

  const loadGlobal = async () => {
    setLoadingGlobal(true);
    try {
      const r = await getRepasseGlobal();
      setMedicoPct(r.medicoPct);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao carregar configuração global.");
    } finally {
      setLoadingGlobal(false);
    }
  };

  // Estado de diálogos com motivo (auditoria)
  const [pendingGlobal, setPendingGlobal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ComissaoOverrideRow | null>(null);
  const [pendingToggle, setPendingToggle] = useState<ComissaoOverrideRow | null>(null);
  const [auditRefresh, setAuditRefresh] = useState(0);

  const salvarGlobal = () => {
    if (!globalValid) {
      toast.error("Corrija o repasse antes de salvar.");
      return;
    }
    if (medicoPct < 0 || medicoPct > 100) {
      toast.error("Use um valor entre 0 e 100.");
      return;
    }
    setPendingGlobal(true);
  };

  const confirmarGlobal = async (motivo: string) => {
    setSavingGlobal(true);
    try {
      await setRepasseGlobal(medicoPct, motivo || null);
      toast.success("Repasse global atualizado.");
      setPendingGlobal(false);
      setAuditRefresh((n) => n + 1);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao salvar.");
    } finally {
      setSavingGlobal(false);
    }
  };

  // ---------------- Exceções ----------------
  const [overrides, setOverrides] = useState<ComissaoOverrideRow[]>([]);
  const [loadingOv, setLoadingOv] = useState(true);
  const [editing, setEditing] = useState<ComissaoOverrideRow | null>(null);
  const [creatingOpen, setCreatingOpen] = useState(false);

  const loadOverrides = async () => {
    setLoadingOv(true);
    try {
      const list = await listOverridesParticulares();
      setOverrides(list);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao carregar exceções.");
    } finally {
      setLoadingOv(false);
    }
  };

  useEffect(() => {
    loadGlobal();
    loadOverrides();
  }, []);

  const removerOverride = (row: ComissaoOverrideRow) => setPendingDelete(row);

  const confirmarRemover = async (motivo: string) => {
    if (!pendingDelete) return;
    try {
      await deleteOverride(pendingDelete.id, motivo || null);
      toast.success("Exceção removida.");
      setPendingDelete(null);
      loadOverrides();
      setAuditRefresh((n) => n + 1);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao remover.");
    }
  };

  const togglar = (row: ComissaoOverrideRow) => setPendingToggle(row);

  const confirmarToggle = async (motivo: string) => {
    if (!pendingToggle) return;
    const novoAtivo = !pendingToggle.ativo;
    try {
      await toggleOverrideAtivo(pendingToggle.id, novoAtivo, motivo || null);
      toast.success(`Exceção ${novoAtivo ? "ativada" : "desativada"}.`);
      setPendingToggle(null);
      loadOverrides();
      setAuditRefresh((n) => n + 1);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao alterar.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Repasse financeiro"
        description="Defina a divisão entre médico e plataforma para consultas particulares (especialidades). Serviços da plataforma usam regra própria."
      />

      {/* ============= Card 1: Global ============= */}
      <Section
        icon={Wallet}
        title="Repasse global · Consultas particulares"
        description="Aplica a todas as consultas de especialidade sem serviço da plataforma vinculado, exceto médicos com exceção configurada."
        action={
          <Button
            size="sm"
            onClick={salvarGlobal}
            disabled={savingGlobal || loadingGlobal || !globalValid}
            className="bg-gradient-primary hover:opacity-90"
          >
            {savingGlobal ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            Salvar
          </Button>
        }
      >
        {loadingGlobal ? (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : (
          <div className="space-y-2">
            <RepasseSplitInput
              medicoPct={medicoPct}
              onChange={setMedicoPct}
              onValidityChange={setGlobalValid}
              labels={{ medico: "% repasse para o médico", plataforma: "% retido pela plataforma" }}
            />
            <p className="text-[11px] text-muted-foreground">
              Edite qualquer um dos dois lados — o outro é recalculado automaticamente para somar 100%.
            </p>
          </div>
        )}

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <span>
            Alterações afetam apenas <strong>novas</strong> consultas. Consultas já agendadas
            mantêm o snapshot financeiro original e nunca são recalculadas.
          </span>
        </div>
      </Section>

      {/* ============= Card 2: Exceções ============= */}
      <Section
        icon={Pencil}
        title="Exceções de repasse por médico"
        description="Defina um % de repasse específico para médicos individuais (sobrepõe a regra global em consultas particulares)."
        action={
          <Button
            size="sm"
            onClick={() => setCreatingOpen(true)}
            className="bg-gradient-primary hover:opacity-90"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Nova exceção
          </Button>
        }
      >
        {loadingOv ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : overrides.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhuma exceção cadastrada. Todos os médicos seguem a regra global.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-12 gap-2 bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <div className="col-span-4">Médico</div>
              <div className="col-span-2 text-right">% médico</div>
              <div className="col-span-2 text-right">% plataforma</div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-2 text-right">Ações</div>
            </div>
            <div className="divide-y divide-border">
              {overrides.map((row) => {
                const med = 100 - Number(row.comissao_pct);
                return (
                  <div
                    key={row.id}
                    className={cn(
                      "grid grid-cols-12 items-center gap-2 px-3 py-2.5 text-sm",
                      !row.ativo && "opacity-60",
                    )}
                  >
                    <div className="col-span-4">
                      <p className="font-medium">{row.medico_nome ?? "—"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {row.medico_crm ? `CRM ${row.medico_crm}` : "—"}
                        {row.motivo ? ` · ${row.motivo}` : ""}
                      </p>
                    </div>
                    <div className="col-span-2 text-right font-semibold tabular-nums">
                      {med.toFixed(2)}%
                    </div>
                    <div className="col-span-2 text-right tabular-nums text-muted-foreground">
                      {Number(row.comissao_pct).toFixed(2)}%
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                          row.ativo
                            ? "border-success/30 bg-success/10 text-success"
                            : "border-muted-foreground/20 bg-muted text-muted-foreground",
                        )}
                      >
                        {row.ativo ? "Ativa" : "Inativa"}
                      </span>
                    </div>
                    <div className="col-span-2 flex justify-end gap-1">
                      <button
                        onClick={() => togglar(row)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title={row.ativo ? "Desativar" : "Ativar"}
                      >
                        <Power className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditing(row)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removerOverride(row)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Remover"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Section>

      {/* ============= Card 3: Hierarquia ============= */}
      <Section
        icon={Info}
        title="Como funciona a hierarquia"
        description="Ordem de prioridade aplicada automaticamente em cada consulta agendada."
      >
        <ol className="space-y-2 text-sm">
          <li className="flex gap-3">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              1
            </span>
            <span>
              <strong>Exceção médico + serviço</strong> — quando o médico tem exceção
              específica para um serviço da plataforma.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              2
            </span>
            <span>
              <strong>Exceção médico (sem serviço)</strong> — regra particular do médico,
              aplicada em todas as consultas de especialidade dele. (gerenciada nesta tela)
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              3
            </span>
            <span>
              <strong>Configuração do serviço</strong> — para consultas vinculadas a serviços
              da plataforma (gerenciados em <em>Serviços</em>).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              4
            </span>
            <span>
              <strong>Repasse global</strong> — fallback para todas as demais consultas
              particulares.
            </span>
          </li>
        </ol>
      </Section>

      {/* ============= Card 4: Histórico/Auditoria ============= */}
      <RepasseAuditoriaCard refreshKey={auditRefresh} />

      {/* Modal criar/editar */}
      {(creatingOpen || editing) && (
        <ExcecaoModal
          row={editing}
          onClose={() => {
            setCreatingOpen(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreatingOpen(false);
            setEditing(null);
            loadOverrides();
            setAuditRefresh((n) => n + 1);
          }}
        />
      )}

      {/* Diálogos com motivo (auditoria) */}
      <MotivoDialog
        open={pendingGlobal}
        title="Confirmar novo repasse global"
        description={`Médico passa a receber ${medicoPct.toFixed(2)}% (plataforma fica com ${plataformaPct.toFixed(2)}%). Aplica-se apenas a NOVAS consultas particulares.`}
        confirmLabel={savingGlobal ? "Salvando…" : "Confirmar e salvar"}
        onCancel={() => !savingGlobal && setPendingGlobal(false)}
        onConfirm={confirmarGlobal}
      />
      <MotivoDialog
        open={!!pendingDelete}
        title={`Remover exceção de ${pendingDelete?.medico_nome ?? "médico"}`}
        description="O médico voltará a seguir a regra global de repasse em novas consultas."
        confirmLabel="Remover"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmarRemover}
      />
      <MotivoDialog
        open={!!pendingToggle}
        title={`${pendingToggle?.ativo ? "Desativar" : "Ativar"} exceção de ${pendingToggle?.medico_nome ?? "médico"}`}
        description={
          pendingToggle?.ativo
            ? "Enquanto desativada, o médico segue a regra global em novas consultas."
            : "Ao reativar, novas consultas voltarão a usar o % específico desta exceção."
        }
        confirmLabel={pendingToggle?.ativo ? "Desativar" : "Ativar"}
        onCancel={() => setPendingToggle(null)}
        onConfirm={confirmarToggle}
      />
    </div>
  );
}

// ============= Modal Exceção =============
function ExcecaoModal({
  row,
  onClose,
  onSaved,
}: {
  row: ComissaoOverrideRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!row;
  const [busca, setBusca] = useState("");
  const [opcoes, setOpcoes] = useState<MedicoOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [medicoSel, setMedicoSel] = useState<MedicoOption | null>(
    row
      ? { id: row.medico_id, nome: row.medico_nome ?? "—", crm: row.medico_crm ?? null }
      : null,
  );
  const [medicoPct, setMedicoPct] = useState<number>(
    row ? 100 - Number(row.comissao_pct) : 56,
  );
  const [motivo, setMotivo] = useState<string>(row?.motivo ?? "");
  const [ativo, setAtivo] = useState<boolean>(row?.ativo ?? true);
  const [valid, setValid] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);

  const plataformaPct = Math.round((100 - medicoPct) * 100) / 100;

  useEffect(() => {
    if (isEdit) return;
    let cancel = false;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchMedicosAtivos(busca);
        if (!cancel) setOpcoes(res);
      } finally {
        if (!cancel) setSearching(false);
      }
    }, 200);
    return () => {
      cancel = true;
      clearTimeout(t);
    };
  }, [busca, isEdit]);

  const salvar = async () => {
    if (!medicoSel) {
      toast.error("Selecione um médico.");
      return;
    }
    if (!valid) {
      toast.error("Corrija o repasse antes de salvar.");
      return;
    }
    if (medicoPct < 0 || medicoPct > 100) {
      toast.error("Use um valor entre 0 e 100.");
      return;
    }
    setSaving(true);
    try {
      await upsertOverrideParticular({
        id: row?.id,
        medico_id: medicoSel.id,
        medicoPct,
        motivo: motivo.trim() || null,
        ativo,
      });
      toast.success(isEdit ? "Exceção atualizada." : "Exceção criada.");
      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="card-elevated w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg font-semibold">
          {isEdit ? "Editar exceção" : "Nova exceção de repasse"}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Aplica-se às consultas particulares (especialidades) deste médico.
        </p>

        <div className="mt-4 space-y-4">
          {!isEdit && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Médico
              </label>
              <div className="mt-1.5 relative">
                <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={medicoSel ? `${medicoSel.nome}${medicoSel.crm ? ` · CRM ${medicoSel.crm}` : ""}` : busca}
                  onChange={(e) => {
                    setMedicoSel(null);
                    setBusca(e.target.value);
                  }}
                  placeholder="Buscar por nome…"
                  className="pl-8"
                />
              </div>
              {!medicoSel && (
                <div className="mt-2 max-h-44 overflow-auto rounded-lg border border-border">
                  {searching ? (
                    <div className="flex items-center justify-center py-3 text-xs text-muted-foreground">
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Buscando…
                    </div>
                  ) : opcoes.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-muted-foreground">
                      Nenhum médico encontrado.
                    </p>
                  ) : (
                    opcoes.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setMedicoSel(m);
                          setBusca("");
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        <span className="font-medium">{m.nome}</span>
                        {m.crm && (
                          <span className="ml-2 text-xs text-muted-foreground">CRM {m.crm}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                % repasse médico
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={medicoPct}
                onChange={(e) =>
                  setMedicoPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                % plataforma
              </label>
              <div className="mt-1.5 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-sm font-medium">
                {plataformaPct.toFixed(2)}%
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Motivo (opcional)
            </label>
            <Input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: médico premium, contrato especial…"
              className="mt-1.5"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Exceção ativa
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={salvar}
            disabled={saving || !medicoSel}
            className="bg-gradient-primary hover:opacity-90"
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            {isEdit ? "Atualizar" : "Criar exceção"}
          </Button>
        </div>
      </div>
    </div>
  );
}
