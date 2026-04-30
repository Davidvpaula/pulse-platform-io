import { useEffect, useMemo, useState } from "react";
import {
  FileText, Upload, Loader2, Download, Trash2, Search, Filter,
  FilePlus, Pill, FileCheck2, IdCard, Syringe, FileQuestion, Image as ImageIcon,
  Database as DbIcon,
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
  type DocumentoPaciente, type DocumentoPacienteTipo, type ConsultaDetalhada,
} from "@/lib/clinico";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TIPO_LABEL: Record<DocumentoPacienteTipo, string> = {
  exame: "Exame", laudo: "Laudo", receita: "Receita",
  identidade: "Identidade", plano: "Plano de saúde", vacina: "Vacina", outro: "Outro",
};
const TIPO_ICON: Record<DocumentoPacienteTipo, typeof FileText> = {
  exame: FileCheck2, laudo: FileText, receita: Pill,
  identidade: IdCard, plano: FileText, vacina: Syringe, outro: FileQuestion,
};

type Prescricao = {
  id: string;
  consulta_id: string;
  emitida_em: string;
  validade_dias: number;
  orientacoes: string | null;
  medicamentos: any;
};

export default function PacienteDocumentos() {
  const { session } = useSession();
  const [tab, setTab] = useState<"meus" | "prescricoes">("prescricoes");

  const [docs, setDocs] = useState<DocumentoPaciente[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<DocumentoPacienteTipo | "todos">("todos");
  const [openUpload, setOpenUpload] = useState(false);

  const [prescricoes, setPrescricoes] = useState<Prescricao[]>([]);
  const [consultasMap, setConsultasMap] = useState<Record<string, ConsultaDetalhada>>({});
  const [loadingPresc, setLoadingPresc] = useState(false);

  const carregar = async () => {
    if (!session) return;
    setLoadingDocs(true);
    setLoadingPresc(true);
    const [d, cs] = await Promise.all([
      listDocumentosDoPaciente(),
      listConsultasDoPaciente(),
    ]);
    setDocs(d);
    const map: Record<string, ConsultaDetalhada> = {};
    cs.forEach((c) => { map[c.id] = c; });
    setConsultasMap(map);
    const consultaIds = cs.map((c) => c.id);
    if (consultaIds.length > 0) {
      const { data } = await supabase
        .from("prescricoes")
        .select("id, consulta_id, emitida_em, validade_dias, orientacoes, medicamentos")
        .in("consulta_id", consultaIds)
        .order("emitida_em", { ascending: false });
      setPrescricoes((data ?? []) as any);
    } else {
      setPrescricoes([]);
    }
    setLoadingDocs(false);
    setLoadingPresc(false);
  };

  useEffect(() => { void carregar(); /* eslint-disable-next-line */ }, [session]);

  const docsFiltrados = useMemo(() => {
    let arr = docs;
    if (filtroTipo !== "todos") arr = arr.filter((d) => d.tipo === filtroTipo);
    const q = busca.trim().toLowerCase();
    if (q) arr = arr.filter((d) => d.titulo.toLowerCase().includes(q) || (d.descricao ?? "").toLowerCase().includes(q));
    return arr;
  }, [docs, busca, filtroTipo]);

  const baixar = async (d: DocumentoPaciente) => {
    const url = await getDocumentoPacienteUrl(d.storage_path);
    if (!url) { toast.error("Não foi possível abrir o arquivo."); return; }
    window.open(url, "_blank", "noopener,noreferrer");
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
        description="Receitas e laudos emitidos por médicos, e seus próprios anexos (exames, identidade, plano, etc.)."
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

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="prescricoes">
            Prescrições e laudos
            {prescricoes.length > 0 && (
              <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {prescricoes.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="meus">
            Meus anexos
            {docs.length > 0 && (
              <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {docs.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

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
                <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p>
                <p className="max-w-md text-xs text-muted-foreground">
                  Anexe exames antigos, laudos, identidade médica, carteirinha de plano. Aceitamos PDF e imagens (JPG/PNG) até 20 MB.
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
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                        {isImg ? <ImageIcon className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{d.titulo}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {TIPO_LABEL[d.tipo]} · {formatDataBR(d.created_at)}
                          {d.tamanho_bytes ? ` · ${(d.tamanho_bytes / 1024).toFixed(0)} KB` : ""}
                        </p>
                        {d.descricao && (
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{d.descricao}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => baixar(d)}>
                          <Download className="mr-1.5 h-3.5 w-3.5" /> Abrir
                        </Button>
                        <Button size="sm" variant="outline"
                          className="text-destructive hover:text-destructive" onClick={() => apagar(d)}>
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Apagar
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
      </Tabs>
    </div>
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
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tipo</Label>
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
