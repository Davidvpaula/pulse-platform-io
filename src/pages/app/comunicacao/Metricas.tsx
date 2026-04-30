import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Metricas() {
  const [stats, setStats] = useState({
    total: 0, abertas: 0, fechadas: 0, em_atendimento: 0,
    msgsHoje: 0, automacoesOk: 0, automacoesFail: 0,
  });

  useEffect(() => {
    (async () => {
      const [c, m, ao, af] = await Promise.all([
        supabase.from("conversations").select("status", { count: "exact" }),
        supabase.from("messages").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 86400000).toISOString()),
        supabase.from("automation_logs").select("id", { count: "exact", head: true }).eq("status", "sucesso"),
        supabase.from("automation_logs").select("id", { count: "exact", head: true }).eq("status", "falha"),
      ]);
      const all = (c.data || []) as { status: string }[];
      setStats({
        total: all.length,
        abertas: all.filter(x => x.status === "aberta").length,
        em_atendimento: all.filter(x => x.status === "em_atendimento").length,
        fechadas: all.filter(x => x.status === "fechada").length,
        msgsHoje: m.count || 0,
        automacoesOk: ao.count || 0,
        automacoesFail: af.count || 0,
      });
    })();
  }, []);

  const cards = [
    { label: "Conversas totais", v: stats.total },
    { label: "Abertas", v: stats.abertas },
    { label: "Em atendimento", v: stats.em_atendimento },
    { label: "Fechadas", v: stats.fechadas },
    { label: "Mensagens 24h", v: stats.msgsHoje },
    { label: "Automações OK", v: stats.automacoesOk },
    { label: "Automações falhas", v: stats.automacoesFail },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Métricas de Comunicação" description="Indicadores operacionais do módulo." />
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {cards.map(c => (
          <Card key={c.label}>
            <CardHeader className="pb-2"><CardDescription>{c.label}</CardDescription><CardTitle className="text-2xl">{c.v}</CardTitle></CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Em breve</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>· Taxa de resolução por bot e por IA</p>
          <p>· Tempo médio de resposta e SLA por colaborador</p>
          <p>· Conversão de conversa em agendamento</p>
          <p>· Performance por template e por médico</p>
        </CardContent>
      </Card>
    </div>
  );
}
