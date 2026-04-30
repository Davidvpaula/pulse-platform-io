import { useEffect, useMemo, useState } from "react";
import {
  FileText, Upload, Loader2, Download, Trash2, Search, Filter,
  FilePlus, Pill, FileCheck2, IdCard, Syringe, FileQuestion, Image as ImageIcon,
  Database as DbIcon, Eye, AlertCircle, CheckCircle2, Paperclip, CalendarDays,
  ClipboardList,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSession } from "@/lib/session";
import {
  listDocumentosDoPaciente, uploadDocumentoPaciente, deletarDocumentoPaciente,
  getDocumentoPacienteUrl, listConsultasDoPaciente, formatDataBR,
  listAnexosConsultaDoPaciente, getAnexoConsultaUrl,
  type DocumentoPaciente, type DocumentoPacienteTipo, type ConsultaDetalhada,
  type AnexoConsulta,
} from "@/lib/clinico";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TIPO_LABEL: Record<DocumentoPacienteTipo, string> = {
  exame: "Exames", laudo: "Laudos", receita: "Receitas",
  identidade: "Identidade", plano: "Plano de saúde", vacina: "Vacinas", outro: "Outros",
};
const TIPO_LABEL_SING: Record<DocumentoPacienteTipo, string> = {
  exame: "Exame", laudo: "Laudo", receita: "Receita",
  identidade: "Identidade", plano: "Plano de saúde", vacina: "Vacina", outro: "Outro",
};
const TIPO_ICON: Record<DocumentoPacienteTipo, typeof FileText> = {
  exame: FileCheck2, laudo: FileText, receita: Pill,
  identidade: IdCard, plano: FileText, vacina: Syringe, outro: FileQuestion,
};
const TIPO_TONE: Record<DocumentoPacienteTipo, string> = {
  exame: "bg-info/10 text-info",
  laudo: "bg-primary-soft text-primary",
  receita: "bg-success/10 text-success",
  identidade: "bg-amber-500/10 text-amber-600",
  plano: "bg-purple-500/10 text-purple-600",
  vacina: "bg-emerald-500/10 text-emerald-600",
  outro: "bg-muted text-muted-foreground",
};

type Prescricao = {
  id: string;
  consulta_id: string;
  emitida_em: string;
  validade_dias: number;
  orientacoes: string | null;
  medicamentos: any;
};

type PreviewState = {
  url: string;
  nome: string;
  mime: string | null;
  downloadHref: string;
} | null;

