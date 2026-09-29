import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText, Search, Loader2, Database, FilePlus2, Eye, Calendar,
  CheckCircle2, AlertCircle, Clock, Paperclip, NotebookPen, Filter,
  Building2, Lock, Unlock,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session";
import { toast } from "sonner";
import { requireSuccess } from "@/lib/supabase-result";
import { supabase } from "@/integrations/supabase/client";
import {
  listDocumentosDoMedico,
  getDocumentoPacienteUrl,
  type DocumentoMedico,
  type DocumentoFiltro,
} from "@/lib/clinico";

const filtros: { key: DocumentoFiltro; label: string }[] = [
  { key: "todos", label: "Todas as consultas" },
  { key: "emitidas", label: "Prescrição emitida" },
  { key: "pendentes", label: "Sem prescrição" },
  { key: "vencidas", label: "Prescrição vencida" },
];

function fmtDataHora(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function fmtData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function diasAteVencimento(emitida: string | null, validade: number | null) {
  if (!emitida || !validade) return null;
  const venc = new Date(emitida).getTime() + validade * 24 * 60 * 60 * 1000;
  return Math.ceil((venc - Date.now()) / (24 * 60 * 60 * 1000));
}

export default function MedicoDocumentos() {
  const { session } = useSession();
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<DocumentoFiltro>("todos");
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState<DocumentoMedico[]>([]);
  const [anexos, setAnexos] = useState<{id: string; consulta_id: string; nome_arquivo: string; visibilidade_empresa: boolean}[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setDocs([]); setAnexos([]); setError(null);
    if (!session) { setLoading(false); return; }
    setLoading(true);
    (async () => {
      try {
        const rows = await listDocumentosDoMedico();
        const ids = rows.map(row => row.consulta_id);
        const files = ids.length ? await requireSuccess(supabase.from('anexos_consulta')
          .select('id, consulta_id, nome_arquivo, visibilidade_empresa').in('consulta_id', ids)) : [];
        if (!cancelled) { setDocs(rows); setAnexos(files ?? []); }
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : 'Falha ao carregar documentos'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [session?.user.id]);

  const lista = useMemo(() => {
    const term = q.trim().toLowerCase();
    return docs.filter((d) => {
      const dias = diasAteVencimento(d.prescricao_emitida_em, d.prescricao_validade_dias);
      if (filtro === "emitidas" && !d.prescricao_id && !d.prescricao_pdf) return false;
      if (filtro === "pendentes" && (d.prescricao_id || d.prescricao_pdf)) return false;
      if (filtro === "vencidas" && (!d.prescricao_id || (dias ?? 1) > 0)) return false;
      if (!term) return true;
      return (
        (d.paciente_nome ?? "").toLowerCase().includes(term) ||
        (d.especialidade_nome ?? "").toLowerCase().includes(term) ||
        d.consulta_id.toLowerCase().includes(term)
      );
    });
  }, [docs, q, filtro]);

  const stats = useMemo(() => {
    const emitidas = docs.filter((d) => d.prescricao_id || d.prescricao_pdf).length;
    const pendentes = docs.filter((d) => !d.prescricao_id && !d.prescricao_pdf && d.consulta_status === "concluida").length;
    const vencidas = docs.filter((d) => {
      const dias = diasAteVencimento(d.prescricao_emitida_em, d.prescricao_validade_dias);
      return d.prescricao_id && dias !== null && dias <= 0;
    }).length;
    const anexos = docs.reduce((acc, d) => acc + d.qtd_anexos + d.arquivos.length, 0);
    return { total: docs.length, emitidas, pendentes, vencidas, anexos };
  }, [docs]);

  async function toggleVisibilidadeEmpresa(anexo: typeof anexos[number]) {
    if (saving) return;
    if (!anexo.visibilidade_empresa && !confirm('Compartilhar somente o arquivo "' + anexo.nome_arquivo + '" com a empresa vinculada ao paciente?')) return;
    setSaving(anexo.id);
    try {
      await requireSuccess(supabase.rpc('medico_compartilhar_anexo' as never, {
        _anexo_id: anexo.id, _compartilhar: !anexo.visibilidade_empresa,
      } as never));
      setAnexos(current => current.map(file => file.id === anexo.id ? {...file, visibilidade_empresa: !file.visibilidade_empresa} : file));
      toast.success('Visibilidade do arquivo atualizada');
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Falha ao alterar visibilidade'); }
    finally { setSaving(null); }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentos & Prescrições"
        description="Histórico de prescrições, prontuários e anexos por consulta."
      />

      {!session && (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Faça login como médico para ver documentos reais. Por enquanto a tela está vazia em modo demo.
          </div>
        </div>
      )}

      <p className="rounded-xl border p-4 text-sm text-muted-foreground">Prescrições e atestados podem ser anexados em PDF ao finalizar o atendimento. A emissão eletrônica e a assinatura digital não estão disponíveis nesta etapa.</p>
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard icon={<FileText className="h-4 w-4" />} label="Consultas" value={stats.total} />
        <StatCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Prescrições emitidas" value={stats.emitidas} />
        <StatCard icon={<Clock className="h-4 w-4 text-amber-600" />} label="Sem prescrição" value={stats.pendentes} />
        <StatCard icon={<AlertCircle className="h-4 w-4 text-rose-600" />} label="Vencidas" value={stats.vencidas} />
        <StatCard icon={<Paperclip className="h-4 w-4" />} label="Anexos" value={stats.anexos} />
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por paciente, especialidade ou ID da consulta…"
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {filtros.map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filtro === f.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="rounded-2xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando documentos…
          </div>
        ) : lista.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <FileText className="mx-auto mb-2 h-6 w-6 opacity-40" />
            Nenhuma consulta encontrada para esse filtro.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {lista.map((d) => {
              const dias = diasAteVencimento(d.prescricao_emitida_em, d.prescricao_validade_dias);
              const vencida = d.prescricao_id && dias !== null && dias <= 0;
              return (
                <li key={d.consulta_id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {d.paciente_nome ?? "Paciente sem nome"}
                      </p>
                      {d.especialidade_nome && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          {d.especialidade_nome}
                        </span>
                      )}
                      <ChipStatus status={d.consulta_status} />
                    </div>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {fmtDataHora(d.consulta_inicio)}
                      </span>
                      {d.tem_prontuario && (
                        <span className="inline-flex items-center gap-1">
                          <NotebookPen className="h-3 w-3" /> Prontuário
                        </span>
                      )}
                      {d.qtd_anexos > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Paperclip className="h-3 w-3" /> {d.qtd_anexos} anexo{d.qtd_anexos > 1 ? "s" : ""}
                        </span>
                      )}
                    </p>
                    {d.prescricao_pdf ? <p className="text-xs text-muted-foreground">Prescrição em PDF anexada. Consulte o arquivo para os dados do documento.</p> : d.prescricao_id ? (
                      <p className="text-xs text-muted-foreground">
                        Prescrição com {d.prescricao_qtd_medicamentos} medicamento(s) ·
                        emitida em {fmtData(d.prescricao_emitida_em)} ·{" "}
                        {vencida ? (
                          <span className="font-medium text-rose-600">vencida há {Math.abs(dias!)} dia(s)</span>
                        ) : (
                          <span className="text-emerald-600">vence em {dias} dia(s)</span>
                        )}
                      </p>
                    ) : (
                      <p className="text-xs text-amber-600">Nenhuma prescrição emitida ainda.</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {d.arquivos.map(file => <Button key={file.id} variant="outline" size="sm" onClick={async () => {
                      const popup = window.open('about:blank', '_blank');
                      if (popup) popup.opener = null;
                      try {
                        const url = await getDocumentoPacienteUrl(file.storage_path);
                        if (!url) throw new Error('Não foi possível abrir o documento');
                        if (popup) popup.location.href = url;
                        else toast.error('Permita abrir uma nova aba para visualizar o documento.');
                      } catch(error) { popup?.close(); toast.error(error instanceof Error ? error.message : 'Falha ao abrir documento'); }
                    }}><FileText className="mr-2 h-4 w-4" />{file.titulo}</Button>)}
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/app/medico/agenda?consulta=${d.consulta_id}`}>
                        <Eye className="mr-2 h-4 w-4" /> Ver consulta
                      </Link>
                    </Button>
                    {anexos.filter(a => a.consulta_id === d.consulta_id).map(anexo => (
                      <Button key={anexo.id} size="sm" variant="outline" disabled={!!saving}
                        onClick={() => toggleVisibilidadeEmpresa(anexo)}>
                        {anexo.visibilidade_empresa ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                        {anexo.nome_arquivo} · {anexo.visibilidade_empresa ? 'Compartilhado' : 'Privado'}
                      </Button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ChipStatus({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    agendada: { label: "Agendada", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    aguardando_pagamento: { label: "Aguardando pagamento", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    confirmada: { label: "Confirmada", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    em_andamento: { label: "Em andamento", cls: "bg-violet-50 text-violet-700 border-violet-200" },
    concluida: { label: "Concluída", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    cancelada: { label: "Cancelada", cls: "bg-rose-50 text-rose-700 border-rose-200" },
    no_show: { label: "Não compareceu", cls: "bg-zinc-100 text-zinc-700 border-zinc-200" },
  };
  const m = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground border-border" };
  return <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", m.cls)}>{m.label}</span>;
}
