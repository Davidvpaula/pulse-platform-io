import { useEffect, useState } from "react";
import {
  MessageSquare, Phone, Bot, Clock, Inbox, TrendingUp,
  CheckCheck, ArrowRight, Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Stats = { total: number; abertas: number; em_atendimento: number; fechadas: number };

export default function ComunicacaoDashboard() {
  const [stats, setStats] = useState<Stats>({ total: 0, abertas: 0, em_atendimento: 0, fechadas: 0 });
  const [instances, setInstances] = useState<{ nome: string; numero: string | null; status: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: convs } = await supabase.from("conversations").select("status");
      if (convs) {
        setStats({
          total: convs.length,
          abertas: convs.filter(c => c.status === "aberta").length,
          em_atendimento: convs.filter(c => c.status === "em_atendimento").length,
          fechadas: convs.filter(c => c.status === "fechada" || c.status === "arquivada").length,
        });
      }
      const { data: inst } = await supabase
        .from("whatsapp_instances")
        .select("nome, numero, status")
        .eq("ativo", true)
        .order("created_at", { ascending: false });
      setInstances((inst || []) as any[]);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central de Comunicação"
        description="Visão consolidada de WhatsApp, bot e atendimento."
        actions={
          <Button asChild className="bg-gradient-primary hover:opacity-90">
            <Link to="/app/comunicacao/inbox">
              <Inbox className="mr-2 h-4 w-4" />Abrir Inbox
            </Link>
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando dados…
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Conversas totais" value={String(stats.total)} icon={MessageSquare} />
            <StatCard label="Abertas" value={String(stats.abertas)} icon={Clock} />
            <StatCard label="Em atendimento" value={String(stats.em_atendimento)} icon={Bot} />
            <StatCard label="Fechadas" value={String(stats.fechadas)} icon={CheckCheck} />
          </div>

          {/* Linhas WhatsApp */}
          <div className="grid gap-4 md:grid-cols-2">
            {instances.length === 0 ? (
              <div className="card-elevated p-6 md:col-span-2 text-center">
                <Phone className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma caixa WhatsApp configurada.{" "}
                  <Link to="/app/admin/integracoes/whatsapp" className="text-primary underline">Configurar</Link>
                </p>
              </div>
            ) : (
              instances.map((inst, i) => (
                <div key={i} className="card-elevated p-5 flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-success/10 text-success">
                    <Phone className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold">{inst.nome}</p>
                    <p className="text-xs text-muted-foreground font-mono">{inst.numero ?? "Sem número"}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    inst.status === "conectado" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                  }`}>
                    {inst.status}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-center gap-4">
            <Button asChild variant="outline">
              <Link to="/app/comunicacao/metricas">
                <TrendingUp className="mr-2 h-4 w-4" />Ver métricas completas
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app/comunicacao/inbox">
                <ArrowRight className="mr-2 h-4 w-4" />Ir para o Inbox
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
