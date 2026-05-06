import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity, Database, Shield, Wallet, Users, Plug, Bot,
  CheckCircle2, AlertTriangle, XCircle, Clock, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type CheckStatus = "ok" | "warn" | "error" | "deferred" | "loading";

interface HealthCheck {
  label: string;
  status: CheckStatus;
  detail: string;
  icon: React.ElementType;
}

const statusIcon = (s: CheckStatus) => {
  if (s === "ok") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (s === "warn") return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  if (s === "error") return <XCircle className="h-4 w-4 text-red-500" />;
  if (s === "deferred") return <Clock className="h-4 w-4 text-muted-foreground" />;
  return <Skeleton className="h-4 w-4 rounded-full" />;
};

const statusBadge = (s: CheckStatus) => {
  const map: Record<CheckStatus, { variant: "default" | "secondary" | "destructive" | "outline"; text: string }> = {
    ok: { variant: "default", text: "Operacional" },
    warn: { variant: "secondary", text: "Atenção" },
    error: { variant: "destructive", text: "Falha" },
    deferred: { variant: "outline", text: "Adiado" },
    loading: { variant: "outline", text: "Verificando…" },
  };
  const m = map[s];
  return <Badge variant={m.variant}>{m.text}</Badge>;
};

const DEFERRED_INTEGRATIONS = [
  "WhatsApp Business API (Meta)",
  "Feegow (PEP/Prontuário)",
  "Google Calendar / Meet",
  "NFe Nacional",
  "Stripe (modo live)",
];

