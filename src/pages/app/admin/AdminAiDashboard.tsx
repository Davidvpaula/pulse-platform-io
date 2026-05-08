import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";

export default function AdminAiDashboard() {
  const [stats, setStats] = useState<any>({ total: 0, in: 0, out: 0, cost: 0, accepted: 0, rejected: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  useEffect(() => {
    const since = new Date(); since.setDate(since.getDate() - 7);
    supabase.from("ai_audit_logs").select("*").gte("created_at", since.toISOString()).order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => {
        const rows = data || [];
        setRecent(rows.slice(0, 30));
        setStats({
          total: rows.length,
          in: rows.reduce((a: number, r: any) => a + (r.input_tokens || 0), 0),
          out: rows.reduce((a: number, r: any) => a + (r.output_tokens || 0), 0),
          cost: rows.reduce((a: number, r: any) => a + Number(r.estimated_cost_cents || 0), 0),
          accepted: rows.filter((r: any) => r.accepted_by_user === true).length,
          rejected: rows.filter((r: any) => r.accepted_by_user === false).length,
        });
      });
  }, []);
  return (
    <div className="space-y-4">
      <PageHeader title="IA Assistiva — Operação" description="Métricas dos últimos 7 dias." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3"><div className="text-xs text-muted-foreground">Chamadas</div><div className="text-2xl font-semibold">{stats.total}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Tokens (in/out)</div><div className="text-lg font-semibold">{stats.in} / {stats.out}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Custo estimado</div><div className="text-2xl font-semibold">¢ {stats.cost.toFixed(2)}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Aceitas / Recusadas</div><div className="text-lg font-semibold">{stats.accepted} / {stats.rejected}</div></Card>
      </div>
      <Card className="p-3">
        <div className="text-xs font-semibold uppercase mb-2 text-muted-foreground">Últimas chamadas</div>
        <div className="text-xs space-y-1">
          {recent.map(r => (
            <div key={r.id} className="flex items-center gap-2 border-b py-1">
              <span className="font-mono">{new Date(r.created_at).toLocaleString("pt-BR")}</span>
              <span className="font-medium">{r.action}</span>
              <span className="text-muted-foreground">{r.model}</span>
              <span className="ml-auto">{r.input_tokens}+{r.output_tokens}t · {r.latency_ms}ms · ¢{Number(r.estimated_cost_cents || 0).toFixed(3)}</span>
              {r.accepted_by_user === true && <span className="text-emerald-600">✓</span>}
              {r.accepted_by_user === false && <span className="text-destructive">✗</span>}
              {r.error && <span className="text-destructive">err</span>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
