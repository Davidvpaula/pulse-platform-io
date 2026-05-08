import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOperacaoMetricas } from "@/hooks/useOperacaoMetricas";
import { AttendantPresenceBadge } from "@/components/comunicacao/AttendantPresenceBadge";
import { ConversationSlaBadge } from "@/components/comunicacao/ConversationSlaBadge";
import { Inbox, Users, AlertTriangle, CheckCircle2, Clock, Activity } from "lucide-react";

type Transferencia = {
  id: string;
  conversation_id: string;
  from_user_id: string | null;
  to_user_id: string | null;
  to_sector: string | null;
  reason: string | null;
  created_at: string;
};

export default function AdminComunicacaoOperacao() {
  const { data, loading } = useOperacaoMetricas();
  const [transfers, setTransfers] = useState<Transferencia[]>([]);
  const [porAtendente, setPorAtendente] = useState<{ user_id: string; abertas: number; resolvidasHoje: number }[]>([]);

  useEffect(() => {
    supabase
      .from("conversation_assignments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setTransfers((data || []) as any));

    (async () => {
      const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
      const { data: open } = await supabase.from("conversations")
        .select("assigned_to").not("assigned_to", "is", null).neq("status", "fechada");
      const { data: closed } = await supabase.from("conversations")
        .select("resolved_by").not("resolved_by", "is", null).gte("resolved_at", startToday.toISOString());
      const map: Record<string, { abertas: number; resolvidasHoje: number }> = {};
      (open || []).forEach((c: any) => {
        const k = c.assigned_to;
        map[k] = map[k] || { abertas: 0, resolvidasHoje: 0 };
        map[k].abertas++;
      });
      (closed || []).forEach((c: any) => {
        const k = c.resolved_by;
        map[k] = map[k] || { abertas: 0, resolvidasHoje: 0 };
        map[k].resolvidasHoje++;
      });
      setPorAtendente(
        Object.entries(map).map(([user_id, v]) => ({ user_id, ...v }))
          .sort((a, b) => b.abertas - a.abertas)
      );
    })();
  }, []);

  const Kpi = ({ icon: Icon, label, value, tone }: any) => (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold mt-1">{value ?? "—"}</p>
          </div>
          <Icon className={`h-8 w-8 ${tone || "text-muted-foreground"}`} />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operação da Comunicação"
        description="Visão central das filas, atendentes, SLA e desempenho do Inbox."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi icon={Inbox} label="Abertas" value={data?.abertas} />
        <Kpi icon={Users} label="Sem responsável" value={data?.semResponsavel} tone="text-amber-500" />
        <Kpi icon={AlertTriangle} label="SLA vencido" value={data?.slaVencido} tone="text-destructive" />
        <Kpi icon={CheckCircle2} label="Resolvidas hoje" value={data?.resolvidasHoje} tone="text-emerald-500" />
        <Kpi icon={Activity} label="Atendentes online" value={data?.atendentesOnline} tone="text-emerald-500" />
        <Kpi icon={Clock} label="1ª resposta (min)" value={data?.tempoMedioPrimeiraResposta} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Por atendente</CardTitle></CardHeader>
        <CardContent>
          {porAtendente.length === 0 && <p className="text-xs text-muted-foreground">Sem dados.</p>}
          <div className="space-y-2">
            {porAtendente.map(a => (
              <div key={a.user_id} className="flex items-center justify-between border-b last:border-b-0 py-2">
                <div className="flex items-center gap-2">
                  <AttendantPresenceBadge userId={a.user_id} showLabel />
                  <span className="text-xs font-mono text-muted-foreground">{a.user_id.slice(0, 8)}</span>
                </div>
                <div className="flex gap-3 text-xs">
                  <span><Badge variant="outline">{a.abertas}</Badge> abertas</span>
                  <span><Badge variant="outline" className="text-emerald-700">{a.resolvidasHoje}</Badge> resolvidas hoje</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Transferências recentes</CardTitle></CardHeader>
        <CardContent>
          {transfers.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma transferência registrada.</p>}
          <div className="space-y-1">
            {transfers.map(t => (
              <div key={t.id} className="text-xs flex items-center gap-2 border-b last:border-b-0 py-1.5">
                <span className="text-muted-foreground">{new Date(t.created_at).toLocaleString("pt-BR")}</span>
                <span className="font-mono">{t.conversation_id.slice(0, 8)}</span>
                <span className="text-muted-foreground">→</span>
                <span>{t.to_user_id ? `usuário ${t.to_user_id.slice(0, 8)}` : ""}</span>
                {t.to_sector && <Badge variant="outline" className="text-[10px]">{t.to_sector}</Badge>}
                {t.reason && <span className="text-muted-foreground italic truncate">— {t.reason}</span>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading && <p className="text-xs text-muted-foreground">Carregando…</p>}
    </div>
  );
}
