import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Users, Calendar, TrendingUp, Wallet, UserCheck, Lock, AlertTriangle,
  ArrowRight, Plus, FileBarChart, Loader2, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresaAtual } from "@/lib/useEmpresaAtual";

const brl = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface DashKpis {
  totalFuncionarios: number;
  ativos: number;
  consultasMes: number;
  faturasAbertas: number;
  custoMensal: number;
  custoMedioColaborador: number;
  docsCompartilhados: number;
  propostasAtivas: number;
}

interface ConsultaProxima {
  id: string;
  inicio: string;
  status: string;
  paciente_nome: string;
  medico_nome: string;
}

interface SetorStats {
  setor: string;
  funcionarios: number;
}

const STATUS_LABEL: Record<string, string> = {
  agendada: "Agendada", confirmada: "Confirmada", em_andamento: "Em andamento",
  concluida: "Concluída", cancelada: "Cancelada", no_show: "No-show",
  aguardando_pagamento: "Aguardando pgto",
};

export default function EmpresaDashboard() {
  const { empresa } = useEmpresaAtual();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<DashKpis | null>(null);
  const [proximos, setProximos] = useState<ConsultaProxima[]>([]);
  const [setores, setSetores] = useState<SetorStats[]>([]);

  const carregar = useCallback(async () => {
    if (!empresa) return;
    setLoading(true);
    setError(null);
    try {
      const eid = empresa.empresaId;
      const mesAtual = new Date().toISOString().slice(0, 7); // YYYY-MM

      // Parallel queries
      const [funcRes, consultasRes, faturasRes, docsRes, propostasRes] = await Promise.all([
        supabase.from("empresas_funcionarios").select("id, status, setor").eq("empresa_id", eid),
        supabase.from("consultas").select("id, inicio, status, paciente:pacientes(nome_completo), medico:medicos(nome)")
          .eq("empresa_id", eid as never).gte("inicio", `${mesAtual}-01`).order("inicio", { ascending: true }).limit(100),
        supabase.from("empresas_faturas").select("id, status").eq("empresa_id", eid),
        supabase.from("documentos_paciente").select("id", { count: "exact", head: true }).eq("visibilidade_empresa", true),
        supabase.from("propostas_empresa_medico").select("id", { count: "exact", head: true }).eq("empresa_id", eid).in("status", ["pendente", "em_negociacao"] as never),
      ]);

      const funcs = funcRes.data ?? [];
      const ativos = funcs.filter((f: any) => f.status === "ativo").length;
      const consultas = consultasRes.data ?? [];
      const faturas = faturasRes.data ?? [];
      const faturasAbertas = faturas.filter((f: any) => f.status === "em_aberto" || f.status === "atrasada").length;

      // Empresa pricing from empresa table
      const { data: empData } = await supabase.from("empresas").select("valor_colaborador_centavos").eq("id", eid).single();
      const valorColaborador = empData?.valor_colaborador_centavos ?? 0;
      const custoMensal = ativos * valorColaborador;

      setKpis({
        totalFuncionarios: funcs.length,
        ativos,
        consultasMes: consultas.length,
        faturasAbertas,
        custoMensal,
        custoMedioColaborador: ativos > 0 ? Math.round(custoMensal / ativos) : 0,
        docsCompartilhados: docsRes.count ?? 0,
        propostasAtivas: propostasRes.count ?? 0,
      });

      // Próximas consultas (futuras)
      const agora = new Date().toISOString();
      const futuras = consultas
        .filter((c: any) => c.inicio >= agora && c.status !== "cancelada")
        .slice(0, 5)
        .map((c: any) => ({
          id: c.id,
          inicio: c.inicio,
          status: c.status,
          paciente_nome: c.paciente?.nome_completo ?? "—",
          medico_nome: c.medico?.nome ?? "—",
        }));
      setProximos(futuras);

      // Setores
      const setorMap = new Map<string, number>();
      funcs.forEach((f: any) => {
        const s = f.setor || "Sem setor";
        setorMap.set(s, (setorMap.get(s) ?? 0) + 1);
      });
      setSetores(Array.from(setorMap.entries()).map(([setor, funcionarios]) => ({ setor, funcionarios })).sort((a, b) => b.funcionarios - a.funcionarios));

    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar dashboard");
    } finally {
      setLoading(false);
    }
  }, [empresa]);

  useEffect(() => { carregar(); }, [carregar]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <h2 className="font-display text-xl font-bold">Erro ao carregar dashboard</h2>
        <p className="text-sm text-muted-foreground max-w-md">{error}</p>
        <Button onClick={carregar} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
        </Button>
      </div>
    );
  }

  if (!kpis) return null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Dashboard Empresa</p>
          <h1 className="font-display text-2xl font-bold">{empresa?.nomeFantasia || empresa?.razaoSocial}</h1>
          <p className="text-sm text-muted-foreground">
            Gestão estratégica de saúde corporativa · {kpis.ativos} vidas ativas
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/app/empresa/relatorios"><FileBarChart className="mr-2 h-4 w-4" />Relatórios</Link>
          </Button>
          <Button asChild className="bg-gradient-primary hover:opacity-90">
            <Link to="/app/empresa/agendamentos"><Plus className="mr-2 h-4 w-4" />Agendamentos</Link>
          </Button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Funcionários" value={kpis.totalFuncionarios.toString()} hint={`${kpis.ativos} ativos`} icon={Users} to="/app/empresa/funcionarios" />
        <Kpi label="Consultas no mês" value={kpis.consultasMes.toString()} hint="Mês corrente" icon={Calendar} to="/app/empresa/agendamentos" />
        <Kpi label="Custo mensal" value={brl(kpis.custoMensal)} hint={`${brl(kpis.custoMedioColaborador)} / ativo`} icon={Wallet} to="/app/empresa/financeiro" />
        <Kpi label="Faturas abertas" value={kpis.faturasAbertas.toString()} hint={`${kpis.docsCompartilhados} docs · ${kpis.propostasAtivas} propostas`} icon={TrendingUp} to="/app/empresa/financeiro" />
      </div>

      {/* Privacidade */}
      <div className="card-elevated flex items-start gap-3 border-warning/30 bg-warning/5 p-4">
        <Lock className="mt-0.5 h-4 w-4 text-warning" />
        <p className="text-sm">
          <strong>Privacidade:</strong> a empresa <strong>não acessa o prontuário</strong> dos funcionários. Apenas relatórios agregados e documentos liberados ficam visíveis ao RH.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* PRÓXIMAS CONSULTAS */}
        <section className="card-elevated p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Próximas consultas</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/empresa/agendamentos">Ver tudo <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {proximos.length === 0 && <li className="py-8 text-center text-sm text-muted-foreground">Nenhum agendamento futuro.</li>}
            {proximos.map(c => (
              <li key={c.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold">{c.paciente_nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.medico_nome} · {new Date(c.inicio).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                  {STATUS_LABEL[c.status] ?? c.status}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* SETORES */}
        <section className="card-elevated p-6">
          <h2 className="font-display text-lg font-semibold">Funcionários por setor</h2>
          {setores.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nenhum funcionário cadastrado.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {setores.map(s => (
                <li key={s.setor} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{s.setor}</span>
                  <span className="text-sm text-muted-foreground">{s.funcionarios} pessoas</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint, icon: Icon, to }: {
  label: string; value: string; hint?: string; icon: React.ElementType; to?: string;
}) {
  const inner = (
    <div className="card-elevated p-4 transition hover:shadow-elegant">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}
