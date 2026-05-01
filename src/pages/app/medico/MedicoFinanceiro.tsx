import { useEffect, useMemo, useState } from "react";
import { Wallet, TrendingUp, Clock, CheckCircle2, AlertCircle, Loader2, Filter } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { getMedicoAtualId } from "@/lib/clinico";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ReceitaPorOrigem } from "@/components/planos/ReceitaPorOrigem";

type FinRow = {
  id: string;
  consulta_id: string;
  data_consulta: string;
  servico_nome_snapshot: string | null;
  modelo_aplicado: string;
  comissao_pct_aplicada: number | null;
  valor_bruto_centavos: number;
  valor_medico_centavos: number;
  valor_plataforma_centavos: number;
  status: string;
  paciente_nome?: string | null;
};

const periodos = [
  { key: "30d", label: "Últimos 30 dias" },
  { key: "90d", label: "Últimos 90 dias" },
  { key: "ano", label: "Este ano" },
  { key: "tudo", label: "Tudo" },
] as const;

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function statusBadge(s: string) {
  if (s === "liberado" || s === "pago")
    return <Badge variant="outline" className="border-success/40 text-success">Liberado</Badge>;
  if (s === "pendente")
    return <Badge variant="outline" className="border-warning/40 text-warning">Pendente</Badge>;
  if (s === "cancelado" || s === "estornado")
    return <Badge variant="outline" className="border-destructive/40 text-destructive">{s}</Badge>;
  return <Badge variant="outline">{s}</Badge>;
}

export default function MedicoFinanceiro() {
  const { session } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<FinRow[]>([]);
  const [periodo, setPeriodo] = useState<typeof periodos[number]["key"]>("30d");
  const [medicoId, setMedicoId] = useState<string | null>(null);

  function cutoffDate(): Date | null {
    const d = new Date();
    if (periodo === "30d") { d.setDate(d.getDate() - 30); return d; }
    if (periodo === "90d") { d.setDate(d.getDate() - 90); return d; }
    if (periodo === "ano") return new Date(d.getFullYear(), 0, 1);
    return null;
  }

  async function carregar() {
    if (!session) { setLoading(false); return; }
    setLoading(true);
    const mid = await getMedicoAtualId();
    setMedicoId(mid);
    if (!mid) { setRows([]); setLoading(false); return; }

    let q = supabase
      .from("consultas_financeiro")
      .select(`
        id, consulta_id, data_consulta, servico_nome_snapshot, modelo_aplicado,
        comissao_pct_aplicada, valor_bruto_centavos, valor_medico_centavos,
        valor_plataforma_centavos, status,
        consultas:consulta_id (
          pacientes:paciente_id ( user_id )
        )
      `)
      .eq("medico_id", mid)
      .order("data_consulta", { ascending: false })
      .limit(500);

    const cut = cutoffDate();
    if (cut) q = q.gte("data_consulta", cut.toISOString());

    const { data, error } = await q;
    if (error) {
      toast({ title: "Erro ao carregar financeiro", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const userIds = Array.from(new Set(
      (data ?? []).map((r: any) => r.consultas?.pacientes?.user_id).filter(Boolean) as string[]
    ));
    let nomes: Record<string, string> = {};
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id,nome").in("id", userIds);
      nomes = Object.fromEntries((profs ?? []).map(p => [p.id, p.nome]));
    }

    setRows((data ?? []).map((r: any) => ({
      id: r.id,
      consulta_id: r.consulta_id,
      data_consulta: r.data_consulta,
      servico_nome_snapshot: r.servico_nome_snapshot,
      modelo_aplicado: r.modelo_aplicado,
      comissao_pct_aplicada: r.comissao_pct_aplicada,
      valor_bruto_centavos: r.valor_bruto_centavos,
      valor_medico_centavos: r.valor_medico_centavos,
      valor_plataforma_centavos: r.valor_plataforma_centavos,
      status: r.status,
      paciente_nome: r.consultas?.pacientes?.user_id ? nomes[r.consultas.pacientes.user_id] ?? null : null,
    })));
    setLoading(false);
  }

  useEffect(() => { void carregar(); /* eslint-disable-next-line */ }, [session, periodo]);

  const kpis = useMemo(() => {
    const liberado = rows.filter(r => r.status === "liberado" || r.status === "pago");
    const pendente = rows.filter(r => r.status === "pendente");
    return {
      totalReceber: liberado.reduce((s, r) => s + r.valor_medico_centavos, 0),
      pendentes: pendente.reduce((s, r) => s + r.valor_medico_centavos, 0),
      consultas: rows.length,
      ticketMedio: rows.length ? Math.round(rows.reduce((s, r) => s + r.valor_medico_centavos, 0) / rows.length) : 0,
    };
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description="Extrato dos seus repasses por consulta — calculados automaticamente conforme regras da plataforma."
      />

      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="A receber (liberado)" value={brl(kpis.totalReceber)} icon={CheckCircle2} />
        <StatCard label="Pendente" value={brl(kpis.pendentes)} icon={Clock} />
        <StatCard label="Consultas no período" value={kpis.consultas.toString()} icon={TrendingUp} />
        <StatCard label="Ticket médio (você)" value={brl(kpis.ticketMedio)} icon={Wallet} />
      </div>

      <div className="card-elevated p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Período:</span>
          {periodos.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriodo(p.key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                periodo === p.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card-elevated overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando extrato…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 opacity-40" />
            <p className="text-sm">Nenhuma consulta financeira no período selecionado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Data</th>
                  <th className="px-4 py-2 text-left">Paciente</th>
                  <th className="px-4 py-2 text-left">Serviço</th>
                  <th className="px-4 py-2 text-left">Modelo</th>
                  <th className="px-4 py-2 text-right">Bruto</th>
                  <th className="px-4 py-2 text-right">Plataforma</th>
                  <th className="px-4 py-2 text-right">Você</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {new Date(r.data_consulta).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-2.5">{r.paciente_nome ?? "—"}</td>
                    <td className="px-4 py-2.5">{r.servico_nome_snapshot ?? "Particular"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {r.modelo_aplicado}
                      {r.comissao_pct_aplicada != null && ` (${r.comissao_pct_aplicada}%)`}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{brl(r.valor_bruto_centavos)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">{brl(r.valor_plataforma_centavos)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold">{brl(r.valor_medico_centavos)}</td>
                    <td className="px-4 py-2.5">{statusBadge(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Os valores são calculados no momento da criação da consulta (snapshot imutável).
        Dúvidas sobre comissões? Fale com o administrador.
      </p>
    </div>
  );
}
