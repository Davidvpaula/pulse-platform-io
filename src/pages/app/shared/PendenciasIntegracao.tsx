import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle, RefreshCw, CheckCircle2, Clock, Loader2,
  ShieldAlert, FileText, Users, Stethoscope, Database, Search,
} from "lucide-react";

type Pendencia = {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  status: string;
  prioridade: string;
  created_at: string;
};

type LogEntry = {
  id: string;
  acao: string;
  entidade_tipo: string | null;
  entidade_id_interno: string | null;
  status: string;
  erro: string | null;
  created_at: string;
};

/* Pendências conhecidas que ainda não estão no banco */
const pendenciasConhecidas = [
  {
    icon: ShieldAlert,
    titulo: "Permissões Feegow para laudos/prescrições/atestados",
    descricao: "Endpoints /laudos/list, /patient/prescriptions retornam 422. Verificar permissões no painel Feegow.",
    prioridade: "alta",
  },
  {
    icon: Stethoscope,
    titulo: "Mapear médicos Feegow ↔ médicos Lasmar",
    descricao: "Profissionais da Feegow precisam ser vinculados aos médicos cadastrados na plataforma.",
    prioridade: "media",
  },
  {
    icon: Database,
    titulo: "Coluna 'origem' em documentos_paciente",
    descricao: "Adicionar campo para rastrear se documento veio da Feegow, upload manual ou outra fonte.",
    prioridade: "baixa",
  },
  {
    icon: Search,
    titulo: "Auditoria de importação",
    descricao: "Criar log detalhado de cada importação de documentos com deduplicação.",
    prioridade: "media",
  },
  {
    icon: FileText,
    titulo: "Descobrir endpoints de documentos PDF",
    descricao: "Feegow pode ter endpoints para download direto de PDFs (laudos, receitas). Requer investigação.",
    prioridade: "media",
  },
  {
    icon: Users,
    titulo: "Teste de envio de consulta/agendamento",
    descricao: "Validar POST /appointment/create com payload mínimo em modo controlado.",
    prioridade: "baixa",
  },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const prioridadeColor = (p: string) =>
  p === "alta" ? "border-destructive/30 bg-destructive/10 text-destructive"
  : p === "media" ? "border-warning/30 bg-warning/10 text-warning"
  : "border-border bg-muted/30 text-muted-foreground";

export default function PendenciasIntegracao() {
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [pendRes, logsRes] = await Promise.all([
      supabase
        .from("integracoes_pendencias")
        .select("id, tipo, titulo, descricao, status, prioridade, created_at")
        .eq("integracao", "feegow")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("integracoes_logs")
        .select("id, acao, entidade_tipo, entidade_id_interno, status, erro, created_at")
        .eq("integracao", "feegow")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    setPendencias((pendRes.data ?? []) as unknown as Pendencia[]);
    setLogs((logsRes.data ?? []) as unknown as LogEntry[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pendências de integração · Feegow"
        description="Pendências registradas no banco e itens conhecidos aguardando resolução."
      />

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card-elevated p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Registradas no banco</p>
          <p className="mt-1 text-2xl font-bold">{pendencias.length}</p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Pendências conhecidas</p>
          <p className="mt-1 text-2xl font-bold">{pendenciasConhecidas.length}</p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Logs recentes</p>
          <p className="mt-1 text-2xl font-bold">{logs.length}</p>
        </div>
      </div>

      {/* Pendências do banco */}
      <div className="card-elevated">
        <div className="border-b border-border p-5 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold">Pendências registradas</h3>
            <p className="text-xs text-muted-foreground">Lidas de <code>integracoes_pendencias</code></p>
          </div>
          <Button size="sm" variant="ghost" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
          </Button>
        </div>
        <div className="divide-y divide-border">
          {pendencias.length === 0 && (
            <div className="p-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma pendência registrada no banco.</p>
            </div>
          )}
          {pendencias.map(p => (
            <div key={p.id} className="flex items-center gap-3 p-4">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.titulo}</p>
                {p.descricao && <p className="text-xs text-muted-foreground truncate">{p.descricao}</p>}
              </div>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${prioridadeColor(p.prioridade)}`}>
                {p.prioridade}
              </span>
              <span className="text-xs text-muted-foreground">{fmtDate(p.created_at)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pendências conhecidas (hardcoded) */}
      <div className="card-elevated">
        <div className="border-b border-border p-5">
          <h3 className="font-display text-lg font-semibold">Pendências conhecidas</h3>
          <p className="text-xs text-muted-foreground">
            Itens identificados durante os testes controlados — ainda não registrados no banco.
          </p>
        </div>
        <div className="divide-y divide-border">
          {pendenciasConhecidas.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={i} className="flex items-center gap-3 p-4">
                <Icon className="h-4 w-4 text-warning shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{p.titulo}</p>
                  <p className="text-xs text-muted-foreground">{p.descricao}</p>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${prioridadeColor(p.prioridade)}`}>
                  {p.prioridade}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Logs recentes */}
      <div className="card-elevated">
        <div className="border-b border-border p-5">
          <h3 className="font-display text-lg font-semibold">Logs recentes</h3>
          <p className="text-xs text-muted-foreground">Últimos registros de <code>integracoes_logs</code></p>
        </div>
        <div className="divide-y divide-border">
          {logs.length === 0 && (
            <div className="p-8 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum log persistido ainda.</p>
            </div>
          )}
          {logs.map(l => (
            <div key={l.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-4 text-sm">
              {l.status === "sucesso" || l.status === "ok" ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : l.status === "erro" || l.status === "failed" ? (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              ) : (
                <Clock className="h-4 w-4 text-warning" />
              )}
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {l.acao}
                  {l.entidade_tipo && <> · {l.entidade_tipo}</>}
                  {l.entidade_id_interno && <> · <span className="font-mono text-xs">{l.entidade_id_interno}</span></>}
                </p>
                {l.erro && <p className="text-xs text-destructive truncate">{l.erro}</p>}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(l.created_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