function formatBytes(b?: number | null) {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function PacienteDocumentos() {
  const { session } = useSession();
  const [tab, setTab] = useState<"meus" | "prescricoes" | "consultas">("meus");

  const [docs, setDocs] = useState<DocumentoPaciente[]>([]);
  const [anexos, setAnexos] = useState<AnexoConsulta[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<DocumentoPacienteTipo | "todos">("todos");
  const [openUpload, setOpenUpload] = useState(false);
  const [preview, setPreview] = useState<PreviewState>(null);

  const [prescricoes, setPrescricoes] = useState<Prescricao[]>([]);
  const [prontuariosSet, setProntuariosSet] = useState<Set<string>>(new Set());
  const [consultas, setConsultas] = useState<ConsultaDetalhada[]>([]);
  const [consultasMap, setConsultasMap] = useState<Record<string, ConsultaDetalhada>>({});
  const [loadingPresc, setLoadingPresc] = useState(false);

  const carregar = async () => {
    if (!session) return;
    setLoadingDocs(true);
    setLoadingPresc(true);
    const [d, cs, an] = await Promise.all([
      listDocumentosDoPaciente(),
      listConsultasDoPaciente(),
      listAnexosConsultaDoPaciente(),
    ]);
    setDocs(d);
    setAnexos(an);
    setConsultas(cs);
    const map: Record<string, ConsultaDetalhada> = {};
    cs.forEach((c) => { map[c.id] = c; });
    setConsultasMap(map);
    const consultaIds = cs.map((c) => c.id);
    if (consultaIds.length > 0) {
      const [{ data: presc }, { data: pront }] = await Promise.all([
        supabase
          .from("prescricoes")
          .select("id, consulta_id, emitida_em, validade_dias, orientacoes, medicamentos")
          .in("consulta_id", consultaIds)
          .order("emitida_em", { ascending: false }),
        supabase.from("prontuarios").select("consulta_id").in("consulta_id", consultaIds),
      ]);
      setPrescricoes((presc ?? []) as any);
      setProntuariosSet(new Set((pront ?? []).map((p: any) => p.consulta_id)));
    } else {
      setPrescricoes([]);
      setProntuariosSet(new Set());
    }
    setLoadingDocs(false);
    setLoadingPresc(false);
  };

  useEffect(() => { void carregar(); /* eslint-disable-next-line */ }, [session]);

  // Contagem por categoria (meus anexos)
  const contagemPorTipo = useMemo(() => {
    const c: Record<DocumentoPacienteTipo, number> = {
      exame: 0, laudo: 0, receita: 0, identidade: 0, plano: 0, vacina: 0, outro: 0,
    };
    docs.forEach((d) => { c[d.tipo] = (c[d.tipo] ?? 0) + 1; });
    return c;
  }, [docs]);

  const docsFiltrados = useMemo(() => {
    let arr = docs;
    if (filtroTipo !== "todos") arr = arr.filter((d) => d.tipo === filtroTipo);
    const q = busca.trim().toLowerCase();
    if (q) arr = arr.filter((d) => d.titulo.toLowerCase().includes(q) || (d.descricao ?? "").toLowerCase().includes(q));
    return arr;
  }, [docs, busca, filtroTipo]);

  // Pendências por consulta (apenas consultas concluídas/agendadas no passado)
  const consultasComStatus = useMemo(() => {
    const presPorConsulta = new Map<string, Prescricao[]>();
    prescricoes.forEach((p) => {
      const arr = presPorConsulta.get(p.consulta_id) ?? [];
      arr.push(p);
      presPorConsulta.set(p.consulta_id, arr);
    });
    const anexPorConsulta = new Map<string, AnexoConsulta[]>();
    anexos.forEach((a) => {
      const arr = anexPorConsulta.get(a.consulta_id) ?? [];
      arr.push(a);
      anexPorConsulta.set(a.consulta_id, arr);
    });

    const agora = new Date();
    return consultas
      .filter((c) => c.status === "concluida" || new Date(c.fim) < agora)
      .map((c) => {
        const temProntuario = prontuariosSet.has(c.id);
        const presc = presPorConsulta.get(c.id) ?? [];
        const anex = anexPorConsulta.get(c.id) ?? [];
        const pendencias: string[] = [];
        if (!temProntuario) pendencias.push("Prontuário");
        if (presc.length === 0) pendencias.push("Prescrição");
        if (anex.length === 0) pendencias.push("Anexos do médico");
        return { consulta: c, temProntuario, presc, anex, pendencias };
      })
      .sort((a, b) => +new Date(b.consulta.inicio) - +new Date(a.consulta.inicio));
  }, [consultas, prescricoes, anexos, prontuariosSet]);

  const totalPendencias = consultasComStatus.reduce((s, x) => s + x.pendencias.length, 0);

  const abrirPreview = async (
    bucket: "paciente" | "consulta",
    path: string,
    nome: string,
    mime: string | null,
  ) => {
    const url = bucket === "paciente"
      ? await getDocumentoPacienteUrl(path, 300)
      : await getAnexoConsultaUrl(path, 300);
    if (!url) { toast.error("Não foi possível abrir o arquivo."); return; }
    // Para não-PDF/imagem, abre direto em nova aba
    const m = (mime ?? "").toLowerCase();
    const ehPreviewavel = m.startsWith("image/") || m === "application/pdf";
    if (!ehPreviewavel) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    setPreview({ url, nome, mime, downloadHref: url });
  };

  const baixar = async (
    bucket: "paciente" | "consulta",
    path: string,
    nome: string,
  ) => {
    const url = bucket === "paciente"
      ? await getDocumentoPacienteUrl(path, 60)
      : await getAnexoConsultaUrl(path, 60);
    if (!url) { toast.error("Não foi possível baixar o arquivo."); return; }
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const apagar = async (d: DocumentoPaciente) => {
    if (!confirm(`Apagar "${d.titulo}"? Essa ação não pode ser desfeita.`)) return;
    const ok = await deletarDocumentoPaciente(d);
    if (!ok) { toast.error("Falha ao apagar."); return; }
    toast.success("Documento removido.");
    void carregar();
  };

  if (!session) {
    return (
      <div className="space-y-6">
        <PageHeader title="Meus documentos" description="Faça login para acessar e enviar seus documentos." />
        <div className="card-elevated p-12 text-center text-sm text-muted-foreground">
          Você precisa estar autenticado para gerenciar documentos.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meus documentos"
        description="Receitas e laudos emitidos por médicos, anexos das consultas e seus próprios documentos."
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
              <DbIcon className="h-3 w-3" /> Dados em tempo real
            </span>
            <Dialog open={openUpload} onOpenChange={setOpenUpload}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary hover:opacity-90">
                  <Upload className="mr-2 h-4 w-4" /> Anexar documento
                </Button>
              </DialogTrigger>
              <UploadDialogContent onClose={() => setOpenUpload(false)} onSaved={() => { setOpenUpload(false); void carregar(); }} />
            </Dialog>
          </div>
        }
      />

      {/* Cards de categorias (clica para filtrar a aba "Meus anexos") */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {(Object.keys(TIPO_LABEL) as DocumentoPacienteTipo[]).map((k) => {
          const Icon = TIPO_ICON[k];
          const ativo = filtroTipo === k && tab === "meus";
          return (
            <button
              key={k}
              type="button"
              onClick={() => { setFiltroTipo(k); setTab("meus"); }}
              className={cn(
                "card-elevated flex flex-col items-start gap-2 p-3 text-left transition hover:shadow-md",
                ativo && "ring-2 ring-primary",
              )}
            >
              <div className={cn("grid h-9 w-9 place-items-center rounded-lg", TIPO_TONE[k])}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{TIPO_LABEL[k]}</p>
                <p className="text-lg font-bold leading-tight">{contagemPorTipo[k]}</p>
              </div>
            </button>
          );
        })}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="meus">
            Meus anexos
            {docs.length > 0 && (
              <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {docs.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="prescricoes">
            Prescrições e laudos
            {prescricoes.length > 0 && (
              <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {prescricoes.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="consultas">
            Por consulta
            {totalPendencias > 0 && (
              <span className="ml-2 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                {totalPendencias} pend.
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* DOCUMENTOS PESSOAIS */}
        <TabsContent value="meus" className="mt-4 space-y-4">
          <div className="card-elevated flex flex-wrap items-center gap-3 p-4">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por título ou descrição…" value={busca}
                onChange={(e) => setBusca(e.target.value)} className="pl-9" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as any)}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  {(Object.keys(TIPO_LABEL) as DocumentoPacienteTipo[]).map((k) => (
                    <SelectItem key={k} value={k}>{TIPO_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filtroTipo !== "todos" && (
                <Button variant="ghost" size="sm" onClick={() => setFiltroTipo("todos")}>
                  Limpar
                </Button>
              )}
            </div>
          </div>

          <div className="card-elevated p-2">
            {loadingDocs ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : docsFiltrados.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground">
                  <FilePlus className="h-6 w-6" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {filtroTipo === "todos"
                    ? "Nenhum documento anexado."
                    : `Nenhum documento na categoria "${TIPO_LABEL[filtroTipo]}".`}
                </p>
                <p className="max-w-md text-xs text-muted-foreground">
                  Anexe exames antigos, laudos, identidade médica, carteirinha de plano. PDF e imagens (JPG/PNG) até 20 MB.
                </p>
                <Button onClick={() => setOpenUpload(true)} className="bg-gradient-primary hover:opacity-90">
                  <Upload className="mr-2 h-4 w-4" /> Anexar agora
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {docsFiltrados.map((d) => {
                  const Icon = TIPO_ICON[d.tipo] ?? FileText;
                  const isImg = (d.mime_type ?? "").startsWith("image/");
                  return (
                    <li key={d.id} className="flex flex-wrap items-center gap-3 p-4">
                      <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-lg", TIPO_TONE[d.tipo])}>
                        {isImg ? <ImageIcon className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-medium">{d.titulo}</p>
                          <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase", TIPO_TONE[d.tipo])}>
                            {TIPO_LABEL_SING[d.tipo]}
                          </span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatDataBR(d.created_at)}{d.tamanho_bytes ? ` · ${formatBytes(d.tamanho_bytes)}` : ""}
                        </p>
                        {d.descricao && (
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{d.descricao}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => abrirPreview("paciente", d.storage_path, d.titulo, d.mime_type)}>
                          <Eye className="mr-1.5 h-3.5 w-3.5" /> Visualizar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => baixar("paciente", d.storage_path, d.titulo)}>
                          <Download className="mr-1.5 h-3.5 w-3.5" /> Baixar
                        </Button>
                        <Button size="sm" variant="outline"
                          className="text-destructive hover:text-destructive" onClick={() => apagar(d)}>
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Seus arquivos são privados. Médicos vinculados às suas consultas podem visualizá-los para apoiar o atendimento.
          </p>
        </TabsContent>

        {/* PRESCRIÇÕES recebidas dos médicos */}
        <TabsContent value="prescricoes" className="mt-4">
          <div className="card-elevated p-2">
            {loadingPresc ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando prescrições…
              </div>
            ) : prescricoes.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground">
                  <Pill className="h-6 w-6" />
                </div>
                <p className="text-sm text-muted-foreground">Nenhuma prescrição recebida ainda.</p>
                <p className="text-xs text-muted-foreground">Após uma consulta, o médico pode emitir prescrições — elas aparecem aqui.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {prescricoes.map((p) => {
                  const c = consultasMap[p.consulta_id];
                  const meds = Array.isArray(p.medicamentos) ? p.medicamentos : [];
                  const validade = new Date(new Date(p.emitida_em).getTime() + p.validade_dias * 86400000);
                  const expirada = validade < new Date();
                  return (
                    <li key={p.id} className="flex flex-wrap items-start gap-3 p-4">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                        <Pill className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          Prescrição {c?.medico_nome ? `de ${c.medico_nome}` : ""}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c?.especialidade_nome ?? "—"} · emitida em {formatDataBR(p.emitida_em)} · válida até {formatDataBR(validade.toISOString())}
                        </p>
                        {meds.length > 0 && (
                          <p className="mt-1 text-xs text-foreground">
                            {meds.slice(0, 3).map((m: any) => m?.nome ?? m?.medicamento ?? "Medicamento").join(", ")}
                            {meds.length > 3 && ` +${meds.length - 3}`}
                          </p>
                        )}
                        {p.orientacoes && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.orientacoes}</p>
                        )}
                      </div>
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                        expirada ? "bg-muted text-muted-foreground" : "bg-success/10 text-success",
                      )}>
                        {expirada ? "Expirada" : "Válida"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </TabsContent>

        {/* POR CONSULTA — pendências e anexos */}
        <TabsContent value="consultas" className="mt-4">
          <div className="card-elevated p-2">
            {loadingPresc ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando consultas…
              </div>
            ) : consultasComStatus.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground">
                  <CalendarDays className="h-6 w-6" />
                </div>
                <p className="text-sm text-muted-foreground">Nenhuma consulta passada ainda.</p>
                <p className="text-xs text-muted-foreground">Quando você concluir uma consulta, mostraremos aqui o que já foi emitido e o que está pendente.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {consultasComStatus.map(({ consulta: c, temProntuario, presc, anex, pendencias }) => (
                  <li key={c.id} className="space-y-2 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {c.medico_nome ?? "Médico"} · {c.especialidade_nome ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDataBR(c.inicio)} · {c.modalidade}
                        </p>
                      </div>
                      {pendencias.length === 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                          <CheckCircle2 className="h-3 w-3" /> Documentação completa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
                          <AlertCircle className="h-3 w-3" /> {pendencias.length} pendente{pendencias.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      <Chip ok={temProntuario} label="Prontuário" />
                      <Chip ok={presc.length > 0} label={`Prescrição${presc.length > 1 ? `s (${presc.length})` : ""}`} />
                      <Chip ok={anex.length > 0} label={`Anexos${anex.length > 0 ? ` (${anex.length})` : ""}`} />
                    </div>

                    {anex.length > 0 && (
                      <ul className="mt-2 space-y-1.5 rounded-md border border-border/60 bg-muted/30 p-2">
                        {anex.map((a) => {
                          const isImg = (a.mime_type ?? "").startsWith("image/");
                          return (
                            <li key={a.id} className="flex items-center gap-2 text-xs">
                              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="min-w-0 flex-1 truncate">
                                {a.nome_arquivo}
                                <span className="ml-1 text-muted-foreground">· {formatBytes(a.tamanho_bytes)}</span>
                              </span>
                              <Button size="sm" variant="ghost" className="h-7 px-2"
                                onClick={() => abrirPreview("consulta", a.storage_path, a.nome_arquivo, a.mime_type)}>
                                <Eye className="mr-1 h-3 w-3" /> Ver
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2"
                                onClick={() => baixar("consulta", a.storage_path, a.nome_arquivo)}>
                                <Download className="h-3 w-3" />
                              </Button>
                              {!isImg && a.mime_type !== "application/pdf" && (
                                <span className="text-[10px] text-muted-foreground">{a.mime_type ?? "arquivo"}</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {pendencias.length > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        <ClipboardList className="mr-1 inline h-3 w-3" />
                        Aguardando: {pendencias.join(", ")}.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Diálogo de visualização */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{preview?.nome}</DialogTitle>
            <DialogDescription>Visualização do documento. Use "Baixar" para salvar uma cópia.</DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="overflow-hidden rounded-md border border-border bg-muted/30">
              {preview.mime?.startsWith("image/") ? (
                <img src={preview.url} alt={preview.nome} className="mx-auto max-h-[70vh] w-auto object-contain" />
              ) : (
                <iframe src={preview.url} title={preview.nome} className="h-[70vh] w-full" />
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>Fechar</Button>
            {preview && (
              <a href={preview.downloadHref} download={preview.nome} target="_blank" rel="noopener noreferrer">
                <Button className="bg-gradient-primary hover:opacity-90">
                  <Download className="mr-2 h-4 w-4" /> Baixar
                </Button>
              </a>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Chip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
      ok ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
    )}>
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
      {label}
    </span>
  );
}

function UploadDialogContent({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [tipo, setTipo] = useState<DocumentoPacienteTipo>("exame");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (!file) { toast.error("Selecione um arquivo."); return; }
    if (!titulo.trim()) { toast.error("Informe um título."); return; }
    setEnviando(true);
    const r = await uploadDocumentoPaciente({ file, tipo, titulo, descricao });
    setEnviando(false);
    if (!r.ok) { toast.error(r.error ?? "Falha no envio."); return; }
    toast.success("Documento anexado.");
    setFile(null); setTitulo(""); setDescricao(""); setTipo("exame");
    onSaved();
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Anexar documento</DialogTitle>
        <DialogDescription>
          PDF ou imagem (JPG/PNG), até 20 MB. Os arquivos ficam vinculados ao seu cadastro.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Arquivo *</Label>
          <Input type="file" accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              if (f && !titulo) setTitulo(f.name.replace(/\.[^.]+$/, ""));
            }} />
          {file && (
            <p className="text-[11px] text-muted-foreground">
              {file.name} · {(file.size / 1024).toFixed(0)} KB
            </p>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Categoria</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as DocumentoPacienteTipo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(TIPO_LABEL) as DocumentoPacienteTipo[]).map((k) => (
                  <SelectItem key={k} value={k}>{TIPO_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Título *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Hemograma 03/2026" maxLength={120} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Descrição (opcional)</Label>
          <Textarea rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)}
            placeholder="Notas sobre o documento" maxLength={500} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={enviando}>Cancelar</Button>
        <Button onClick={enviar} disabled={enviando} className="bg-gradient-primary hover:opacity-90">
          {enviando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando…</> : <><Upload className="mr-2 h-4 w-4" /> Enviar</>}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
