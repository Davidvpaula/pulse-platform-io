import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw, ShieldCheck, AlertTriangle, CheckCircle2, Clock, Plug,
  Stethoscope, Tag, ScrollText, ExternalLink, Search, FileText,
  Lock, Users, Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

/* ── Tipos ── */
type FeegowConfig = {
  id: string;
  status: string;
  ambiente: string;
  modo_simulado: boolean;
  ativo: boolean;
  secrets_keys: string[] | null;
  ultimo_teste_at: string | null;
  ultimo_teste_ok: boolean | null;
  ultimo_erro: string | null;
  ultima_sincronizacao_at: string | null;
};

type LogEntry = {
  id: string;
  acao: string;
  entidade_tipo: string | null;
  entidade_id_interno: string | null;
  status: string;
  erro: string | null;
  origem: string;
  duracao_ms: number | null;
  created_at: string;
};

type TestResult = {
  ok: boolean;
  token_mascarado?: string;
  url_base?: string;
  testes?: Array<{
    teste: number;
    endpoint: string;
    http_status: number | null;
    resposta_resumo: string;
  }>;
  recomendacao?: string;
  http_status?: number;
  resposta_resumo?: unknown;
  error?: string;
};

/* ── Helpers ── */
const statusBadge = (s: string) =>
  s === "sucesso" || s === "ok"
    ? "bg-success/10 text-success border-success/20"
    : s === "erro" || s === "failed"
    ? "bg-destructive/10 text-destructive border-destructive/20"
    : "bg-warning/10 text-warning border-warning/30";

const connStatusColor = (s: string) =>
  s === "conectado"
    ? "border-success/30 bg-success/10 text-success"
    : s === "erro"
    ? "border-destructive/30 bg-destructive/10 text-destructive"
    : "border-warning/30 bg-warning/10 text-warning";

