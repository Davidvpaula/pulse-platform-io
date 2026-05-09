import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminLoading, AdminError } from "@/components/admin/AdminStates";
import { RefreshCw, Loader2, PlayCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { brl } from "@/lib/relatorios/utils";
import { toast } from "sonner";

const fmt = (s?: string | null) => (s ? new Date(s).toLocaleString("pt-BR") : "—");
const sint = (s?: string | null, n = 12) => (s ? `${s.slice(0, n)}…` : "—");

type Obs = {
  kpis: Record<string, number | string | null>;
  movimentos_recentes: Array<Record<string, unknown>>;
  alertas_abertos: Array<Record<string, unknown>>;
  reconciliacoes: Array<Record<string, unknown>>;
  drift_atual: Array<Record<string, unknown>>;
  volume_diario: Array<Record<string, unknown>>;
};

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    ok: "bg-green-500/10 text-green-700 border-green-500/30",
    drift: "bg-amber-500/10 text-amber-700 border-amber-500/30",
    erro: "bg-red-500/10 text-red-700 border-red-500/30",
    em_andamento: "bg-blue-500/10 text-blue-700 border-blue-500/30",
    critico: "bg-red-500/10 text-red-700 border-red-500/30",
    aviso: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  };
  return <Badge variant="outline" className={map[s] ?? ""}>{s}</Badge>;
}

