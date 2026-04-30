import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { KpiCard } from "@/components/relatorios/KpiCard";
import { brl, num, downloadCSV, periodoPreset, COLORS } from "@/lib/relatorios/utils";
import { gerarPdfFinanceiro } from "@/lib/relatorios/pdfFinanceiro";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import {
  Download, FileText, DollarSign, Wallet, Receipt, RotateCcw,
  Users, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

type CompareMode = "periodo_anterior" | "ano_anterior";

function deltaPct(now: number, prev: number): { v: number; label: string } {
  if (!prev) return { v: now > 0 ? 100 : 0, label: now > 0 ? "+100%" : "—" };
  const v = ((now - prev) / prev) * 100;
  return { v, label: `${v >= 0 ? "+" : ""}${v.toFixed(1)}%` };
}

export default function AdminRelatorioFinanceiro() {
  const inicial = periodoPreset("30d");
  const [inicio, setInicio] = useState(inicial.inicio);
  const [fim, setFim] = useState(inicial.fim);
  const [compareMode, setCompareMode] = useState<CompareMode>("periodo_anterior");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [buscaMedico, setBuscaMedico] = useState("");

  const carregar = async () => {
    setLoading(true);
    try {
      const { data: r, error } = await supabase.rpc("relatorios_financeiro_snapshot" as any, {
        p_inicio: inicio,
        p_fim: fim,
        p_compare_mode: compareMode,
      });
      if (error) throw error;
      setData(r);
    } catch (e: any) {
      toast.error("Falha ao carregar relatório", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [inicio, fim, compareMode]);

  const k = data?.kpis || {};
  const kp = data?.kpis_anterior || {};
  const periodoComparativo = useMemo(() => {
    if (!kp?.inicio || !kp?.fim) return null;
    return { inicio: kp.inicio, fim: kp.fim, modo: compareMode };
  }, [kp, compareMode]);

  const diario = (data?.diario || []).map((d: any) => ({
    dia: d.dia?.slice(5),
    bruta: (d.receita_bruta_centavos || 0) / 100,
    liquida: (d.receita_liquida_centavos || 0) / 100,
  }));

  const exportarCSV = () => {
    if (!data) return;
    const linhas: any[][] = [
      ["Relatório Financeiro"],
      ["Período", `${inicio} a ${fim}`],
      ["Comparativo", `${kp?.inicio ?? "-"} a ${kp?.fim ?? "-"} (${compareMode})`],
      [],
      ["Indicador", "Atual", "Comparativo", "Variação %"],
      ["Receita bruta", brl(k.receita_bruta_centavos), brl(kp.receita_bruta_centavos), deltaPct(k.receita_bruta_centavos || 0, kp.receita_bruta_centavos || 0).label],
      ["Receita líquida", brl(k.receita_liquida_centavos), brl(kp.receita_liquida_centavos), deltaPct(k.receita_liquida_centavos || 0, kp.receita_liquida_centavos || 0).label],
      ["Comissão plataforma", brl(k.comissao_plataforma_centavos), brl(kp.comissao_plataforma_centavos), deltaPct(k.comissao_plataforma_centavos || 0, kp.comissao_plataforma_centavos || 0).label],
      ["Repasse médicos", brl(k.repasse_medicos_centavos), brl(kp.repasse_medicos_centavos), deltaPct(k.repasse_medicos_centavos || 0, kp.repasse_medicos_centavos || 0).label],
      ["Taxa gateway", brl(k.taxa_gateway_centavos), "", ""],
      ["Taxa imposto", brl(k.taxa_imposto_centavos), "", ""],
      ["Reembolsos", brl(k.reembolsos_centavos), "", ""],
      ["Consultas concluídas", num(k.consultas_concluidas), num(kp.consultas_concluidas), deltaPct(k.consultas_concluidas || 0, kp.consultas_concluidas || 0).label],
      ["Ticket médio", brl(k.ticket_medio_centavos), brl(kp.ticket_medio_centavos), deltaPct(k.ticket_medio_centavos || 0, kp.ticket_medio_centavos || 0).label],
      [],
      ["--- Por médico ---"],
      ["Médico", "Consultas", "Receita", "Comissão", "Repasse"],
      ...(data.por_medico || []).map((m: any) => [m.medico_nome, m.consultas, brl(m.receita_centavos), brl(m.comissao_centavos), brl(m.repasse_centavos)]),
      [],
      ["--- Por especialidade ---"],
      ["Especialidade", "Consultas", "Receita"],
      ...(data.por_especialidade || []).map((s: any) => [s.especialidade, s.consultas, brl(s.receita_centavos)]),
      [],
      ["--- Por modalidade ---"],
      ["Modalidade", "Consultas", "Receita"],
      ...(data.por_modalidade || []).map((s: any) => [s.modalidade, s.consultas, brl(s.receita_centavos)]),
      [],
      ["--- Por método de pagamento ---"],
      ["Método", "Pagamentos", "Receita"],
      ...(data.por_metodo || []).map((s: any) => [s.metodo, s.pagamentos, brl(s.receita_centavos)]),
      [],
      ["--- Por canal ---"],
      ["Canal", "Consultas", "Receita"],
      ...(data.por_canal || []).map((s: any) => [s.canal, s.consultas, brl(s.receita_centavos)]),
    ];
    downloadCSV(`relatorio-financeiro-${inicio}-a-${fim}.csv`, linhas);
  };

  const exportarPDF = () => {
    if (!data) return;
    gerarPdfFinanceiro({
      periodo: { inicio, fim },
      comparativo: periodoComparativo,
      kpis: data.kpis,
      kpis_anterior: data.kpis_anterior,
      por_medico: data.por_medico,
      por_especialidade: data.por_especialidade,
      por_modalidade: data.por_modalidade,
      por_metodo: data.por_metodo,
      por_canal: data.por_canal,
    });
  };

  const medicosFiltrados = useMemo(() => {
    const lista = data?.por_medico || [];
    if (!buscaMedico) return lista;
    const t = buscaMedico.toLowerCase();
    return lista.filter((m: any) => (m.medico_nome || "").toLowerCase().includes(t));
  }, [data?.por_medico, buscaMedico]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/app/admin/relatorios"><ArrowLeft className="h-4 w-4 mr-1" /> Relatórios</Link>
        </Button>
      </div>

      <PageHeader
        title="Relatório Financeiro"
        description="Indicadores baseados em snapshots imutáveis de pagamentos e consultas concluídas."
      />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Início</label>
            <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="w-40" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Fim</label>
            <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="w-40" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Comparar com</label>
            <Select value={compareMode} onValueChange={(v) => setCompareMode(v as CompareMode)}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="periodo_anterior">Período imediatamente anterior</SelectItem>
                <SelectItem value="ano_anterior">Mesmo período do ano anterior</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={exportarCSV} disabled={!data}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button size="sm" onClick={exportarPDF} disabled={!data}>
              <FileText className="h-4 w-4 mr-1" /> PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && !data ? (
        <Skeleton className="h-96" />
      ) : !data ? null : (
        <>
          <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
            Comparando com <strong className="text-foreground">{kp?.inicio ?? "—"}</strong> a <strong className="text-foreground">{kp?.fim ?? "—"}</strong>.
            Pagamentos pendentes não entram nos snapshots e não aparecem aqui.
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <KpiCard label="Receita bruta" value={brl(k.receita_bruta_centavos)} icon={DollarSign} variant="success" hint={`vs ${brl(kp.receita_bruta_centavos)} · ${deltaPct(k.receita_bruta_centavos || 0, kp.receita_bruta_centavos || 0).label}`} />
            <KpiCard label="Receita líquida" value={brl(k.receita_liquida_centavos)} icon={Wallet} variant="success" hint={`vs ${brl(kp.receita_liquida_centavos)} · ${deltaPct(k.receita_liquida_centavos || 0, kp.receita_liquida_centavos || 0).label}`} />
            <KpiCard label="Comissão plataforma" value={brl(k.comissao_plataforma_centavos)} icon={Receipt} hint={`vs ${brl(kp.comissao_plataforma_centavos)} · ${deltaPct(k.comissao_plataforma_centavos || 0, kp.comissao_plataforma_centavos || 0).label}`} />
            <KpiCard label="Repasse médicos" value={brl(k.repasse_medicos_centavos)} icon={Wallet} hint={`vs ${brl(kp.repasse_medicos_centavos)} · ${deltaPct(k.repasse_medicos_centavos || 0, kp.repasse_medicos_centavos || 0).label}`} />
            <KpiCard label="Taxas (gateway+imposto)" value={brl((k.taxa_gateway_centavos || 0) + (k.taxa_imposto_centavos || 0))} icon={Receipt} />
            <KpiCard label="Reembolsos" value={brl(k.reembolsos_centavos)} icon={RotateCcw} variant="warning" />
            <KpiCard label="Consultas concluídas" value={num(k.consultas_concluidas)} icon={Users} hint={`vs ${num(kp.consultas_concluidas)} · ${deltaPct(k.consultas_concluidas || 0, kp.consultas_concluidas || 0).label}`} />
            <KpiCard label="Ticket médio" value={brl(k.ticket_medio_centavos)} icon={DollarSign} hint={`vs ${brl(kp.ticket_medio_centavos)} · ${deltaPct(k.ticket_medio_centavos || 0, kp.ticket_medio_centavos || 0).label}`} />
          </div>

          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Receita diária</h3>
            {diario.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Sem dados.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={diario}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => brl((v as number) * 100)} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  <Line type="monotone" dataKey="bruta" name="Receita bruta" stroke={COLORS[0]} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="liquida" name="Receita líquida" stroke={COLORS[3]} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Tabs defaultValue="medico">
            <TabsList>
              <TabsTrigger value="medico">Por médico</TabsTrigger>
              <TabsTrigger value="especialidade">Especialidade</TabsTrigger>
              <TabsTrigger value="modalidade">Modalidade</TabsTrigger>
              <TabsTrigger value="metodo">Método</TabsTrigger>
              <TabsTrigger value="canal">Canal</TabsTrigger>
            </TabsList>

            <TabsContent value="medico" className="mt-4">
              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">Receita por médico</h3>
                  <Input
                    placeholder="Buscar médico..."
                    value={buscaMedico}
                    onChange={(e) => setBuscaMedico(e.target.value)}
                    className="w-64"
                  />
                </div>
                <TabelaPorMedico lista={medicosFiltrados} />
              </Card>
            </TabsContent>

            <TabsContent value="especialidade" className="mt-4">
              <Card className="p-4">
                <TabelaSimples
                  titulo="Por especialidade"
                  lista={data.por_especialidade}
                  campo="especialidade"
                  campoQtd="consultas"
                />
              </Card>
            </TabsContent>

            <TabsContent value="modalidade" className="mt-4">
              <Card className="p-4">
                <TabelaSimples
                  titulo="Por modalidade"
                  lista={data.por_modalidade}
                  campo="modalidade"
                  campoQtd="consultas"
                />
              </Card>
            </TabsContent>

            <TabsContent value="metodo" className="mt-4">
              <Card className="p-4">
                <TabelaSimples
                  titulo="Por método de pagamento"
                  lista={data.por_metodo}
                  campo="metodo"
                  campoQtd="pagamentos"
                />
              </Card>
            </TabsContent>

            <TabsContent value="canal" className="mt-4">
              <Card className="p-4">
                <TabelaSimples
                  titulo="Por canal de origem"
                  lista={data.por_canal}
                  campo="canal"
                  campoQtd="consultas"
                />
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function TabelaPorMedico({ lista }: { lista: any[] }) {
  if (!lista?.length) return <div className="py-8 text-center text-sm text-muted-foreground">Sem dados no período.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground border-b">
          <tr>
            <th className="text-left py-2">Médico</th>
            <th className="text-right py-2">Consultas</th>
            <th className="text-right py-2">Receita</th>
            <th className="text-right py-2">Comissão</th>
            <th className="text-right py-2">Repasse</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((m: any) => (
            <tr key={m.medico_id} className="border-b last:border-0">
              <td className="py-2">{m.medico_nome}</td>
              <td className="py-2 text-right">{num(m.consultas)}</td>
              <td className="py-2 text-right font-medium">{brl(m.receita_centavos)}</td>
              <td className="py-2 text-right">{brl(m.comissao_centavos)}</td>
              <td className="py-2 text-right">{brl(m.repasse_centavos)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabelaSimples({
  titulo, lista, campo, campoQtd,
}: { titulo: string; lista: any[]; campo: string; campoQtd: string }) {
  if (!lista?.length) return <div className="py-8 text-center text-sm text-muted-foreground">Sem dados no período.</div>;
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">{titulo}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b">
            <tr>
              <th className="text-left py-2 capitalize">{campo}</th>
              <th className="text-right py-2">Quantidade</th>
              <th className="text-right py-2">Receita</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((r: any, i: number) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-2">
                  <Badge variant="outline" className="capitalize">{String(r[campo] ?? "—").replace(/_/g, " ")}</Badge>
                </td>
                <td className="py-2 text-right">{num(r[campoQtd])}</td>
                <td className="py-2 text-right font-medium">{brl(r.receita_centavos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