const connStatusLabel = (s: string) =>
  s === "conectado" ? "Conectado" : s === "erro" ? "Erro" : "Pendente";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function FeegowIntegracao() {
  const [config, setConfig] = useState<FeegowConfig | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pendCount, setPendCount] = useState(0);
  const [pacientesVinculados, setPacientesVinculados] = useState(0);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [showTestDialog, setShowTestDialog] = useState(false);

  // Ações seguras
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{ title: string; data: unknown } | null>(null);
  const [cpfBusca, setCpfBusca] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [cfgRes, logsRes, pendRes, pacRes] = await Promise.all([
      supabase
        .from("integracoes_config")
        .select("id, status, ambiente, modo_simulado, ativo, secrets_keys, ultimo_teste_at, ultimo_teste_ok, ultimo_erro, ultima_sincronizacao_at")
        .eq("tipo", "feegow")
        .maybeSingle(),
      supabase
        .from("integracoes_logs")
        .select("id, acao, entidade_tipo, entidade_id_interno, status, erro, origem, duracao_ms, created_at")
        .eq("integracao", "feegow")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("integracoes_pendencias")
        .select("id", { count: "exact", head: true })
        .eq("integracao", "feegow"),
      supabase
        .from("pacientes")
        .select("id", { count: "exact", head: true })
        .not("feegow_paciente_id", "is", null),
    ]);
    if (cfgRes.data) setConfig(cfgRes.data as unknown as FeegowConfig);
    setLogs((logsRes.data ?? []) as unknown as LogEntry[]);
    setPendCount(pendRes.count ?? 0);
    setPacientesVinculados(pacRes.count ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Testar conexão ── */
  const testarConexao = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("integracoes-test", {
        body: { integration: "feegow", mode: "diagnostico" },
      });
      if (error) throw error;
      setTestResult(data as TestResult);
      setShowTestDialog(true);
      toast(data?.ok ? "Conexão Feegow OK" : "Falha na conexão Feegow", {
        description: data?.recomendacao ?? data?.error,
      });
      // Refresh config to get updated ultimo_teste_at
      await fetchData();
    } catch (e) {
      toast.error("Erro ao testar conexão", { description: (e as Error).message });
    } finally {
      setTesting(false);
    }
  };

  /* ── Ações seguras (read-only via edge function) ── */
  const executarAcaoSegura = async (label: string, mode: string, body?: Record<string, unknown>) => {
    setActionLoading(label);
    try {
      const { data, error } = await supabase.functions.invoke("integracoes-test", {
        body: { integration: "feegow", mode, ...body },
      });
      if (error) throw error;
      setActionResult({ title: label, data });
      setShowTestDialog(true);
      setTestResult(null);
    } catch (e) {
      toast.error(`Erro: ${label}`, { description: (e as Error).message });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const conn = config;
  const tokenConfigurado = conn?.secrets_keys?.includes("FEEGOW_API_TOKEN") ?? false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integração · Feegow"
        description="Status real da integração com a API Feegow. Dados lidos do banco e edge functions."
      />

      {/* Banner status real */}
      {conn?.modo_simulado && (
        <div className="card-elevated flex items-start gap-3 border-warning/30 bg-warning/5 p-4">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Modo simulado ativo</p>
            <p className="text-muted-foreground">
              A integração está em modo simulado. Para ativar comunicação real, desative o modo simulado na Central de Integrações.
            </p>
          </div>
        </div>
      )}

      {!conn?.modo_simulado && conn?.status !== "erro" && (
        <div className="card-elevated flex items-start gap-3 border-success/30 bg-success/5 p-4">
          <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Integração com dados reais</p>
            <p className="text-muted-foreground">
              Os dados exibidos abaixo são lidos diretamente do banco e da API Feegow via edge functions.
            </p>
          </div>
        </div>
      )}

      {/* Status da conexão */}
      <div className="card-elevated p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${connStatusColor(conn?.status ?? "pendente")}`}>
              {connStatusLabel(conn?.status ?? "pendente")}
            </span>
            <h2 className="mt-2 font-display text-2xl font-bold">Conexão Feegow</h2>
            <p className="text-sm text-muted-foreground">
              Ambiente: <strong>{conn?.ambiente ?? "—"}</strong> · 
              Modo: <strong>{conn?.modo_simulado ? "simulado" : "real"}</strong> ·
              Ativo: <strong>{conn?.ativo ? "sim" : "não"}</strong>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={testarConexao} disabled={testing}>
              {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plug className="mr-2 h-4 w-4" />}
              Testar conexão
            </Button>
            <Link to="/app/admin/integracoes">
              <Button variant="secondary">
                <ShieldCheck className="mr-2 h-4 w-4" /> Central de Integrações
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Token</p>
            <p className="mt-1 font-semibold flex items-center gap-1">
              {tokenConfigurado ? (
                <><Lock className="h-3.5 w-3.5 text-success" /> FEEGOW_API_TOKEN</>
              ) : (
                <span className="text-warning">Não configurado</span>
              )}
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Último teste</p>
            <p className="mt-1 font-semibold">{fmtDate(conn?.ultimo_teste_at ?? null)}</p>
            {conn?.ultimo_teste_ok !== null && (
              <p className={`text-xs ${conn?.ultimo_teste_ok ? "text-success" : "text-destructive"}`}>
                {conn?.ultimo_teste_ok ? "✓ Sucesso" : "✗ Falhou"}
              </p>
            )}
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Última sincronização</p>
            <p className="mt-1 font-semibold">{fmtDate(conn?.ultima_sincronizacao_at ?? null)}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Pacientes vinculados</p>
            <p className="mt-1 text-2xl font-bold">{pacientesVinculados}</p>
          </div>
        </div>

        {conn?.ultimo_erro && (
          <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <p className="text-xs font-semibold text-destructive">Último erro:</p>
            <p className="text-xs text-destructive/80 mt-1 font-mono">{conn.ultimo_erro}</p>
          </div>
        )}
      </div>

      {/* Ações seguras */}
      <div className="card-elevated p-6">
        <h3 className="font-display text-lg font-semibold">Ações seguras (somente leitura)</h3>
        <p className="text-sm text-muted-foreground">Consultas diretas à API Feegow via edge function. Nenhum dado é criado ou alterado.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Button
            variant="outline"
            className="justify-start"
            disabled={actionLoading !== null}
            onClick={() => executarAcaoSegura("Listar especialidades", "padrao")}
          >
            {actionLoading === "Listar especialidades" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Tag className="mr-2 h-4 w-4" />}
            Listar especialidades
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            disabled={actionLoading !== null}
            onClick={() => executarAcaoSegura("Listar profissionais", "diagnostico")}
          >
            {actionLoading === "Listar profissionais" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Stethoscope className="mr-2 h-4 w-4" />}
            Listar profissionais
          </Button>

          <div className="flex gap-2 col-span-full sm:col-span-1">
            <Input
              placeholder="CPF para buscar"
              value={cpfBusca}
              onChange={e => setCpfBusca(e.target.value.replace(/\D/g, ""))}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              disabled={!cpfBusca || actionLoading !== null}
              onClick={() => executarAcaoSegura("Buscar paciente por CPF", "diagnostico")}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Lock className="h-3 w-3" /> Ações de escrita desativadas — aguardando aprovação
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled className="opacity-50">
              <Users className="mr-2 h-4 w-4" /> Sincronizar pacientes
            </Button>
            <Button variant="outline" disabled className="opacity-50">
              <FileText className="mr-2 h-4 w-4" /> Sincronizar agendamentos
            </Button>
          </div>
        </div>
      </div>

      {/* Atalhos para sub-páginas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/app/admin/feegow/mapeamento" className="card-elevated p-5 hover:border-primary/40 transition">
          <p className="font-semibold flex items-center gap-2"><Tag className="h-4 w-4 text-primary" /> Mapeamento de status</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Status internos x status Feegow para agendamentos.
          </p>
        </Link>
        <Link to="/app/admin/feegow/schema" className="card-elevated p-5 hover:border-primary/40 transition">
          <p className="font-semibold flex items-center gap-2"><ScrollText className="h-4 w-4 text-primary" /> Endpoints API</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Endpoints reais testados e seu status atual.
          </p>
        </Link>
        <Link to="/app/admin/feegow/profissionais" className="card-elevated p-5 hover:border-primary/40 transition">
          <p className="font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Profissionais</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Vincular médicos locais a profissionais Feegow.
          </p>
        </Link>
        <Link to="/app/admin/pendencias-integracao" className="card-elevated p-5 hover:border-primary/40 transition">
          <p className="font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Pendências</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {pendCount > 0 ? `${pendCount} pendência(s) registrada(s)` : "Nenhuma pendência registrada"}
          </p>
        </Link>
      </div>

      {/* Logs reais */}
      <div className="card-elevated">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h3 className="font-display text-lg font-semibold">Logs da integração</h3>
            <p className="text-xs text-muted-foreground">
              Histórico real das tentativas de comunicação com a Feegow.
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
          </Button>
        </div>

        <div className="divide-y divide-border">
          {logs.length === 0 && (
            <div className="p-8 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum log persistido ainda.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Use "Testar conexão" para gerar o primeiro log real.
              </p>
            </div>
          )}
          {logs.map(l => (
            <div key={l.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-4">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadge(l.status)}`}>
                {l.status === "sucesso" || l.status === "ok" ? <CheckCircle2 className="inline h-3 w-3 mr-1" /> :
                 l.status === "erro" || l.status === "failed" ? <AlertTriangle className="inline h-3 w-3 mr-1" /> :
                 <Clock className="inline h-3 w-3 mr-1" />}
                {l.status}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {l.acao}
                  {l.entidade_tipo && <> · {l.entidade_tipo}</>}
                  {l.entidade_id_interno && <> · <span className="font-mono text-xs">{l.entidade_id_interno}</span></>}
                </p>
                {l.erro && <p className="text-xs text-destructive truncate">{l.erro}</p>}
                <p className="text-xs text-muted-foreground">
                  {l.origem} {l.duracao_ms ? `· ${l.duracao_ms}ms` : ""}
                </p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(l.created_at)}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <ExternalLink className="h-3 w-3" />
        Documentação oficial:&nbsp;
        <a href="https://docs.feegow.com/" target="_blank" rel="noreferrer" className="underline">docs.feegow.com</a>
      </p>

      {/* Dialog de resultado */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{testResult ? "Resultado do teste de conexão" : actionResult?.title ?? "Resultado"}</DialogTitle>
            <DialogDescription>
              {testResult ? "Diagnóstico completo da conectividade com a API Feegow." : "Resposta da edge function."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {testResult && (
              <>
                <div className="flex items-center gap-2">
                  {testResult.ok
                    ? <CheckCircle2 className="h-5 w-5 text-success" />
                    : <AlertTriangle className="h-5 w-5 text-destructive" />}
                  <span className="font-semibold">{testResult.ok ? "Conexão OK" : "Falha na conexão"}</span>
                </div>
                {testResult.token_mascarado && (
                  <p className="text-sm"><strong>Token:</strong> <code>{testResult.token_mascarado}</code></p>
                )}
                {testResult.url_base && (
                  <p className="text-sm"><strong>URL base:</strong> <code>{testResult.url_base}</code></p>
                )}
                {testResult.recomendacao && (
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">{testResult.recomendacao}</p>
                )}
                {testResult.testes && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Testes individuais:</p>
                    {testResult.testes.map(t => (
                      <div key={t.teste} className="text-xs border rounded-lg p-2 font-mono">
                        <span className={t.http_status && t.http_status < 300 ? "text-success" : "text-destructive"}>
                          [{t.http_status ?? "ERR"}]
                        </span>{" "}
                        {t.endpoint}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {actionResult && !testResult && (
              <pre className="text-xs bg-muted/50 p-4 rounded-lg overflow-auto max-h-96 whitespace-pre-wrap">
                {JSON.stringify(actionResult.data, null, 2)}
              </pre>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
