import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Activity, Users, TrendingUp, Wallet, Target, Eye, MousePointerClick, Smartphone,
  Globe, Plus, Loader2, ArrowUp, ArrowDown, RefreshCw, Download,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { RequirePermission } from "@/components/permissions/RequirePermission";

const PERIODOS = [
  { v: "7", l: "Últimos 7 dias" },
  { v: "30", l: "Últimos 30 dias" },
  { v: "90", l: "Últimos 90 dias" },
  { v: "365", l: "Último ano" },
];

const COLORS = ["hsl(var(--primary))", "hsl(var(--info))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];

function pct(now: number, prev: number) {
  if (!prev) return now > 0 ? 100 : 0;
  return Math.round(((now - prev) / prev) * 100);
}

function brl(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

function downloadCSV(filename: string, rows: any[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const csv = [cols.join(","), ...rows.map(r => cols.map(c => JSON.stringify(r[c] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

export default function AdminAnalises() {
  const [periodo, setPeriodo] = useState("30");
  const [overview, setOverview] = useState<any>(null);
  const [trafego, setTrafego] = useState<any>(null);
  const [conversao, setConversao] = useState<any>(null);
  const [financeiro, setFinanceiro] = useState<any>(null);
  const [tempoReal, setTempoReal] = useState<any>(null);
  const [campanhas, setCampanhas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [novaCampanha, setNovaCampanha] = useState(false);

  async function carregar() {
    setLoading(true);
    const dias = parseInt(periodo, 10);
    const [ov, tf, cv, fi] = await Promise.all([
      supabase.rpc("analytics_overview", { _dias: dias }),
      supabase.rpc("analytics_trafego", { _dias: dias }),
      supabase.rpc("analytics_conversao", { _dias: dias }),
      supabase.rpc("analytics_financeiro", { _dias: dias }),
    ]);
    if (ov.error) toast.error("Análises: " + ov.error.message);
    setOverview(ov.data);
    setTrafego(tf.data);
    setConversao(cv.data);
    setFinanceiro(fi.data);
    const { data: mc } = await supabase.from("marketing_campaigns").select("*").order("created_at", { ascending: false });
    setCampanhas(mc || []);
    setLoading(false);
  }

  async function carregarTempoReal() {
    const { data } = await supabase.rpc("analytics_tempo_real");
    setTempoReal(data);
  }

  useEffect(() => { carregar(); }, [periodo]);

  // polling tempo real
  useEffect(() => {
    carregarTempoReal();
    const id = setInterval(carregarTempoReal, 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Análises"
        description="Painel estratégico — tráfego, conversão, receita por canal e ROI de marketing. (Diferente de Relatórios, que é operacional.)"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>{PERIODOS.map(p => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={carregar}>
          <RefreshCw className="mr-1 h-3 w-3" /> Atualizar
        </Button>
        <div className="ml-auto flex items-center gap-2 rounded-full border border-success/30 bg-success/5 px-3 py-1 text-xs text-success">
          <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
          {tempoReal?.ativos ?? 0} ativos agora
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="tempo-real">Tempo real</TabsTrigger>
          <TabsTrigger value="trafego">Tráfego</TabsTrigger>
          <TabsTrigger value="comportamento">Comportamento</TabsTrigger>
          <TabsTrigger value="conversao">Conversão</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="comparativo">Comparativo</TabsTrigger>
        </TabsList>

        {/* === VISÃO GERAL === */}
        <TabsContent value="overview" className="space-y-4">
          {loading ? <Loading /> : (
            <>
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
                <Kpi icon={Eye} label="Sessões" value={overview?.sessoes ?? 0} delta={pct(overview?.sessoes ?? 0, overview?.sessoes_prev ?? 0)} />
                <Kpi icon={Users} label="Visitantes únicos" value={overview?.visitantes_unicos ?? 0} delta={pct(overview?.visitantes_unicos ?? 0, overview?.visitantes_unicos_prev ?? 0)} />
                <Kpi icon={Target} label="Conversões" value={overview?.conversoes ?? 0} delta={pct(overview?.conversoes ?? 0, overview?.conversoes_prev ?? 0)} />
                <Kpi icon={Wallet} label="Receita" value={brl(Number(overview?.receita ?? 0))} delta={pct(Number(overview?.receita ?? 0), Number(overview?.receita_prev ?? 0))} />
                <Kpi icon={TrendingUp} label="Taxa conversão" value={`${overview?.taxa_conversao ?? 0}%`} />
                <Kpi icon={Wallet} label="Ticket médio" value={brl(Number(overview?.ticket_medio ?? 0))} />
              </div>
              <Card>
                <CardHeader><CardTitle>Sessões ao longo do tempo</CardTitle></CardHeader>
                <CardContent className="h-72">
                  {trafego?.serie_diaria?.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trafego.serie_diaria}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="sessoes" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="unicos" stroke="hsl(var(--info))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <Empty />}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* === TEMPO REAL === */}
        <TabsContent value="tempo-real" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Kpi icon={Users} label="Ativos agora (5min)" value={tempoReal?.ativos ?? 0} />
            <Kpi icon={Eye} label="Páginas ativas" value={tempoReal?.paginas_atuais?.length ?? 0} />
            <Kpi icon={Activity} label="Eventos recentes" value={tempoReal?.ultimos_eventos?.length ?? 0} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Páginas sendo acessadas</CardTitle></CardHeader>
              <CardContent>
                {tempoReal?.paginas_atuais?.length ? (
                  <ul className="divide-y divide-border text-sm">
                    {tempoReal.paginas_atuais.map((p: any) => (
                      <li key={p.rota} className="flex justify-between py-2">
                        <span className="font-mono text-xs">{p.rota}</span>
                        <span className="font-semibold">{p.usuarios}</span>
                      </li>
                    ))}
                  </ul>
                ) : <Empty texto="Ninguém navegando agora" />}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Últimos eventos</CardTitle></CardHeader>
              <CardContent>
                {tempoReal?.ultimos_eventos?.length ? (
                  <ul className="max-h-80 divide-y divide-border overflow-auto text-sm">
                    {tempoReal.ultimos_eventos.map((e: any, i: number) => (
                      <li key={i} className="flex items-center justify-between py-2">
                        <div>
                          <div className="text-xs font-semibold">{e.tipo}</div>
                          <div className="font-mono text-[11px] text-muted-foreground">{e.rota}</div>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{new Date(e.quando).toLocaleTimeString("pt-BR")}</span>
                      </li>
                    ))}
                  </ul>
                ) : <Empty texto="Sem eventos no momento" />}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* === TRÁFEGO === */}
        <TabsContent value="trafego" className="space-y-4">
          {loading ? <Loading /> : (
            <>
              <div className="grid gap-3 md:grid-cols-4">
                <Kpi icon={Eye} label="Sessões" value={overview?.sessoes ?? 0} />
                <Kpi icon={Users} label="Únicos" value={overview?.visitantes_unicos ?? 0} />
                <Kpi icon={Globe} label="Novos" value={trafego?.novos_recorrentes?.novos ?? 0} />
                <Kpi icon={Smartphone} label="Recorrentes" value={trafego?.novos_recorrentes?.recorrentes ?? 0} />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle>Origem do tráfego</CardTitle></CardHeader>
                  <CardContent className="h-72">
                    {trafego?.origem?.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={trafego.origem} dataKey="sessoes" nameKey="origem" outerRadius={90} label>
                            {trafego.origem.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Legend />
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <Empty />}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Dispositivo</CardTitle></CardHeader>
                  <CardContent className="h-72">
                    {trafego?.dispositivo?.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trafego.dispositivo}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="dispositivo" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="sessoes" fill="hsl(var(--primary))" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <Empty />}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* === COMPORTAMENTO (placeholder funcional com páginas mais acessadas) === */}
        <TabsContent value="comportamento" className="space-y-4">
          {loading ? <Loading /> : (
            <Card>
              <CardHeader><CardTitle>Páginas mais acessadas</CardTitle></CardHeader>
              <CardContent>
                {conversao?.por_pagina?.length ? (
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="p-2 text-left">Rota</th>
                        <th className="p-2 text-right">Visitas</th>
                        <th className="p-2 text-right">Iniciaram agendamento</th>
                        <th className="p-2 text-right">Conversão %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conversao.por_pagina.map((p: any) => (
                        <tr key={p.rota} className="border-t border-border">
                          <td className="p-2 font-mono text-xs">{p.rota}</td>
                          <td className="p-2 text-right">{p.visitas}</td>
                          <td className="p-2 text-right">{p.conversoes}</td>
                          <td className="p-2 text-right font-semibold">{p.taxa}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <Empty />}
              </CardContent>
              <CardContent className="border-t border-border text-xs text-muted-foreground">
                💡 Tempo médio na página, taxa de rejeição e fluxo de navegação estarão disponíveis na próxima rodada — exigem agregações temporais mais elaboradas.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* === CONVERSÃO === */}
        <TabsContent value="conversao" className="space-y-4">
          {loading ? <Loading /> : (
            <>
              <Card>
                <CardHeader><CardTitle>Funil de conversão</CardTitle></CardHeader>
                <CardContent>
                  {conversao?.funil ? (
                    <Funil dados={conversao.funil} />
                  ) : <Empty />}
                </CardContent>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle>Conversão por página</CardTitle></CardHeader>
                  <CardContent className="h-72">
                    {conversao?.por_pagina?.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={conversao.por_pagina.slice(0, 8)}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="rota" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="taxa" fill="hsl(var(--success))" name="Taxa %" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <Empty />}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Conversões por serviço</CardTitle></CardHeader>
                  <CardContent>
                    {conversao?.por_servico?.length ? (
                      <table className="min-w-full text-sm">
                        <thead className="bg-muted/40">
                          <tr><th className="p-2 text-left">Serviço</th><th className="p-2 text-right">Conversões</th><th className="p-2 text-right">Receita</th></tr>
                        </thead>
                        <tbody>
                          {conversao.por_servico.map((s: any) => (
                            <tr key={s.servico} className="border-t border-border">
                              <td className="p-2 capitalize">{s.servico}</td>
                              <td className="p-2 text-right">{s.conversoes}</td>
                              <td className="p-2 text-right font-semibold">{brl(Number(s.receita))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : <Empty />}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* === FINANCEIRO === */}
        <TabsContent value="financeiro" className="space-y-4">
          {loading ? <Loading /> : (
            <RequirePermission perm="analises.financeiro" showFallback>
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <Kpi icon={Wallet} label="Receita do período" value={brl(Number(overview?.receita ?? 0))} delta={pct(Number(overview?.receita ?? 0), Number(overview?.receita_prev ?? 0))} />
                  <Kpi icon={Target} label="Conversões pagas" value={overview?.conversoes ?? 0} />
                  <Kpi icon={TrendingUp} label="Ticket médio" value={brl(Number(overview?.ticket_medio ?? 0))} />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Receita por canal</CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => downloadCSV("receita_canal.csv", financeiro?.receita_por_canal || [])}>
                        <Download className="h-3 w-3" />
                      </Button>
                    </CardHeader>
                    <CardContent className="h-72">
                      {financeiro?.receita_por_canal?.length ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={financeiro.receita_por_canal} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis dataKey="origem" type="category" tick={{ fontSize: 11 }} width={90} />
                            <Tooltip formatter={(v: any) => brl(Number(v))} />
                            <Bar dataKey="receita" fill="hsl(var(--primary))" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <Empty />}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Receita por serviço</CardTitle></CardHeader>
                    <CardContent>
                      {financeiro?.receita_por_servico?.length ? (
                        <table className="min-w-full text-sm">
                          <thead className="bg-muted/40">
                            <tr><th className="p-2 text-left">Serviço</th><th className="p-2 text-right">Receita</th><th className="p-2 text-right">Ticket médio</th></tr>
                          </thead>
                          <tbody>
                            {financeiro.receita_por_servico.map((s: any) => (
                              <tr key={s.servico} className="border-t border-border">
                                <td className="p-2 capitalize">{s.servico}</td>
                                <td className="p-2 text-right font-semibold">{brl(Number(s.receita))}</td>
                                <td className="p-2 text-right">{brl(Number(s.ticket_medio))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : <Empty />}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader><CardTitle>ROI das campanhas (manual)</CardTitle></CardHeader>
                  <CardContent>
                    {financeiro?.roi_campanhas?.length ? (
                      <table className="min-w-full text-sm">
                        <thead className="bg-muted/40">
                          <tr>
                            <th className="p-2 text-left">Campanha</th>
                            <th className="p-2 text-left">Canal</th>
                            <th className="p-2 text-right">Custo</th>
                            <th className="p-2 text-right">Receita</th>
                            <th className="p-2 text-right">Conversões</th>
                            <th className="p-2 text-right">ROI %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {financeiro.roi_campanhas.map((c: any, i: number) => (
                            <tr key={i} className="border-t border-border">
                              <td className="p-2 font-medium">{c.nome}</td>
                              <td className="p-2 capitalize">{c.canal}</td>
                              <td className="p-2 text-right">{brl(Number(c.custo))}</td>
                              <td className="p-2 text-right">{brl(Number(c.receita))}</td>
                              <td className="p-2 text-right">{c.conversoes}</td>
                              <td className={`p-2 text-right font-bold ${c.roi_pct == null ? "" : c.roi_pct >= 0 ? "text-success" : "text-destructive"}`}>
                                {c.roi_pct == null ? "—" : `${c.roi_pct}%`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : <Empty texto="Nenhuma campanha cadastrada — vá para a aba Marketing" />}
                  </CardContent>
                </Card>
              </div>
            </RequirePermission>
          )}
        </TabsContent>

        {/* === MARKETING === */}
        <TabsContent value="marketing" className="space-y-4">
          <RequirePermission perm="analises.marketing" showFallback>
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setNovaCampanha(true)}><Plus className="mr-1 h-3 w-3" /> Nova campanha</Button>
              </div>
              <Card>
                <CardHeader><CardTitle>Campanhas cadastradas</CardTitle></CardHeader>
                <CardContent>
                  {campanhas.length ? (
                    <table className="min-w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="p-2 text-left">Nome</th>
                          <th className="p-2 text-left">Canal</th>
                          <th className="p-2 text-left">UTM source</th>
                          <th className="p-2 text-left">UTM campanha</th>
                          <th className="p-2 text-left">Período</th>
                          <th className="p-2 text-right">Custo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campanhas.map(c => (
                          <tr key={c.id} className="border-t border-border">
                            <td className="p-2 font-medium">{c.nome}</td>
                            <td className="p-2 capitalize">{c.canal.replace("_", " ")}</td>
                            <td className="p-2 font-mono text-xs">{c.utm_source || "—"}</td>
                            <td className="p-2 font-mono text-xs">{c.utm_campaign || "—"}</td>
                            <td className="p-2 text-xs">
                              {c.inicio || "?"} → {c.fim || "—"}
                            </td>
                            <td className="p-2 text-right">{brl(Number(c.custo_total))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <Empty texto="Cadastre sua primeira campanha para medir ROI" />}
                </CardContent>
              </Card>
            </div>
          </RequirePermission>
        </TabsContent>

        {/* === COMPARATIVO === */}
        <TabsContent value="comparativo" className="space-y-4">
          {loading ? <Loading /> : (
            <Card>
              <CardHeader><CardTitle>Comparativo: período atual vs anterior</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <Comp label="Sessões" agora={overview?.sessoes ?? 0} antes={overview?.sessoes_prev ?? 0} />
                  <Comp label="Visitantes únicos" agora={overview?.visitantes_unicos ?? 0} antes={overview?.visitantes_unicos_prev ?? 0} />
                  <Comp label="Conversões" agora={overview?.conversoes ?? 0} antes={overview?.conversoes_prev ?? 0} />
                  <Comp label="Receita" agora={Number(overview?.receita ?? 0)} antes={Number(overview?.receita_prev ?? 0)} brlFmt />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <NovaCampanhaSheet open={novaCampanha} onOpenChange={setNovaCampanha} onSaved={carregar} />
    </div>
  );
}

/* ---------------- COMPONENTES ---------------- */

function Kpi({ icon: Icon, label, value, delta }: any) {
  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
      {delta !== undefined && (
        <p className={`mt-1 flex items-center gap-1 text-xs ${delta >= 0 ? "text-success" : "text-destructive"}`}>
          {delta >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          {Math.abs(delta)}% vs período anterior
        </p>
      )}
    </div>
  );
}

function Loading() {
  return <div className="flex items-center justify-center p-12 text-muted-foreground">
    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
  </div>;
}

function Empty({ texto = "Sem dados no período selecionado" }: { texto?: string }) {
  return <div className="py-8 text-center text-sm text-muted-foreground">{texto}</div>;
}

function Funil({ dados }: { dados: any }) {
  const steps = [
    { label: "Visitantes", v: dados.visitantes, color: "bg-info" },
    { label: "Iniciaram agendamento", v: dados.iniciaram, color: "bg-primary" },
    { label: "Agendaram", v: dados.agendaram, color: "bg-warning" },
    { label: "Pagaram", v: dados.pagaram, color: "bg-success" },
  ];
  const max = Math.max(...steps.map(s => s.v || 0), 1);
  return (
    <div className="space-y-2">
      {steps.map((s, i) => {
        const pct = Math.round((s.v / max) * 100);
        const conv = i > 0 && steps[i - 1].v > 0 ? Math.round((s.v / steps[i - 1].v) * 100) : null;
        return (
          <div key={s.label}>
            <div className="flex justify-between text-sm">
              <span>{s.label}</span>
              <span className="font-semibold">
                {s.v?.toLocaleString("pt-BR")} {conv !== null && <span className="text-xs text-muted-foreground">({conv}%)</span>}
              </span>
            </div>
            <div className="mt-1 h-3 overflow-hidden rounded-full bg-muted">
              <div className={`h-full ${s.color}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Comp({ label, agora, antes, brlFmt }: { label: string; agora: number; antes: number; brlFmt?: boolean }) {
  const diff = pct(agora, antes);
  const fmt = (n: number) => brlFmt ? brl(n) : n.toLocaleString("pt-BR");
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-end gap-3">
        <div>
          <p className="font-display text-2xl font-bold">{fmt(agora)}</p>
          <p className="text-xs text-muted-foreground">atual</p>
        </div>
        <div className="opacity-60">
          <p className="font-display text-lg">{fmt(antes)}</p>
          <p className="text-xs text-muted-foreground">anterior</p>
        </div>
        <div className={`ml-auto flex items-center gap-1 text-sm font-bold ${diff >= 0 ? "text-success" : "text-destructive"}`}>
          {diff >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />} {Math.abs(diff)}%
        </div>
      </div>
    </div>
  );
}

function NovaCampanhaSheet({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    nome: "", canal: "google_ads", utm_source: "", utm_medium: "", utm_campaign: "",
    custo_total: "0", inicio: "", fim: "", observacoes: "",
  });
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!form.nome) { toast.error("Nome obrigatório"); return; }
    setSalvando(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("marketing_campaigns").insert({
      nome: form.nome,
      canal: form.canal,
      utm_source: form.utm_source || null,
      utm_medium: form.utm_medium || null,
      utm_campaign: form.utm_campaign || null,
      custo_total: parseFloat(form.custo_total) || 0,
      inicio: form.inicio || null,
      fim: form.fim || null,
      observacoes: form.observacoes || null,
      created_by: auth.user?.id ?? null,
    });
    setSalvando(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Campanha cadastrada");
    onOpenChange(false);
    setForm({ nome: "", canal: "google_ads", utm_source: "", utm_medium: "", utm_campaign: "", custo_total: "0", inicio: "", fim: "", observacoes: "" });
    onSaved();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader><SheetTitle>Nova campanha</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-3">
          <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
          <div><Label>Canal</Label>
            <Select value={form.canal} onValueChange={v => setForm({ ...form, canal: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="google_ads">Google Ads</SelectItem>
                <SelectItem value="meta_ads">Meta Ads</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="organico">Orgânico</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label className="text-xs">utm_source</Label><Input value={form.utm_source} onChange={e => setForm({ ...form, utm_source: e.target.value })} /></div>
            <div><Label className="text-xs">utm_medium</Label><Input value={form.utm_medium} onChange={e => setForm({ ...form, utm_medium: e.target.value })} /></div>
            <div><Label className="text-xs">utm_campaign</Label><Input value={form.utm_campaign} onChange={e => setForm({ ...form, utm_campaign: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label className="text-xs">Custo (R$)</Label><Input type="number" step="0.01" value={form.custo_total} onChange={e => setForm({ ...form, custo_total: e.target.value })} /></div>
            <div><Label className="text-xs">Início</Label><Input type="date" value={form.inicio} onChange={e => setForm({ ...form, inicio: e.target.value })} /></div>
            <div><Label className="text-xs">Fim</Label><Input type="date" value={form.fim} onChange={e => setForm({ ...form, fim: e.target.value })} /></div>
          </div>
          <Button className="w-full" onClick={salvar} disabled={salvando}>
            {salvando ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null} Salvar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
