import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2, XCircle, FileText, Search, ShieldCheck, Eye, Download,
  AlertTriangle, Clock, History, Plug, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  listMedicos, updateMedicoStatus, listAuditoria, getSignedUrl,
  liberarAcessoFeegow, FEEGOW_STATUS_LABEL,
  STATUS_LABEL, DOC_LABEL,
  type MedicoRow, type MedicoStatus, type DocumentoMedico, type AuditoriaRow,
  type FeegowStatus,
} from "@/lib/medicoRegistro";
import { isValidCpf, formatCpf } from "@/lib/validation/cpf";

/** Validação completa dos pré-requisitos para liberação na Feegow. */
function validarFeegow(m: MedicoRow): { ok: boolean; motivo?: string } {
  if (!m.cpf) return { ok: false, motivo: "CPF não informado" };
  if (!isValidCpf(m.cpf)) return { ok: false, motivo: "CPF inválido (dígitos verificadores não conferem)" };
  if (!m.data_nascimento) return { ok: false, motivo: "Data de nascimento não informada" };
  const d = new Date(m.data_nascimento + "T00:00:00");
  if (Number.isNaN(d.getTime())) return { ok: false, motivo: "Data de nascimento em formato inválido" };
  const hoje = new Date();
  if (d > hoje) return { ok: false, motivo: "Data de nascimento no futuro" };
  const idade = (hoje.getTime() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (idade < 18) return { ok: false, motivo: "Médico deve ter pelo menos 18 anos" };
  if (idade > 120) return { ok: false, motivo: "Data de nascimento implausível (> 120 anos)" };
  return { ok: true };
}

const STATUS_ORDER: MedicoStatus[] = ["pendente", "em_analise", "aprovado", "reprovado"];

export default function MedicosAprovacao() {
  const [list, setList] = useState<MedicoRow[]>([]);
  const [filter, setFilter] = useState<MedicoStatus | "todos">("todos");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditoriaRow[]>([]);
  const [previewDoc, setPreviewDoc] = useState<{ doc: DocumentoMedico; url: string } | null>(null);
  const [loading, setLoading] = useState(true);

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
    if (!selectedId) { setAudit([]); return; }
    listAuditoria(selectedId).then(setAudit).catch(() => setAudit([]));
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
    return STATUS_ORDER.reduce<Record<MedicoStatus, number>>((acc, s) => {
      acc[s] = list.filter(m => m.status === s).length;
      return acc;
    }, { pendente: 0, em_analise: 0, aprovado: 0, reprovado: 0 });
  }, [list]);

  async function changeStatus(m: MedicoRow, status: MedicoStatus, motivo?: string) {
    try {
      await updateMedicoStatus(m.id, status, motivo);
      toast({
        title: status === "aprovado" ? "Médico aprovado" : status === "reprovado" ? "Cadastro reprovado" : "Status atualizado",
        description: status === "aprovado" ? `${m.nome} já pode acessar a plataforma.` : undefined,
        variant: status === "reprovado" ? "destructive" : "default",
      });
      reload();
      // Se aprovou e ainda não foi liberado na Feegow, dispara automaticamente.
      if (status === "aprovado" && m.feegow_status !== "liberado" && m.cpf && m.data_nascimento) {
        liberarFeegow(m, true);
      }
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Tente novamente.", variant: "destructive" });
    }
  }

  async function liberarFeegow(m: MedicoRow, silent = false) {
    if (!m.cpf || !m.data_nascimento) {
      toast({
        title: "Dados incompletos",
        description: "CPF e data de nascimento são obrigatórios para liberar acesso na Feegow.",
        variant: "destructive",
      });
      return;
    }
    if (!silent) toast({ title: "Enviando para a Feegow..." });
    const res = await liberarAcessoFeegow(m.id);
    if (res.ok) {
      toast({
        title: "Acesso Feegow liberado",
        description: res.aviso ?? `ID profissional: ${res.professional_id ?? "—"}`,
      });
    } else {
      toast({
        title: "Falha ao liberar Feegow",
        description: res.error ?? "Tente novamente.",
        variant: "destructive",
      });
    }
    reload();
  }

  function handleAprovar(m: MedicoRow) { changeStatus(m, "aprovado"); }
  function handleEmAnalise(m: MedicoRow) { changeStatus(m, "em_analise"); }
  function handleReprovar(m: MedicoRow) {
    const motivo = window.prompt("Motivo da reprovação:");
    if (!motivo) return;
    changeStatus(m, "reprovado", motivo);
  }

  async function handlePreview(d: DocumentoMedico) {
    try {
      const url = await getSignedUrl(d.storagePath);
      setPreviewDoc({ doc: d, url });
    } catch (err) {
      toast({ title: "Erro ao abrir documento", variant: "destructive" });
    }
  }

  async function handleDownload(d: DocumentoMedico) {
    try {
      const url = await getSignedUrl(d.storagePath, 60);
      const a = document.createElement("a");
      a.href = url;
      a.download = d.fileName;
      a.click();
    } catch (err) {
      toast({ title: "Erro ao baixar", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Cadastros médicos</p>
          <h1 className="font-display text-2xl font-bold">Aprovação de médicos</h1>
          <p className="text-sm text-muted-foreground">
            Revise documentos, aprove ou reprove. Todas as ações ficam registradas em auditoria.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" /> Auditoria ativa
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        {STATUS_ORDER.map(s => (
          <button key={s} onClick={() => setFilter(filter === s ? "todos" : s)} className={`card-elevated p-4 text-left transition ${filter === s ? "ring-2 ring-primary" : ""}`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{STATUS_LABEL[s]}</p>
            <p className="mt-1 text-2xl font-bold">{counts[s]}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nome, CRM ou e-mail" className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-sm" />
            </div>
            <select value={filter} onChange={e => setFilter(e.target.value as MedicoStatus | "todos")} className="rounded-md border border-input bg-background px-2 py-2 text-sm">
              <option value="todos">Todos</option>
              {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>

          <ul className="mt-4 divide-y divide-border">
            {loading && <li className="py-12 text-center text-sm text-muted-foreground">Carregando...</li>}
            {!loading && filtered.length === 0 && <li className="py-12 text-center text-sm text-muted-foreground">Nenhum cadastro encontrado.</li>}
            {filtered.map(m => (
              <li key={m.id}>
                <button onClick={() => setSelectedId(m.id)} className={`flex w-full items-center gap-3 py-3 text-left transition hover:bg-muted/40 ${selectedId === m.id ? "bg-muted/40" : ""}`}>
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

              {selected.motivo_reprovacao && (
                <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-sm">
                  <p className="flex items-center gap-2 font-semibold text-warning-foreground">
                    <AlertTriangle className="h-4 w-4" /> Motivo da última reprovação
                  </p>
                  <p className="mt-1">{selected.motivo_reprovacao}</p>
                </div>
              )}

              <section className="grid gap-3 sm:grid-cols-2">
                <DataField label="CPF" value={fmtCpf(selected.cpf)} missing={!selected.cpf} />
                <DataField label="Data de nascimento" value={fmtDate(selected.data_nascimento)} missing={!selected.data_nascimento} />
                <DataField label="E-mail" value={selected.email} />
                <DataField label="RQE" value={selected.rqe ?? "—"} />
              </section>

              <FeegowCard
                medico={selected}
                onLiberar={() => liberarFeegow(selected)}
              />

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
                      <button onClick={() => handlePreview(d)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Visualizar">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDownload(d)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Baixar">
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="flex flex-wrap gap-2">
                <Button onClick={() => handleAprovar(selected)} className="bg-success text-success-foreground hover:bg-success/90">
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Aprovar
                </Button>
                <Button variant="outline" onClick={() => handleEmAnalise(selected)}>
                  <Clock className="mr-2 h-4 w-4" /> Marcar em análise
                </Button>
                <Button variant="destructive" onClick={() => handleReprovar(selected)}>
                  <XCircle className="mr-2 h-4 w-4" /> Reprovar
                </Button>
              </section>

              <section>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <History className="h-3.5 w-3.5" /> Auditoria
                </p>
                <ul className="mt-2 space-y-2 text-sm">
                  {audit.length === 0 && <li className="text-xs text-muted-foreground">Sem registros.</li>}
                  {audit.map(a => (
                    <li key={a.id} className="flex items-start gap-3 rounded-md bg-muted/30 p-2">
                      <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold capitalize">{a.acao.split("_").join(" ")}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(a.created_at).toLocaleString("pt-BR")}
                        </p>
                        {a.motivo && <p className="mt-1 text-xs">{a.motivo}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </div>
      </div>

      {previewDoc && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm" onClick={() => setPreviewDoc(null)}>
          <div className="card-elevated max-h-[90vh] w-full max-w-3xl overflow-hidden p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{DOC_LABEL[previewDoc.doc.kind]} · {previewDoc.doc.fileName}</p>
              <Button variant="ghost" size="sm" onClick={() => setPreviewDoc(null)}>Fechar</Button>
            </div>
            <div className="mt-3 grid place-items-center overflow-auto">
              {previewDoc.doc.mimeType.startsWith("image/") ? (
                <img src={previewDoc.url} alt="Documento" className="max-h-[75vh] rounded-md" />
              ) : (
                <iframe src={previewDoc.url} title="documento" className="h-[75vh] w-full rounded-md" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: MedicoStatus }) {
  const map: Record<MedicoStatus, string> = {
    pendente: "bg-warning/10 text-warning",
    em_analise: "bg-primary/10 text-primary",
    aprovado: "bg-success/10 text-success",
    reprovado: "bg-destructive/10 text-destructive",
  };
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${map[status]}`}>{STATUS_LABEL[status]}</span>;
}

function DataField({ label, value, missing }: { label: string; value: string; missing?: boolean }) {
  return (
    <div className={`rounded-md border p-2 ${missing ? "border-warning/40 bg-warning/5" : "border-border"}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-sm ${missing ? "text-warning-foreground" : ""}`}>{value || "—"}</p>
    </div>
  );
}

function fmtCpf(cpf: string | null) {
  if (!cpf) return "";
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
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
  const semDados = !medico.cpf || !medico.data_nascimento;
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
            {medico.feegow_professional_id && (
              <span className="ml-2 text-xs text-muted-foreground">ID: {medico.feegow_professional_id}</span>
            )}
            {medico.feegow_liberado_em && (
              <span className="ml-2 text-xs text-muted-foreground">
                em {new Date(medico.feegow_liberado_em).toLocaleString("pt-BR")}
              </span>
            )}
          </p>
          {medico.feegow_erro && (
            <p className="mt-1 text-xs text-destructive">Erro: {medico.feegow_erro}</p>
          )}
        </div>
        <Button
          size="sm"
          variant={medico.feegow_status === "liberado" ? "outline" : "default"}
          onClick={onLiberar}
          disabled={!aprovado || semDados || medico.feegow_status === "pendente"}
          title={
            !aprovado ? "Aprove o cadastro antes de liberar." :
            semDados ? "Faltam CPF / data de nascimento." : ""
          }
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {medico.feegow_status === "liberado" ? "Reenviar" : "Liberar acesso"}
        </Button>
      </div>
      {!aprovado && (
        <p className="mt-2 text-[11px] text-muted-foreground">A liberação ocorre automaticamente ao aprovar o cadastro.</p>
      )}
    </section>
  );
}
