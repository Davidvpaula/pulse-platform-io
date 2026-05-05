import { useEffect, useState } from "react";
import {
  RefreshCw, Plus, Trash2, Power, Pencil, Save, Loader2, Info, Shield,
  Clock, UserX, AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  listarPoliticasGlobais,
  listarPoliticasMedico,
  upsertPolitica,
  deletePolitica,
  togglePolitica,
  SITUACAO_LABELS,
  ACAO_LABELS,
  type PoliticaReembolsoRow,
  type ReembolsoSituacao,
  type ReembolsoAcao,
} from "@/lib/reembolsoConfig";
import { searchMedicosAtivos, type MedicoOption } from "@/lib/financeiroConfig";

const SITUACAO_ICONS: Record<ReembolsoSituacao, typeof Clock> = {
  cancelamento_antecipado: Clock,
  cancelamento_tardio: AlertTriangle,
  medico_no_show: UserX,
  sem_inicio_finalizacao: RefreshCw,
};

/* ─── Section wrapper ─── */
const Section = ({
  icon: Icon, title, description, children, action,
}: {
  icon: typeof Shield;
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

/* ─── Row card for a policy ─── */
function PolicyCard({
  row,
  onEdit,
  onToggle,
  onDelete,
  showMedico,
}: {
  row: PoliticaReembolsoRow;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  showMedico?: boolean;
}) {
  const SitIcon = SITUACAO_ICONS[row.situacao] ?? Info;
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg border border-border p-4 transition-opacity",
        !row.ativo && "opacity-50",
      )}
    >
      <div className="rounded-lg bg-primary/10 p-2 text-primary">
        <SitIcon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{SITUACAO_LABELS[row.situacao]}</p>
          <Badge variant={row.ativo ? "default" : "secondary"} className="text-[10px]">
            {row.ativo ? "Ativa" : "Inativa"}
          </Badge>
        </div>
        {showMedico && row.medico_nome && (
          <p className="text-xs text-muted-foreground">Médico: {row.medico_nome}</p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          {row.tipo_reembolso === "total"
            ? "Reembolso total (100%)"
            : row.tipo_reembolso === "parcial"
              ? `Reembolso parcial (${Number(row.percentual).toFixed(0)}%)`
              : "Sem reembolso (0%)"}
          {(row.situacao === "cancelamento_antecipado" || row.situacao === "cancelamento_tardio") &&
            ` · Antecedência ≥ ${row.horas_antecedencia_min}h`}
        </p>
        {row.descricao && (
          <p className="text-[11px] text-muted-foreground/70 mt-1 italic">{row.descricao}</p>
        )}
      </div>
      <div className="flex gap-1">
        <button onClick={onToggle} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title={row.ativo ? "Desativar" : "Ativar"}>
          <Power className="h-4 w-4" />
        </button>
        <button onClick={onEdit} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Editar">
          <Pencil className="h-4 w-4" />
        </button>
        <button onClick={onDelete} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Remover">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function AdminReembolsoConfig() {
  const [globais, setGlobais] = useState<PoliticaReembolsoRow[]>([]);
  const [medicos, setMedicos] = useState<PoliticaReembolsoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PoliticaReembolsoRow | null>(null);
  const [creating, setCreating] = useState<"global" | "medico" | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [g, m] = await Promise.all([listarPoliticasGlobais(), listarPoliticasMedico()]);
      setGlobais(g);
      setMedicos(m);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao carregar políticas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (row: PoliticaReembolsoRow) => {
    try {
      await togglePolitica(row.id, !row.ativo);
      toast.success(`Regra ${row.ativo ? "desativada" : "ativada"}.`);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Falha.");
    }
  };

  const handleDelete = async (row: PoliticaReembolsoRow) => {
    if (!confirm("Remover esta regra de reembolso?")) return;
    try {
      await deletePolitica(row.id);
      toast.success("Regra removida.");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Falha.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Políticas de reembolso"
        description="Configure regras de reembolso para cancelamentos e situações especiais. Regras por médico sobrepõem a regra global."
      />

      <Tabs defaultValue="global">
        <TabsList>
          <TabsTrigger value="global">Regras globais ({globais.length})</TabsTrigger>
          <TabsTrigger value="medico">Por médico ({medicos.length})</TabsTrigger>
        </TabsList>

        {/* ── Global ── */}
        <TabsContent value="global" className="space-y-4 mt-4">
          <Section
            icon={Shield}
            title="Regras globais de reembolso"
            description="Aplicadas a todos os médicos que não possuem regra específica."
            action={
              <Button size="sm" onClick={() => setCreating("global")} className="bg-gradient-primary hover:opacity-90">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Nova regra
              </Button>
            }
          >
            {loading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : globais.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nenhuma regra global configurada. Crie regras para cada situação.
              </p>
            ) : (
              <div className="space-y-3">
                {globais.map((r) => (
                  <PolicyCard
                    key={r.id}
                    row={r}
                    onEdit={() => setEditing(r)}
                    onToggle={() => handleToggle(r)}
                    onDelete={() => handleDelete(r)}
                  />
                ))}
              </div>
            )}
          </Section>

          {/* Situações explicação */}
          <Section icon={Info} title="Situações cobertas">
            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <strong>Cancelamento antecipado</strong>
                  <p className="text-xs text-muted-foreground">Paciente cancela com X horas de antecedência mínima. Normalmente reembolso total.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div>
                  <strong>Cancelamento tardio</strong>
                  <p className="text-xs text-muted-foreground">Paciente cancela com menos de X horas. Pode ser parcial ou zero.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <UserX className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div>
                  <strong>Médico não atendeu (no-show médico)</strong>
                  <p className="text-xs text-muted-foreground">Consulta marcada mas o médico não compareceu. Reembolso total automático.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <strong>Sem início/finalização no sistema</strong>
                  <p className="text-xs text-muted-foreground">Consulta não foi iniciada nem finalizada no sistema. Indica que o atendimento não ocorreu.</p>
                </div>
              </div>
            </div>
          </Section>
        </TabsContent>

        {/* ── Per-doctor ── */}
        <TabsContent value="medico" className="space-y-4 mt-4">
          <Section
            icon={Pencil}
            title="Regras por médico"
            description="Exceções de reembolso para médicos específicos. Sobrepõem a regra global."
            action={
              <Button size="sm" onClick={() => setCreating("medico")} className="bg-gradient-primary hover:opacity-90">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Nova exceção
              </Button>
            }
          >
            {loading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : medicos.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nenhuma exceção por médico. Todos seguem as regras globais.
              </p>
            ) : (
              <div className="space-y-3">
                {medicos.map((r) => (
                  <PolicyCard
                    key={r.id}
                    row={r}
                    showMedico
                    onEdit={() => setEditing(r)}
                    onToggle={() => handleToggle(r)}
                    onDelete={() => handleDelete(r)}
                  />
                ))}
              </div>
            )}
          </Section>
        </TabsContent>
      </Tabs>

      {/* ── Modal ── */}
      {(creating || editing) && (
        <PolicyModal
          escopo={creating ?? (editing?.escopo as "global" | "medico")}
          row={editing}
          onClose={() => { setCreating(null); setEditing(null); }}
          onSaved={() => { setCreating(null); setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

/* ─── Create/Edit modal ─── */
function PolicyModal({
  escopo,
  row,
  onClose,
  onSaved,
}: {
  escopo: "global" | "medico";
  row: PoliticaReembolsoRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!row;
  const [situacao, setSituacao] = useState<ReembolsoSituacao>(row?.situacao ?? "cancelamento_antecipado");
  const [tipo, setTipo] = useState<ReembolsoAcao>(row?.tipo_reembolso ?? "total");
  const [percentual, setPercentual] = useState<number>(row ? Number(row.percentual) : 100);
  const [horas, setHoras] = useState<number>(row?.horas_antecedencia_min ?? 24);
  const [descricao, setDescricao] = useState(row?.descricao ?? "");
  const [ativo, setAtivo] = useState(row?.ativo ?? true);
  const [saving, setSaving] = useState(false);

  // Médico search
  const [medicoSel, setMedicoSel] = useState<MedicoOption | null>(
    row?.medico_id ? { id: row.medico_id, nome: row.medico_nome ?? "—", crm: null } : null,
  );
  const [busca, setBusca] = useState("");
  const [opcoes, setOpcoes] = useState<MedicoOption[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (escopo !== "medico" || isEdit) return;
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
    return () => { cancel = true; clearTimeout(t); };
  }, [busca, escopo, isEdit]);

  // Auto-set percentual based on tipo
  useEffect(() => {
    if (tipo === "total") setPercentual(100);
    else if (tipo === "zero") setPercentual(0);
  }, [tipo]);

  const salvar = async () => {
    if (escopo === "medico" && !medicoSel) {
      toast.error("Selecione um médico.");
      return;
    }
    setSaving(true);
    try {
      await upsertPolitica({
        id: row?.id,
        escopo,
        medico_id: escopo === "medico" ? medicoSel?.id : null,
        situacao,
        horas_antecedencia_min: horas,
        tipo_reembolso: tipo,
        percentual,
        ativo,
        descricao: descricao.trim() || null,
      });
      toast.success(isEdit ? "Regra atualizada." : "Regra criada.");
      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const showHoras = situacao === "cancelamento_antecipado" || situacao === "cancelamento_tardio";

  return (
    <Dialog open onOpenChange={() => !saving && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar regra" : escopo === "global" ? "Nova regra global" : "Nova exceção por médico"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Médico selector */}
          {escopo === "medico" && (
            <div>
              <Label>Médico</Label>
              {isEdit ? (
                <p className="text-sm font-medium mt-1">{row?.medico_nome ?? "—"}</p>
              ) : (
                <>
                  <Input
                    value={medicoSel ? medicoSel.nome : busca}
                    onChange={(e) => { setMedicoSel(null); setBusca(e.target.value); }}
                    placeholder="Buscar por nome…"
                    className="mt-1"
                  />
                  {!medicoSel && (
                    <div className="mt-1 max-h-36 overflow-auto rounded-lg border border-border">
                      {searching ? (
                        <div className="flex items-center justify-center py-3 text-xs text-muted-foreground">
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Buscando…
                        </div>
                      ) : opcoes.length === 0 ? (
                        <p className="px-3 py-3 text-xs text-muted-foreground">Nenhum médico encontrado.</p>
                      ) : (
                        opcoes.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => { setMedicoSel(m); setBusca(""); }}
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                          >
                            {m.nome}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Situação */}
          <div>
            <Label>Situação</Label>
            <Select value={situacao} onValueChange={(v) => setSituacao(v as ReembolsoSituacao)} disabled={isEdit}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(SITUACAO_LABELS) as ReembolsoSituacao[]).map((s) => (
                  <SelectItem key={s} value={s}>{SITUACAO_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Horas de antecedência */}
          {showHoras && (
            <div>
              <Label>Horas de antecedência mínima</Label>
              <Input
                type="number"
                min={0}
                value={horas}
                onChange={(e) => setHoras(Number(e.target.value))}
                className="mt-1 w-32"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {situacao === "cancelamento_antecipado"
                  ? "Cancelamento feito com pelo menos essas horas antes da consulta."
                  : "Cancelamento feito com menos que essas horas antes da consulta."}
              </p>
            </div>
          )}

          {/* Tipo de reembolso */}
          <div>
            <Label>Tipo de reembolso</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as ReembolsoAcao)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(ACAO_LABELS) as ReembolsoAcao[]).map((a) => (
                  <SelectItem key={a} value={a}>{ACAO_LABELS[a]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Percentual (only for parcial) */}
          {tipo === "parcial" && (
            <div>
              <Label>Percentual de reembolso (%)</Label>
              <Input
                type="number"
                min={1}
                max={99}
                value={percentual}
                onChange={(e) => setPercentual(Number(e.target.value))}
                className="mt-1 w-32"
              />
            </div>
          )}

          {/* Descrição */}
          <div>
            <Label>Descrição / motivo (opcional)</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Política padrão da clínica…"
              className="mt-1"
              rows={2}
            />
          </div>

          {/* Ativo */}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="h-4 w-4 accent-primary" />
            Regra ativa
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving} className="bg-gradient-primary hover:opacity-90">
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            {isEdit ? "Atualizar" : "Criar regra"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