export default function AdminLedgerObservabilidade() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "ledger-observabilidade"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_observabilidade_financeira" as never);
      if (error) throw error;
      return data as Obs;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  async function rodarReconciliacao() {
    setRunning(true);
    try {
      const { data: r, error } = await supabase.rpc("fn_reconciliar_global" as never, { p_origem: "manual" } as never);
      if (error) throw error;
      const res = r as Record<string, unknown>;
      if (res.status === "erro") {
        toast.error(`Erro: ${res.erro}`);
      } else {
        toast.success(`${res.medicos_processados} médicos · drift ${brl((res.drift_total_cents as number) ?? 0)}`);
      }
      qc.invalidateQueries({ queryKey: ["admin", "ledger-observabilidade"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setRunning(false);
    }
  }

  if (error) return <AdminError message={(error as Error).message} onRetry={() => refetch()} />;
  if (isLoading || !data) return <AdminLoading cards={6} rows={4} />;

  const k = data.kpis ?? {};
  const driftTotal = Number(k.ultimo_drift_total_cents ?? 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ledger Financeiro — Observabilidade"
        description="Painel técnico interno. Read-only. Sem impacto operacional."
      />

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />Atualizar
        </Button>
        <Button onClick={rodarReconciliacao} disabled={running} size="sm">
          {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
          Rodar reconciliação agora
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Movimentos totais</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{Number(k.total_movimentos ?? 0).toLocaleString("pt-BR")}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Últimas 24h</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{Number(k.movs_24h ?? 0).toLocaleString("pt-BR")}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Médicos cobertos</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{Number(k.medicos_cobertos ?? 0)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Idempotência (chaves)</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{Number(k.idempotency_keys ?? 0).toLocaleString("pt-BR")}</CardContent></Card>

        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Alertas abertos</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold flex items-center gap-2">
            {Number(k.alertas_abertos ?? 0)}
            {Number(k.alertas_criticos ?? 0) > 0 && <Badge variant="destructive" className="text-xs">{k.alertas_criticos} crít.</Badge>}
          </CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Outbox pendente</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{Number(k.outbox_pendente ?? 0)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Última reconciliação</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {fmt(k.ultima_reconciliacao_em as string)}
            <div className="mt-1 flex items-center gap-2">
              {k.ultimo_status_reconciliacao && <StatusBadge s={k.ultimo_status_reconciliacao as string} />}
              <span className={driftTotal === 0 ? "text-green-600 text-xs" : "text-amber-600 text-xs font-medium"}>
                drift {brl(driftTotal)}
              </span>
            </div>
          </CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Hash global</CardTitle></CardHeader>
          <CardContent className="text-xs font-mono break-all" title={k.hash_global_atual as string}>
            {sint(k.hash_global_atual as string, 24)}
          </CardContent></Card>
      </div>

      <Tabs defaultValue="reconciliacoes">
        <TabsList>
          <TabsTrigger value="reconciliacoes">Reconciliações</TabsTrigger>
          <TabsTrigger value="drift">Drift atual ({data.drift_atual.length})</TabsTrigger>
          <TabsTrigger value="alertas">Alertas ({data.alertas_abertos.length})</TabsTrigger>
          <TabsTrigger value="movimentos">Movimentos recentes</TabsTrigger>
          <TabsTrigger value="volume">Volume diário (14d)</TabsTrigger>
        </TabsList>

        <TabsContent value="reconciliacoes">
          <Card><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase">
                <tr><th className="text-left p-2">Iniciado</th><th className="text-left p-2">Origem</th><th className="text-right p-2">Médicos</th><th className="text-right p-2">Com drift</th><th className="text-right p-2">Drift total</th><th className="text-right p-2">Duração</th><th className="text-left p-2">Hash</th><th className="text-left p-2">Status</th></tr>
              </thead>
              <tbody>
                {data.reconciliacoes.map((r) => (
                  <tr key={r.id as string} className="border-t">
                    <td className="p-2">{fmt(r.iniciado_em as string)}</td>
                    <td className="p-2">{r.origem as string}</td>
                    <td className="p-2 text-right">{r.medicos_processados as number}</td>
                    <td className="p-2 text-right">{r.medicos_com_drift as number}</td>
                    <td className="p-2 text-right font-medium">{brl((r.drift_total_cents as number) ?? 0)}</td>
                    <td className="p-2 text-right">{r.duracao_ms ? `${r.duracao_ms}ms` : "—"}</td>
                    <td className="p-2 font-mono text-xs">{sint(r.hash_global as string)}</td>
                    <td className="p-2"><StatusBadge s={r.status as string} /></td>
                  </tr>
                ))}
                {!data.reconciliacoes.length && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Sem execuções ainda.</td></tr>}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="drift">
          <Card><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase">
                <tr><th className="text-left p-2">Médico</th><th className="text-right p-2">Ledger</th><th className="text-right p-2">Snapshot</th><th className="text-right p-2">Drift</th><th className="text-right p-2">Movs</th><th className="text-right p-2">Snapshots</th><th className="text-left p-2">Último mov</th></tr>
              </thead>
              <tbody>
                {data.drift_atual.map((d, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2 font-mono text-xs">{sint(d.medico_id as string)}</td>
                    <td className="p-2 text-right">{brl((d.saldo_ledger_cents as number) ?? 0)}</td>
                    <td className="p-2 text-right">{brl((d.saldo_snapshot_cents as number) ?? 0)}</td>
                    <td className="p-2 text-right font-bold text-amber-700">{brl((d.drift_cents as number) ?? 0)}</td>
                    <td className="p-2 text-right">{d.qtd_movimentos as number}</td>
                    <td className="p-2 text-right">{d.qtd_snapshot as number}</td>
                    <td className="p-2">{fmt(d.ultimo_mov_em as string)}</td>
                  </tr>
                ))}
                {!data.drift_atual.length && (
                  <tr><td colSpan={7} className="p-6 text-center text-green-600">
                    <CheckCircle2 className="inline h-4 w-4 mr-1" />Sem drift. Ledger consistente com snapshot.
                  </td></tr>
                )}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="alertas">
          <Card><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase">
                <tr><th className="text-left p-2">Quando</th><th className="text-left p-2">Tipo</th><th className="text-left p-2">Severidade</th><th className="text-left p-2">Médico</th><th className="text-left p-2">Payload</th></tr>
              </thead>
              <tbody>
                {data.alertas_abertos.map((a) => (
                  <tr key={a.id as string} className="border-t">
                    <td className="p-2">{fmt(a.created_at as string)}</td>
                    <td className="p-2">{a.tipo as string}</td>
                    <td className="p-2"><StatusBadge s={a.severidade as string} /></td>
                    <td className="p-2 font-mono text-xs">{sint(a.medico_id as string)}</td>
                    <td className="p-2 font-mono text-xs max-w-md truncate" title={JSON.stringify(a.payload)}>{JSON.stringify(a.payload)}</td>
                  </tr>
                ))}
                {!data.alertas_abertos.length && (
                  <tr><td colSpan={5} className="p-6 text-center text-green-600">
                    <CheckCircle2 className="inline h-4 w-4 mr-1" />Nenhum alerta aberto.
                  </td></tr>
                )}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="movimentos">
          <Card><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase">
                <tr><th className="text-left p-2">#seq</th><th className="text-left p-2">Quando</th><th className="text-left p-2">Conta</th><th className="text-left p-2">Direção</th><th className="text-right p-2">Valor</th><th className="text-left p-2">Bucket</th><th className="text-left p-2">Ref</th><th className="text-left p-2">Origem</th><th className="text-left p-2">Hash</th></tr>
              </thead>
              <tbody>
                {data.movimentos_recentes.map((m) => (
                  <tr key={m.seq as number} className="border-t">
                    <td className="p-2 font-mono">{m.seq as number}</td>
                    <td className="p-2">{fmt(m.ocorrido_em as string)}</td>
                    <td className="p-2">{m.conta as string}</td>
                    <td className="p-2"><Badge variant="outline" className={m.direcao === "credito" ? "text-green-700" : "text-red-700"}>{m.direcao as string}</Badge></td>
                    <td className="p-2 text-right">{brl((m.valor_cents as number) ?? 0)}</td>
                    <td className="p-2">{m.bucket as string}</td>
                    <td className="p-2 text-xs">{m.ref_type as string}</td>
                    <td className="p-2 text-xs">{m.origem as string}</td>
                    <td className="p-2 font-mono text-xs">{sint(m.hash_atual as string)}</td>
                  </tr>
                ))}
                {!data.movimentos_recentes.length && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Sem movimentos.</td></tr>}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="volume">
          <Card><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase">
                <tr><th className="text-left p-2">Dia</th><th className="text-right p-2">Qtd movs</th><th className="text-right p-2">Créditos</th><th className="text-right p-2">Débitos</th></tr>
              </thead>
              <tbody>
                {data.volume_diario.map((v, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{v.dia as string}</td>
                    <td className="p-2 text-right">{v.qtd as number}</td>
                    <td className="p-2 text-right text-green-700">{brl((v.creditos_cents as number) ?? 0)}</td>
                    <td className="p-2 text-right text-red-700">{brl((v.debitos_cents as number) ?? 0)}</td>
                  </tr>
                ))}
                {!data.volume_diario.length && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Sem volume registrado.</td></tr>}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardContent className="p-4 text-sm flex gap-3">
          <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div className="text-muted-foreground">
            <strong className="text-foreground">Frente 2.5 — observação interna.</strong> Este painel é read-only e não afeta operação. Ledger paralelo + reconciliação diária às 03h BRT. UX, saldos do médico, saques e pagamentos continuam usando os fluxos atuais. Nenhuma automação financeira ativa nesta fase.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
