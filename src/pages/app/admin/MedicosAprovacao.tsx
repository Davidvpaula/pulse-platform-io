import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2, XCircle, FileText, Search, ShieldCheck, Eye, Download,
  AlertTriangle, Clock, History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import {
  listMedicos, updateStatus, solicitarCorrecao,
  STATUS_LABEL, DOC_LABEL,
  type MedicoCadastro, type MedicoStatus, type DocumentoMedico,
} from "@/lib/medicoRegistro";

const STATUS_ORDER: MedicoStatus[] = ["pendente", "em_analise", "aprovado", "reprovado"];

export default function MedicosAprovacao() {
  const { user } = useAuth();
  const [list, setList] = useState<MedicoCadastro[]>([]);
  const [filter, setFilter] = useState<MedicoStatus | "todos">("todos");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentoMedico | null>(null);

  useEffect(() => {
    const reload = () => setList(listMedicos());
    reload();
    window.addEventListener("lasmar:medicos-changed", reload);
    return () => window.removeEventListener("lasmar:medicos-changed", reload);
  }, []);

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

  function handleAprovar(m: MedicoCadastro) {
    updateStatus(m.id, "aprovado", user.name);
    toast({ title: "Médico aprovado", description: `${m.nome} já pode acessar a plataforma.` });
  }
  function handleEmAnalise(m: MedicoCadastro) {
    updateStatus(m.id, "em_analise", user.name);
    toast({ title: "Cadastro em análise" });
  }
  function handleReprovar(m: MedicoCadastro) {
    const motivo = window.prompt("Motivo da reprovação:");
    if (!motivo) return;
    updateStatus(m.id, "reprovado", user.name, motivo);
    toast({ title: "Cadastro reprovado", variant: "destructive" });
  }
  function handleCorrecao(m: MedicoCadastro) {
    const motivo = window.prompt("O que precisa ser corrigido?");
    if (!motivo) return;
    solicitarCorrecao(m.id, user.name, motivo);
    toast({ title: "Correção solicitada", description: `Aviso enviado a ${m.nome}.` });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Cadastros médicos</p>
          <h1 className="font-display text-2xl font-bold">Aprovação de médicos</h1>
          <p className="text-sm text-muted-foreground">
            Revise documentos, aprove ou solicite correção. Todas as ações ficam registradas em auditoria.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" /> Auditoria ativa
        </div>
      </header>

      {/* contadores */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* LISTA */}
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Buscar por nome, CRM ou e-mail"
                className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-sm"
              />
            </div>
            <select value={filter} onChange={e => setFilter(e.target.value as MedicoStatus | "todos")} className="rounded-md border border-input bg-background px-2 py-2 text-sm">
              <option value="todos">Todos</option>
              {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>

          <ul className="mt-4 divide-y divide-border">
            {filtered.length === 0 && (
              <li className="py-12 text-center text-sm text-muted-foreground">Nenhum cadastro encontrado.</li>
            )}
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
                    <p className="truncate text-xs text-muted-foreground">
                      {m.especialidade} · CRM {m.crm}/{m.ufCrm}
                    </p>
                  </div>
                  <StatusBadge status={m.status} />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* DETALHE */}
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
                  <p className="text-sm text-muted-foreground">
                    {selected.especialidade} · CRM {selected.crm}/{selected.ufCrm}
                  </p>
                  <p className="text-xs text-muted-foreground">{selected.email} · {selected.telefone}</p>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              {selected.motivoCorrecao && (
                <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-sm">
                  <p className="flex items-center gap-2 font-semibold text-warning-foreground">
                    <AlertTriangle className="h-4 w-4" /> Última observação
                  </p>
                  <p className="mt-1">{selected.motivoCorrecao}</p>
                </div>
              )}

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
                      <button onClick={() => setPreviewDoc(d)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Visualizar">
                        <Eye className="h-4 w-4" />
                      </button>
                      <a href={d.dataUrl} download={d.fileName} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Baixar">
                        <Download className="h-4 w-4" />
                      </a>
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
                <Button variant="outline" onClick={() => handleCorrecao(selected)}>
                  <AlertTriangle className="mr-2 h-4 w-4" /> Solicitar correção
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
                  {selected.auditoria.slice().reverse().map((a, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-md bg-muted/30 p-2">
                      <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold capitalize">{a.acao.split("_").join(" ")}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(a.at).toLocaleString("pt-BR")} · {a.ator}
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

      {/* PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm" onClick={() => setPreviewDoc(null)}>
          <div className="card-elevated max-h-[90vh] w-full max-w-3xl overflow-hidden p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{DOC_LABEL[previewDoc.kind]} · {previewDoc.fileName}</p>
              <Button variant="ghost" size="sm" onClick={() => setPreviewDoc(null)}>Fechar</Button>
            </div>
            <div className="mt-3 grid place-items-center overflow-auto">
              {previewDoc.mimeType.startsWith("image/") ? (
                <img src={previewDoc.dataUrl} alt="Documento" className="max-h-[75vh] rounded-md" />
              ) : (
                <iframe src={previewDoc.dataUrl} title="documento" className="h-[75vh] w-full rounded-md" />
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
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${map[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
