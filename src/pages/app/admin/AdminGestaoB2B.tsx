import { useEffect, useMemo, useState } from "react";
import {
  Building2, FileText, AlertTriangle, TrendingUp, Users, Wallet,
  Clock, CheckCircle2, XCircle, ArrowUpRight, Loader2, Search,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

type ContratoView = {
  id: string;
  empresa_id: string;
  razao_social: string;
  plano_nome: string | null;
  status: string;
  inicio: string | null;
  fim: string | null;
  valor_mensal_centavos: number;
  limite_consultas_mes: number;
  qtd_funcionarios: number;
  modelo_financeiro: string;
};

type FaturaView = {
  id: string;
  empresa_id: string;
  razao_social: string;
  competencia: string;
  valor_centavos: number;
  status: string;
  emitida_em: string;
  vencimento: string | null;
  qtd_funcionarios: number;
};

export default function AdminGestaoB2B() {
  const [loading, setLoading] = useState(true);
  const [contratos, setContratos] = useState<ContratoView[]>([]);
  const [faturas, setFaturas] = useState<FaturaView[]>([]);
  const [busca, setBusca] = useState("");
  const [tab, setTab] = useState("contratos");

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      const [{ data: contratosRaw }, { data: faturasRaw }] = await Promise.all([
        supabase
          .from("empresas_contratos")
          .select("*, empresas(razao_social), planos(nome)")
          .order("created_at", { ascending: false }),
        supabase
          .from("empresas_faturas")
          .select("*, empresas(razao_social)")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      setContratos(
        (contratosRaw ?? []).map((c) => ({
          id: c.id,
          empresa_id: c.empresa_id,
          razao_social: (c as any).empresas?.razao_social ?? "—",
          plano_nome: (c as any).planos?.nome ?? null,
          status: c.status ?? "rascunho",
          inicio: c.data_inicio ?? null,
          fim: c.data_fim ?? null,
          valor_mensal_centavos: c.plano_mensal_centavos ?? 0,
          limite_consultas_mes: c.limite_consultas_mes ?? 0,
          qtd_funcionarios: 0, // populated below
          modelo_financeiro: c.modelo_financeiro ?? "por_consulta",
        }))
      );

      setFaturas(
        (faturasRaw ?? []).map((f) => ({
          id: f.id,
          empresa_id: f.empresa_id,
          razao_social: (f as any).empresas?.razao_social ?? "—",
          competencia: `${String(f.competencia_mes).padStart(2, "0")}/${f.competencia_ano}`,
          valor_centavos: f.valor_total_centavos ?? 0,
          status: f.status ?? "pendente",
          emitida_em: f.created_at ?? "",
          vencimento: f.vencimento ?? null,
          qtd_funcionarios: f.qtd_funcionarios ?? 0,
        }))
      );
    } catch (e: any) {
      toast.error("Erro ao carregar dados B2B", { description: e.message });
    } finally {
      setLoading(false);
    }
  }

  const kpis = useMemo(() => {
    const ativos = contratos.filter(c => c.status === "ativo");
    const faturasAbertas = faturas.filter(f => f.status === "pendente" || f.status === "em_aberto");
    const faturasAtrasadas = faturas.filter(f => f.status === "atrasada" || f.status === "vencida");
    const totalVidas = ativos.reduce((s, c) => s + c.limite_consultas_mes, 0);
    const vidasAtivas = ativos.reduce((s, c) => s + c.qtd_funcionarios, 0);
    const receitaMensal = ativos.reduce((s, c) => s + c.valor_mensal_centavos, 0);
    return {
      contratosAtivos: ativos.length,
      totalContratos: contratos.length,
      totalVidas,
      vidasAtivas,
      taxaOcupacao: totalVidas > 0 ? Math.round((vidasAtivas / totalVidas) * 100) : 0,
      receitaMensal,
      faturasAbertas: faturasAbertas.length,
      valorAberto: faturasAbertas.reduce((s, f) => s + f.valor_centavos, 0),
      faturasAtrasadas: faturasAtrasadas.length,
      valorAtrasado: faturasAtrasadas.reduce((s, f) => s + f.valor_centavos, 0),
    };
  }, [contratos, faturas]);

  const contratosVencendo = useMemo(() => {
    const in30d = new Date();
    in30d.setDate(in30d.getDate() + 30);
    return contratos.filter(c => c.status === "ativo" && c.fim && new Date(c.fim) <= in30d);
  }, [contratos]);

  const overUse = useMemo(() => {
    return contratos.filter(c => c.status === "ativo" && c.limite_consultas_mes > 0 && c.qtd_funcionarios > c.limite_consultas_mes);
  }, [contratos]);

  const filteredContratos = useMemo(() => {
    const q = busca.toLowerCase();
    return contratos.filter(c => !q || c.razao_social.toLowerCase().includes(q));
  }, [contratos, busca]);

  const filteredFaturas = useMemo(() => {
    const q = busca.toLowerCase();
    return faturas.filter(f => !q || f.razao_social.toLowerCase().includes(q));
  }, [faturas, busca]);

  const statusBadge = (s: string) => {
    const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      ativo: "default", rascunho: "secondary", suspenso: "destructive", encerrado: "outline",
      paga: "default", pendente: "secondary", em_aberto: "secondary", atrasada: "destructive", vencida: "destructive",
    };
    return <Badge variant={map[s] ?? "outline"} className="capitalize">{s}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão B2B Centralizada"
        description="Visão consolidada de contratos, faturamento e utilização corporativa."
        actions={
          <Button asChild>
            <Link to="/app/admin/empresas"><Building2 className="mr-2 h-4 w-4" /> Gerenciar empresas</Link>
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Contratos ativos" value={`${kpis.contratosAtivos}/${kpis.totalContratos}`} icon={FileText} />
        <StatCard label="Vidas ativas / contratadas" value={`${kpis.vidasAtivas}/${kpis.totalVidas}`} icon={Users} hint={`${kpis.taxaOcupacao}% ocupação`} />
        <StatCard label="Receita mensal B2B" value={brl(kpis.receitaMensal)} icon={Wallet} />
        <StatCard label="Faturas em aberto" value={`${kpis.faturasAbertas}`} icon={Clock} hint={brl(kpis.valorAberto)} />
      </div>

      {/* Alertas */}
      {(contratosVencendo.length > 0 || overUse.length > 0 || kpis.faturasAtrasadas > 0) && (
        <div className="space-y-2">
          {contratosVencendo.length > 0 && (
            <div className="card-elevated flex items-start gap-3 border-warning/30 bg-warning/5 p-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-warning shrink-0" />
              <div>
                <p className="text-sm font-semibold">Contratos vencendo em 30 dias</p>
                <p className="text-xs text-muted-foreground">
                  {contratosVencendo.map(c => c.razao_social).join(", ")} — renove ou entre em contato.
                </p>
              </div>
            </div>
          )}
          {overUse.length > 0 && (
            <div className="card-elevated flex items-start gap-3 border-destructive/30 bg-destructive/5 p-4">
              <TrendingUp className="mt-0.5 h-4 w-4 text-destructive shrink-0" />
              <div>
                <p className="text-sm font-semibold">Empresas com over-use</p>
                <p className="text-xs text-muted-foreground">
                  {overUse.map(c => `${c.razao_social} (${c.qtd_funcionarios}/${c.limite_consultas_mes})`).join(", ")}
                </p>
              </div>
            </div>
          )}
          {kpis.faturasAtrasadas > 0 && (
            <div className="card-elevated flex items-start gap-3 border-destructive/30 bg-destructive/5 p-4">
              <XCircle className="mt-0.5 h-4 w-4 text-destructive shrink-0" />
              <div>
                <p className="text-sm font-semibold">{kpis.faturasAtrasadas} fatura(s) em atraso</p>
                <p className="text-xs text-muted-foreground">
                  Total: {brl(kpis.valorAtrasado)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Busca + Tabs */}
      <div className="card-elevated p-4">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar empresa…" value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="contratos">Contratos ({contratos.length})</TabsTrigger>
            <TabsTrigger value="faturamento">Faturamento ({faturas.length})</TabsTrigger>
            <TabsTrigger value="utilizacao">Utilização</TabsTrigger>
          </TabsList>

          <TabsContent value="contratos" className="mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Empresa</th>
                    <th className="text-left">Plano</th>
                    <th className="text-right">Valor mensal</th>
                    <th className="text-right">Vidas</th>
                    <th className="text-left">Início</th>
                    <th className="text-left">Fim</th>
                    <th className="text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContratos.length === 0 && (
                    <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">Nenhum contrato encontrado.</td></tr>
                  )}
                  {filteredContratos.map(c => (
                    <tr key={c.id} className="border-t border-border hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{c.razao_social}</td>
                      <td>{c.plano_nome ?? "—"}</td>
                      <td className="text-right tabular-nums">{brl(c.valor_mensal_centavos)}</td>
                      <td className="text-right">
                        <span className={c.qtd_funcionarios > c.limite_consultas_mes ? "text-destructive font-semibold" : ""}>
                          {c.qtd_funcionarios}/{c.limite_consultas_mes}
                        </span>
                      </td>
                      <td>{fmtDate(c.inicio)}</td>
                      <td>{fmtDate(c.fim)}</td>
                      <td>{statusBadge(c.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="faturamento" className="mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Empresa</th>
                    <th className="text-left">Competência</th>
                    <th className="text-right">Valor</th>
                    <th className="text-left">Emissão</th>
                    <th className="text-left">Vencimento</th>
                    <th className="text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFaturas.length === 0 && (
                    <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">Nenhuma fatura encontrada.</td></tr>
                  )}
                  {filteredFaturas.map(f => (
                    <tr key={f.id} className="border-t border-border hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{f.razao_social}</td>
                      <td>{f.competencia}</td>
                      <td className="text-right tabular-nums">{brl(f.valor_centavos)}</td>
                      <td>{fmtDate(f.emitida_em)}</td>
                      <td>{fmtDate(f.vencimento)}</td>
                      <td>{statusBadge(f.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="utilizacao" className="mt-4">
            <div className="space-y-4">
              {contratos.filter(c => c.status === "ativo").length === 0 && (
                <p className="py-10 text-center text-muted-foreground">Nenhum contrato ativo para análise de utilização.</p>
              )}
              {contratos
                .filter(c => c.status === "ativo" && c.limite_consultas_mes > 0)
                .sort((a, b) => (b.vidas_ativas / b.vidas_contratadas) - (a.vidas_ativas / a.vidas_contratadas))
                .map(c => {
                  const pct = Math.round((c.qtd_funcionarios / c.limite_consultas_mes) * 100);
                  const isOver = pct > 100;
                  return (
                    <div key={c.id} className="card-elevated p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">{c.razao_social}</p>
                          <p className="text-xs text-muted-foreground">{c.plano_nome ?? "Sem plano"}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${isOver ? "text-destructive" : ""}`}>{pct}%</p>
                          <p className="text-xs text-muted-foreground">{c.qtd_funcionarios} de {c.limite_consultas_mes} vidas</p>
                        </div>
                      </div>
                      <Progress value={Math.min(pct, 100)} className={`h-2 ${isOver ? "[&>div]:bg-destructive" : ""}`} />
                      {isOver && (
                        <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                          <ArrowUpRight className="h-3 w-3" />
                          {c.qtd_funcionarios - c.limite_consultas_mes} funcionários acima do limite
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