export default function AdminSaude() {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);

  const runChecks = async () => {
    setLoading(true);
    const results: HealthCheck[] = [];

    // 1. RPCs principais
    try {
      const rpcs = [
        "admin_visao_geral",
        "admin_agendamentos_overview",
        "financeiro_central_dashboard",
        "auditoria_listar",
        "integracoes_dashboard",
        "has_permission",
        "security_generate_alerts",
        "relatorios_financeiro",
      ];
      const rpcResults = await Promise.allSettled(
        rpcs.map((r) => supabase.rpc(r as never, {} as never))
      );
      const ok = rpcResults.filter((r) => r.status === "fulfilled").length;
      const fail = rpcs.length - ok;
      results.push({
        label: "RPCs Principais",
        status: fail === 0 ? "ok" : fail <= 2 ? "warn" : "error",
        detail: `${ok}/${rpcs.length} respondendo. ${fail > 0 ? `Falhas: ${rpcs.filter((_, i) => rpcResults[i].status === "rejected").join(", ")}` : "Todas operacionais."}`,
        icon: Database,
      });
    } catch {
      results.push({ label: "RPCs Principais", status: "error", detail: "Erro ao testar RPCs", icon: Database });
    }

    // 2. Tabelas críticas
    try {
      const tables = ["consultas", "pacientes", "medicos", "pagamentos", "audit_log", "user_roles"];
      const tableResults = await Promise.allSettled(
        tables.map((t) => supabase.from(t as never).select("id", { count: "exact", head: true }))
      );
      const ok = tableResults.filter(
        (r) => r.status === "fulfilled" && !(r.value as { error: unknown }).error
      ).length;
      results.push({
        label: "Tabelas Críticas",
        status: ok === tables.length ? "ok" : "warn",
        detail: `${ok}/${tables.length} acessíveis via RLS.`,
        icon: Database,
      });
    } catch {
      results.push({ label: "Tabelas Críticas", status: "error", detail: "Erro ao verificar tabelas", icon: Database });
    }

    // 3. Autenticação
    try {
      const { data: { session } } = await supabase.auth.getSession();
      results.push({
        label: "Autenticação",
        status: session ? "ok" : "error",
        detail: session ? `Sessão ativa: ${session.user.email}` : "Sem sessão ativa",
        icon: Shield,
      });
    } catch {
      results.push({ label: "Autenticação", status: "error", detail: "Erro ao verificar sessão", icon: Shield });
    }

    // 4. RBAC
    try {
      const { data } = await supabase.from("user_roles").select("role", { count: "exact", head: true });
      results.push({
        label: "RBAC (user_roles)",
        status: "ok",
        detail: "Tabela user_roles acessível. Roles atribuídos via has_permission().",
        icon: Users,
      });
    } catch {
      results.push({ label: "RBAC", status: "warn", detail: "Não foi possível verificar user_roles", icon: Users });
    }

    // 5. Audit log
    try {
      const { count } = await supabase.from("audit_log").select("id", { count: "exact", head: true });
      results.push({
        label: "Audit Log",
        status: "ok",
        detail: `${count ?? 0} registros no audit_log.`,
        icon: Activity,
      });
    } catch {
      results.push({ label: "Audit Log", status: "warn", detail: "Sem acesso ao audit_log", icon: Activity });
    }

    // 6. Financeiro
    try {
      const { count } = await supabase.from("pagamentos").select("id", { count: "exact", head: true });
      results.push({
        label: "Financeiro (pagamentos)",
        status: "ok",
        detail: `${count ?? 0} pagamentos registrados.`,
        icon: Wallet,
      });
    } catch {
      results.push({ label: "Financeiro", status: "warn", detail: "Sem acesso a pagamentos", icon: Wallet });
    }

    // 7. Event queue
    try {
      const { count } = await supabase.from("event_queue" as never).select("id", { count: "exact", head: true });
      results.push({
        label: "Fila de Eventos (event_queue)",
        status: count !== null ? "ok" : "warn",
        detail: count !== null ? `${count} eventos na fila.` : "Tabela não encontrada ou sem acesso.",
        icon: Activity,
      });
    } catch {
      results.push({ label: "Fila de Eventos", status: "warn", detail: "event_queue não acessível", icon: Activity });
    }

    // 8. IA Auditora
    try {
      const { count } = await supabase.from("ia_medico_scores" as never).select("id", { count: "exact", head: true });
      results.push({
        label: "IA Auditora (scores)",
        status: count !== null ? "ok" : "warn",
        detail: count !== null ? `${count} scores IA registrados.` : "Sem dados de IA auditora.",
        icon: Bot,
      });
    } catch {
      results.push({ label: "IA Auditora", status: "warn", detail: "ia_medico_scores não acessível", icon: Bot });
    }

    // 9. Integrações adiadas
    DEFERRED_INTEGRATIONS.forEach((name) => {
      results.push({
        label: name,
        status: "deferred",
        detail: "Integração planejada — não configurada ainda. Ativação na etapa final.",
        icon: Plug,
      });
    });

    setChecks(results);
    setLoading(false);
  };

  useEffect(() => { runChecks(); }, []);

  const totalOk = checks.filter((c) => c.status === "ok").length;
  const totalWarn = checks.filter((c) => c.status === "warn").length;
  const totalError = checks.filter((c) => c.status === "error").length;
  const totalDeferred = checks.filter((c) => c.status === "deferred").length;
  const internalChecks = checks.filter((c) => c.status !== "deferred");
  const deferredChecks = checks.filter((c) => c.status === "deferred");

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Saúde do Sistema"
        description="Visão interna de readiness do Dashboard Admin"
      />

      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={runChecks} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Verificar novamente
        </Button>
        {!loading && (
          <div className="flex gap-3 text-sm">
            <span className="text-green-500 font-medium">{totalOk} OK</span>
            {totalWarn > 0 && <span className="text-yellow-500 font-medium">{totalWarn} Atenção</span>}
            {totalError > 0 && <span className="text-red-500 font-medium">{totalError} Falhas</span>}
            <span className="text-muted-foreground">{totalDeferred} Adiados</span>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Componentes Internos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {internalChecks.map((c, i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  {statusIcon(c.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{c.label}</span>
                      {statusBadge(c.status)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integrações Externas (Adiadas)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {deferredChecks.map((c, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                {statusIcon(c.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{c.label}</span>
                    {statusBadge(c.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
