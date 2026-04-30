import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2, XCircle, FileText, Search, ShieldCheck, Eye, Download,
  AlertTriangle, Clock, History, Plug, RefreshCw, Pause, Ban, Play, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RequirePermission } from "@/components/permissions/RequirePermission";
import {
  listMedicos, listAuditoria, getSignedUrl,
  liberarAcessoFeegow, FEEGOW_STATUS_LABEL,
  STATUS_LABEL, DOC_LABEL,
  MOTIVOS_SUSPENSAO, MOTIVOS_BLOQUEIO,
  medicoColocarEmAnalise, medicoAprovar, medicoReprovar,
  medicoSuspender, medicoBloquear, medicoReativar,
  contarConsultasFuturas,
  type MedicoRow, type MedicoStatus, type DocumentoMedico, type AuditoriaRow,
  type FeegowStatus,
} from "@/lib/medicoRegistro";
import { isValidCpf, formatCpf } from "@/lib/validation/cpf";

function validarFeegow(m: MedicoRow): { ok: boolean; motivo?: string } {
  if (!m.cpf) return { ok: false, motivo: "CPF não informado" };
  if (!isValidCpf(m.cpf)) return { ok: false, motivo: "CPF inválido" };
  if (!m.data_nascimento) return { ok: false, motivo: "Data de nascimento não informada" };
  const d = new Date(m.data_nascimento + "T00:00:00");
  if (Number.isNaN(d.getTime())) return { ok: false, motivo: "Data inválida" };
  const hoje = new Date();
  if (d > hoje) return { ok: false, motivo: "Data no futuro" };
  const idade = (hoje.getTime() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (idade < 18) return { ok: false, motivo: "Médico deve ter ≥18 anos" };
  return { ok: true };
}

const STATUS_ORDER: MedicoStatus[] = [
  "pendente", "em_analise", "aprovado", "suspenso", "bloqueado", "reprovado",
];

type DialogKind = null | "aprovar" | "reprovar" | "em_analise" | "suspender" | "bloquear" | "reativar";

export default function MedicosAprovacao() {
  const [list, setList] = useState<MedicoRow[]>([]);
  const [filter, setFilter] = useState<MedicoStatus | "todos">("todos");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditoriaRow[]>([]);
  const [previewDoc, setPreviewDoc] = useState<{ doc: DocumentoMedico; url: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [futurasCount, setFuturasCount] = useState<number>(0);

  // Dialog state
  const [dlg, setDlg] = useState<DialogKind>(null);
  const [acting, setActing] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [obs, setObs] = useState("");
  const [presetDuracao, setPresetDuracao] = useState<"24h" | "7d" | "30d" | "custom" | "indeterminado">("7d");
  const [customAte, setCustomAte] = useState<string>("");

  async function reload() {
    try {
      const data = await listMedicos();
      setList(data);
    } catch (err) {
      toast({ title: "Erro ao carregar", description: err instanceof Error ? err.message : "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    const ch = supabase
      .channel("medicos-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "medicos" }, reload)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (!selectedId) { setAudit([]); setFuturasCount(0); return; }
    listAuditoria(selectedId).then(setAudit).catch(() => setAudit([]));
    contarConsultasFuturas(selectedId).then(setFuturasCount);
  }, [selectedId, list]);

  const filtered = useMemo(() => {
    return list.filter(m => {
      if (filter !== "todos" && m.status !== filter) return false;
      if (q) {
        const s = q.toLowerCase();
        return m.nome.toLowerCase().includes(s) || m.crm.includes(s) || m.email.toLowerCase().includes(s);
      }
      return true;
    });
  }, [list, filter, q]);

  const selected = list.find(m => m.id === selectedId);

  const counts = useMemo(() => {
    const base: Record<MedicoStatus, number> = {
      pendente: 0, em_analise: 0, aprovado: 0, reprovado: 0, suspenso: 0, bloqueado: 0,
    };
    list.forEach(m => { base[m.status] = (base[m.status] || 0) + 1; });
    return base;
  }, [list]);

  // Alertas inteligentes
  const alertas = useMemo(() => {
    const out: { tipo: string; nivel: "alta" | "media"; titulo: string; medico?: MedicoRow }[] = [];
    list.forEach(m => {
      if (m.status === "aprovado" && (!m.crm || m.crm.length < 3)) {
        out.push({ tipo: "crm", nivel: "alta", titulo: `${m.nome}: CRM ausente ou inválido`, medico: m });
      }
      if (m.status === "suspenso" && m.suspenso_ate && new Date(m.suspenso_ate) <= new Date()) {
        out.push({ tipo: "expirou", nivel: "media", titulo: `${m.nome}: suspensão expirada — reativará no próximo acesso`, medico: m });
      }
    });
    return out;
  }, [list]);

  function openDialog(kind: DialogKind) {
    setMotivo("");
    setObs("");
    setPresetDuracao("7d");
    setCustomAte("");
    setDlg(kind);
  }

  function calcAte(): { ate: string | null; indeterminado: boolean } {
    if (presetDuracao === "indeterminado") return { ate: null, indeterminado: true };
    if (presetDuracao === "custom") {
      return { ate: customAte ? new Date(customAte).toISOString() : null, indeterminado: false };
    }
    const map = { "24h": 1, "7d": 7, "30d": 30 } as const;
    const dias = map[presetDuracao];
    const d = new Date(); d.setDate(d.getDate() + dias);
    return { ate: d.toISOString(), indeterminado: false };
  }

  async function executar() {
    if (!selected || !dlg) return;
    setActing(true);
    try {
      if (dlg === "aprovar") {
        await medicoAprovar(selected.id, obs);
        toast({ title: "Médico aprovado", description: `${selected.nome} já pode acessar a plataforma.` });
        // Auto-libera Feegow se possível
        const v = validarFeegow(selected);
        if (v.ok && selected.feegow_status !== "liberado") {
          liberarAcessoFeegow(selected.id).then(reload);
        }
      } else if (dlg === "em_analise") {
        await medicoColocarEmAnalise(selected.id, obs);
        toast({ title: "Cadastro em análise" });
      } else if (dlg === "reprovar") {
        if (motivo.trim().length < 3) throw new Error("Motivo obrigatório");
        await medicoReprovar(selected.id, motivo, obs);
        toast({ title: "Cadastro reprovado", variant: "destructive" });
      } else if (dlg === "suspender") {
        if (motivo.trim().length < 3) throw new Error("Motivo obrigatório");
        const { ate, indeterminado } = calcAte();
        if (!indeterminado && !ate) throw new Error("Defina a data de término");
        await medicoSuspender({ id: selected.id, motivo, observacao: obs, ate, indeterminado });
        toast({ title: "Médico suspenso", description: indeterminado ? "Suspensão indeterminada" : `Até ${new Date(ate!).toLocaleString("pt-BR")}` });
      } else if (dlg === "bloquear") {
        if (motivo.trim().length < 3) throw new Error("Motivo obrigatório");
        await medicoBloquear(selected.id, motivo, obs);
        toast({ title: "Médico bloqueado", variant: "destructive" });
      } else if (dlg === "reativar") {
        if (obs.trim().length < 3) throw new Error("Justificativa obrigatória");
        await medicoReativar(selected.id, obs);
        toast({ title: "Médico reativado" });
      }
      setDlg(null);
      reload();
    } catch (err: any) {
      toast({ title: "Erro", description: err?.message || "Tente novamente", variant: "destructive" });
    } finally {
      setActing(false);
    }
  }

  async function handlePreview(d: DocumentoMedico) {
    try {
      const url = await getSignedUrl(d.storagePath);
      setPreviewDoc({ doc: d, url });
    } catch { toast({ title: "Erro ao abrir documento", variant: "destructive" }); }
  }

  async function handleDownload(d: DocumentoMedico) {
    try {
      const url = await getSignedUrl(d.storagePath, 60);
      const a = document.createElement("a");
      a.href = url; a.download = d.fileName; a.click();
    } catch { toast({ title: "Erro ao baixar", variant: "destructive" }); }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Cadastros médicos</p>
          <h1 className="font-display text-2xl font-bold">Gestão de médicos</h1>
          <p className="text-sm text-muted-foreground">
            Aprovação, suspensão, bloqueio e reativação. Toda ação fica auditada.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" /> Auditoria ativa
        </div>
      </header>

      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {STATUS_ORDER.map(s => (
          <button
            key={s}
            onClick={() => setFilter(filter === s ? "todos" : s)}
            className={`card-elevated p-4 text-left transition ${filter === s ? "ring-2 ring-primary" : ""}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{STATUS_LABEL[s]}</p>
            <p className="mt-1 text-2xl font-bold">{counts[s]}</p>
          </button>
        ))}
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-warning">
            <AlertTriangle className="h-3.5 w-3.5" /> Alertas inteligentes ({alertas.length})
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {alertas.slice(0, 6).map((a, i) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <span>{a.titulo}</span>
                {a.medico && (
                  <Button size="sm" variant="ghost" onClick={() => setSelectedId(a.medico!.id)}>Ver</Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* Lista */}
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                value={q} onChange={e => setQ(e.target.value)}
                placeholder="Buscar por nome, CRM ou e-mail"
                className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-sm"
              />
            </div>
            <select
              value={filter}
              onChange={e => setFilter(e.target.value as MedicoStatus | "todos")}
              className="rounded-md border border-input bg-background px-2 py-2 text-sm"
            >
              <option value="todos">Todos</option>
              {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>

          <ul className="mt-4 divide-y divide-border">
            {loading && <li className="py-12 text-center text-sm text-muted-foreground">Carregando...</li>}
            {!loading && filtered.length === 0 && <li className="py-12 text-center text-sm text-muted-foreground">Nenhum cadastro encontrado.</li>}
            {filtered.map(m => (
              <li key={m.id}>
                <button
                  onClick={() => setSelectedId(m.id)}
                  className={`flex w-full items-center gap-3 py-3 text-left transition hover:bg-muted/40 ${selectedId === m.id ? "bg-muted/40" : ""}`}
                >
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">
                    {m.nome.split(" ").map(s => s[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{m.nome}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.especialidade} · CRM {m.crm}/{m.crm_estado}</p>
                  </div>
                  <StatusBadge status={m.status} />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Detalhe */}
        <div className="card-elevated p-6">
          {!selected ? (
            <div className="grid h-full place-items-center py-16 text-center text-sm text-muted-foreground">
              <div>
                <FileText className="mx-auto h-10 w-10 opacity-40" />
                <p className="mt-3">Selecione um cadastro para revisar.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold">{selected.nome}</h2>
                  <p className="text-sm text-muted-foreground">{selected.especialidade} · CRM {selected.crm}/{selected.crm_estado}</p>
                  <p className="text-xs text-muted-foreground">{selected.email} · {selected.telefone ?? "—"}</p>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              {/* Banner de status especial */}
              {selected.status === "suspenso" && (
                <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-sm">
                  <p className="flex items-center gap-2 font-semibold text-warning">
                    <Pause className="h-4 w-4" /> Suspenso
                    {selected.suspenso_indeterminado
                      ? " — indeterminado"
                      : selected.suspenso_ate ? ` até ${new Date(selected.suspenso_ate).toLocaleString("pt-BR")}` : ""}
                  </p>
                  {selected.suspensao_motivo && <p className="mt-1"><b>Motivo:</b> {selected.suspensao_motivo}</p>}
                  {selected.suspensao_observacao && <p className="text-xs text-muted-foreground">{selected.suspensao_observacao}</p>}
                </div>
              )}
              {selected.status === "bloqueado" && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <p className="flex items-center gap-2 font-semibold text-destructive">
                    <Ban className="h-4 w-4" /> Bloqueado definitivamente
                  </p>
                  {selected.bloqueio_motivo && <p className="mt-1"><b>Motivo:</b> {selected.bloqueio_motivo}</p>}
                  {selected.bloqueio_observacao && <p className="text-xs text-muted-foreground">{selected.bloqueio_observacao}</p>}
                </div>
              )}
              {selected.motivo_reprovacao && selected.status === "reprovado" && (
                <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-sm">
                  <p className="flex items-center gap-2 font-semibold text-warning">
                    <AlertTriangle className="h-4 w-4" /> Reprovado
                  </p>
                  <p className="mt-1">{selected.motivo_reprovacao}</p>
                </div>
              )}

              {/* Impacto: consultas futuras */}
              {(selected.status === "suspenso" || selected.status === "bloqueado") && futurasCount > 0 && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <p className="font-semibold text-destructive">
                    ⚠ {futurasCount} consulta{futurasCount > 1 ? "s" : ""} futura{futurasCount > 1 ? "s" : ""} ainda agendada{futurasCount > 1 ? "s" : ""} para este médico.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Acesse "Central de Agendamentos" para reagendar, trocar de profissional ou cancelar.
                  </p>
                </div>
              )}

              <section className="grid gap-3 sm:grid-cols-2">
                <DataField label="CPF" value={formatCpf(selected.cpf)} missing={!selected.cpf}
                  error={!!selected.cpf && !isValidCpf(selected.cpf) ? "CPF inválido" : undefined} />
                <DataField label="Data de nascimento" value={fmtDate(selected.data_nascimento)} missing={!selected.data_nascimento} />
                <DataField label="E-mail" value={selected.email} />
                <DataField label="RQE" value={selected.rqe ?? "—"} />
              </section>

              <FeegowCard medico={selected} onLiberar={async () => {
                const v = validarFeegow(selected);
                if (!v.ok) { toast({ title: "Bloqueado", description: v.motivo, variant: "destructive" }); return; }
                const r = await liberarAcessoFeegow(selected.id);
                if (r.ok) toast({ title: "Acesso Feegow liberado" });
                else toast({ title: "Falha", description: r.error, variant: "destructive" });
                reload();
              }} />

              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Documentos</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {selected.documentos.map(d => (
                    <div key={d.kind} className="flex items-center gap-2 rounded-md border border-border p-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold">{DOC_LABEL[d.kind]}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{d.fileName}</p>
                      </div>
                      <button onClick={() => handlePreview(d)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => handleDownload(d)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><Download className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Ações */}
              <section className="flex flex-wrap gap-2">
                {(selected.status === "pendente" || selected.status === "em_analise" || selected.status === "reprovado") && (
                  <>
                    <RequirePermission perm="medicos.aprovar">
                      <Button onClick={() => openDialog("aprovar")} className="bg-success text-success-foreground hover:bg-success/90">
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Aprovar
                      </Button>
                    </RequirePermission>
                    {selected.status !== "em_analise" && (
                      <Button variant="outline" onClick={() => openDialog("em_analise")}>
                        <Clock className="mr-2 h-4 w-4" /> Em análise
                      </Button>
                    )}
                    <RequirePermission perm="medicos.aprovar">
                      <Button variant="destructive" onClick={() => openDialog("reprovar")}>
                        <XCircle className="mr-2 h-4 w-4" /> Reprovar
                      </Button>
                    </RequirePermission>
                  </>
                )}

                {selected.status === "aprovado" && (
                  <RequirePermission perm={["medicos.suspender", "medicos.bloquear"]}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">Ações administrativas</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-popover">
                        <DropdownMenuLabel>Conta do médico</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openDialog("suspender")}>
                          <Pause className="mr-2 h-4 w-4 text-warning" /> Suspender (temporário)
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openDialog("bloquear")} className="text-destructive">
                          <Ban className="mr-2 h-4 w-4" /> Bloquear (definitivo)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </RequirePermission>
                )}

                {(selected.status === "suspenso" || selected.status === "bloqueado") && (
                  <Button onClick={() => openDialog("reativar")} className="bg-success text-success-foreground hover:bg-success/90">
                    <Play className="mr-2 h-4 w-4" /> Reativar médico
                  </Button>
                )}
              </section>

              {/* Auditoria */}
              <section>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <History className="h-3.5 w-3.5" /> Auditoria
                </p>
                <ul className="mt-2 space-y-2 text-sm max-h-[280px] overflow-y-auto pr-1">
                  {audit.length === 0 && <li className="text-xs text-muted-foreground">Sem registros.</li>}
                  {audit.map(a => (
                    <li key={a.id} className="flex items-start gap-3 rounded-md bg-muted/30 p-2">
                      <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold capitalize">{a.acao.split("_").join(" ")}</p>
                        <p className="text-[11px] text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR")}</p>
                        {a.motivo && <p className="mt-1 text-xs"><b>Motivo:</b> {a.motivo}</p>}
                        {(a as any).observacao && <p className="text-xs text-muted-foreground">{(a as any).observacao}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </div>
      </div>

      {/* Preview docs */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm" onClick={() => setPreviewDoc(null)}>
          <div className="card-elevated max-h-[90vh] w-full max-w-3xl overflow-hidden p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{DOC_LABEL[previewDoc.doc.kind]} · {previewDoc.doc.fileName}</p>
              <Button variant="ghost" size="sm" onClick={() => setPreviewDoc(null)}>Fechar</Button>
            </div>
            <div className="mt-3 grid place-items-center overflow-auto">
              {previewDoc.doc.mimeType.startsWith("image/")
                ? <img src={previewDoc.url} alt="Documento" className="max-h-[75vh] rounded-md" />
                : <iframe src={previewDoc.url} title="documento" className="h-[75vh] w-full rounded-md" />}
            </div>
          </div>
        </div>
      )}

      {/* Dialogs unificados */}
      <Dialog open={!!dlg} onOpenChange={(o) => { if (!o) setDlg(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dlg === "aprovar" && "Aprovar médico"}
              {dlg === "em_analise" && "Marcar em análise"}
              {dlg === "reprovar" && "Reprovar cadastro"}
              {dlg === "suspender" && "Suspender médico (temporário)"}
              {dlg === "bloquear" && "Bloquear médico (definitivo)"}
              {dlg === "reativar" && "Reativar médico"}
            </DialogTitle>
            <DialogDescription>
              {dlg === "suspender" && "Médico continuará com acesso de leitura, mas não poderá oferecer novos horários."}
              {dlg === "bloquear" && "Bloqueio definitivo: agenda e novos atendimentos serão impedidos. Histórico permanece."}
              {dlg === "reativar" && "Restaura status para Aprovado. Justificativa é obrigatória."}
              {dlg === "reprovar" && "Motivo será visível para o médico. Auditado."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {(dlg === "reprovar" || dlg === "suspender" || dlg === "bloquear") && (
              <div>
                <Label>Motivo *</Label>
                <Select value={motivo} onValueChange={setMotivo}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(dlg === "suspender" ? MOTIVOS_SUSPENSAO : dlg === "bloquear" ? MOTIVOS_BLOQUEIO : ["Documentação inválida","Dados inconsistentes","CRM não localizado","Outro"]).map(o => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {dlg === "suspender" && (
              <div className="space-y-2">
                <Label>Duração</Label>
                <div className="flex flex-wrap gap-2">
                  {(["24h","7d","30d","custom","indeterminado"] as const).map(p => (
                    <Button
                      key={p} size="sm"
                      variant={presetDuracao === p ? "default" : "outline"}
                      onClick={() => setPresetDuracao(p)}
                    >
                      {p === "24h" ? "24 horas" : p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : p === "custom" ? "Personalizado" : "Indeterminado"}
                    </Button>
                  ))}
                </div>
                {presetDuracao === "custom" && (
                  <Input
                    type="datetime-local"
                    value={customAte}
                    onChange={(e) => setCustomAte(e.target.value)}
                  />
                )}
              </div>
            )}

            <div>
              <Label>
                {dlg === "reativar" ? "Justificativa *" : "Observação interna"}
                {dlg === "reativar" ? "" : " (opcional)"}
              </Label>
              <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDlg(null)}>Cancelar</Button>
            <Button
              onClick={executar}
              disabled={acting}
              className={dlg === "bloquear" || dlg === "reprovar" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {acting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: MedicoStatus }) {
  const map: Record<MedicoStatus, string> = {
    pendente: "bg-warning/10 text-warning",
    em_analise: "bg-primary/10 text-primary",
    aprovado: "bg-success/10 text-success",
    reprovado: "bg-destructive/10 text-destructive",
    suspenso: "bg-warning/15 text-warning",
    bloqueado: "bg-destructive/15 text-destructive",
  };
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${map[status]}`}>{STATUS_LABEL[status]}</span>;
}

function DataField({ label, value, missing, error }: { label: string; value: string; missing?: boolean; error?: string }) {
  const flagged = missing || !!error;
  return (
    <div className={`rounded-md border p-2 ${flagged ? (error ? "border-destructive/40 bg-destructive/5" : "border-warning/40 bg-warning/5") : "border-border"}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-sm ${flagged ? (error ? "text-destructive" : "text-warning") : ""}`}>{value || "—"}</p>
      {error && <p className="mt-0.5 text-[11px] font-semibold text-destructive">{error}</p>}
    </div>
  );
}

function fmtDate(d: string | null) {
  if (!d) return "";
  try { return new Date(d + "T00:00:00").toLocaleDateString("pt-BR"); } catch { return d; }
}

const FEEGOW_TONE: Record<FeegowStatus, { bar: string; chip: string }> = {
  nao_enviado: { bar: "border-l-muted-foreground/40", chip: "bg-muted text-muted-foreground" },
  pendente:    { bar: "border-l-info",                chip: "bg-info/10 text-info" },
  liberado:    { bar: "border-l-success",             chip: "bg-success/10 text-success" },
  erro:        { bar: "border-l-destructive",         chip: "bg-destructive/10 text-destructive" },
};

function FeegowCard({ medico, onLiberar }: { medico: MedicoRow; onLiberar: () => void }) {
  const tone = FEEGOW_TONE[medico.feegow_status];
  const aprovado = medico.status === "aprovado";
  return (
    <section className={`rounded-md border border-border border-l-4 p-3 ${tone.bar}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Plug className="h-3.5 w-3.5" /> Acesso Feegow
          </p>
          <p className="mt-1 text-sm">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone.chip}`}>
              {FEEGOW_STATUS_LABEL[medico.feegow_status]}
            </span>
            {medico.feegow_professional_id && <span className="ml-2 text-xs text-muted-foreground">ID: {medico.feegow_professional_id}</span>}
          </p>
        </div>
        <Button size="sm" variant={medico.feegow_status === "liberado" ? "outline" : "default"} onClick={onLiberar} disabled={!aprovado}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {medico.feegow_status === "liberado" ? "Reenviar" : "Liberar acesso"}
        </Button>
      </div>
    </section>
  );
}
