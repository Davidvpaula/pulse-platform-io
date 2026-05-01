import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Layers, Users, TrendingUp, AlertTriangle, Copy, Power, BarChart3, Trash2, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PlanoBuilder } from "@/components/planos/PlanoBuilder";
import { DescontoProgressivoConfig } from "@/components/planos/DescontoProgressivoConfig";
import { TaxaPlataformaConfig } from "@/components/planos/TaxaPlataformaConfig";
import { brl, corClassificacao, labelClassificacao, type Classificacao, type SaudeFinanceira } from "@/lib/planos/saude";

type Plano = any;
type Assinatura = any;

export default function AdminPlanos() {
  const [tab, setTab] = useState("dashboard");
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [saudes, setSaudes] = useState<Record<string, SaudeFinanceira>>({});
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [auditoria, setAuditoria] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroPublico, setFiltroPublico] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroSaude, setFiltroSaude] = useState<string>("todos");

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function carregar() {
    setLoading(true);
    try {
      const { data: ps } = await supabase
        .from("planos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      const { data: assin } = await supabase
        .from("assinaturas")
        .select("*, plano:planos(id,nome,categoria), paciente:pacientes(id,nome), empresa:empresas(id,razao_social,nome_fantasia)")
        .order("created_at", { ascending: false })
        .limit(500);

      const { data: aud } = await supabase
        .from("planos_auditoria")
        .select("*, plano:planos(id,nome)")
        .order("created_at", { ascending: false })
        .limit(200);

      setPlanos(ps ?? []);
      setAssinaturas(assin ?? []);
      setAuditoria(aud ?? []);

      // Carrega saúde financeira de cada plano em paralelo
      const sMap: Record<string, SaudeFinanceira> = {};
      await Promise.all(
        (ps ?? []).map(async (p: any) => {
          const { data } = await supabase.rpc("plano_saude_financeira", { _plano_id: p.id });
          if (data) sMap[p.id] = data as unknown as SaudeFinanceira;
        }),
      );
      setSaudes(sMap);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao carregar planos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void carregar(); }, []);

  // KPIs
  const kpis = useMemo(() => {
    const ativos = planos.filter((p) => p.status === "ativo").length;
    const assinAtivas = assinaturas.filter((a) => a.status === "ativa").length;
    const mrr = assinaturas
      .filter((a) => a.status === "ativa" && a.ciclo === "mensal")
      .reduce((acc, a) => acc + (a.valor_cobrado_centavos || 0), 0);
    const cancelados = assinaturas.filter((a) => a.status === "cancelada").length;
    const taxaCancel = assinaturas.length ? (cancelados / assinaturas.length) * 100 : 0;
    const lucroMedio =
      planos.length > 0
        ? planos.reduce((acc, p) => acc + (saudes[p.id]?.lucro_centavos ?? 0), 0) / planos.length
        : 0;
    const emRisco = planos.filter(
      (p) => ["prejuizo", "risco_alto"].includes(saudes[p.id]?.classificacao as string),
    ).length;
    const mostSold = [...assinaturas]
      .reduce<Record<string, number>>((acc, a) => {
        const k = a.plano?.nome ?? a.plano_id;
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {});
    const topPlano =
      Object.entries(mostSold).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    return { ativos, assinAtivas, mrr, taxaCancel, lucroMedio, emRisco, topPlano };
  }, [planos, assinaturas, saudes]);

  const planosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return planos.filter((p) => {
      if (q && !`${p.nome} ${p.descricao_comercial ?? ""}`.toLowerCase().includes(q)) return false;
      if (filtroPublico !== "todos" && p.publico !== filtroPublico) return false;
      if (filtroStatus === "ativos" && p.status !== "ativo") return false;
      if (filtroStatus === "inativos" && p.status === "ativo") return false;
      if (filtroSaude !== "todos" && saudes[p.id]?.classificacao !== filtroSaude) return false;
      return true;
    });
  }, [planos, busca, filtroPublico, filtroStatus, filtroSaude, saudes]);

  async function toggleAtivo(p: Plano) {
    const novo = p.status === "ativo" ? "inativo" : "ativo";
    const { error } = await supabase.from("planos").update({ status: novo }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(`Plano ${novo === "ativo" ? "ativado" : "desativado"}`);
    void carregar();
  }

  async function duplicar(p: Plano) {
    const novo: any = { ...p, nome: `${p.nome} (cópia)`, status: "rascunho", publicado_site: false };
    delete novo.id; delete novo.created_at; delete novo.updated_at;
    const { data, error } = await supabase.from("planos").insert(novo).select("id").single();
    if (error) return toast.error(error.message);
    const { data: bens } = await supabase.from("plano_beneficios").select("*").eq("plano_id", p.id);
    if (bens && bens.length > 0) {
      const rows = bens.map((b: any) => {
        const r = { ...b, plano_id: data.id };
        delete r.id; delete r.created_at; delete r.updated_at;
        return r;
      });
      await supabase.from("plano_beneficios").insert(rows);
    }
    toast.success("Plano duplicado");
    void carregar();
  }

  async function excluir(p: Plano) {
    if (!confirm(`Excluir o plano "${p.nome}"? Essa ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from("planos").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Plano excluído");
    void carregar();
  }

  function editar(id: string) { setEditingId(id); setBuilderOpen(true); }
  function novo() { setEditingId(null); setBuilderOpen(true); }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planos e assinaturas"
        description="Crie, edite, analise e otimize todos os planos da plataforma."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => carregar()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
            </Button>
            <Button onClick={novo}><Plus className="h-4 w-4 mr-1" /> Novo plano</Button>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="planos">Planos ({planos.length})</TabsTrigger>
          <TabsTrigger value="assinaturas">Assinaturas ({assinaturas.length})</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
          <TabsTrigger value="descontos">Descontos</TabsTrigger>
          <TabsTrigger value="taxa">Taxa plataforma</TabsTrigger>
        </TabsList>

        {/* DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi icon={<Layers className="h-4 w-4" />} label="Planos ativos" value={String(kpis.ativos)} />
            <Kpi icon={<Users className="h-4 w-4" />} label="Assinaturas ativas" value={String(kpis.assinAtivas)} />
            <Kpi icon={<TrendingUp className="h-4 w-4" />} label="MRR" value={brl(kpis.mrr)} />
            <Kpi icon={<AlertTriangle className="h-4 w-4" />} label="Planos em risco" value={String(kpis.emRisco)} tone={kpis.emRisco > 0 ? "negative" : undefined} />
            <Kpi label="Lucro médio / plano" value={brl(kpis.lucroMedio)} tone={kpis.lucroMedio >= 0 ? "positive" : "negative"} />
            <Kpi label="Taxa de cancelamento" value={`${kpis.taxaCancel.toFixed(1)}%`} />
            <Kpi label="Plano mais vendido" value={kpis.topPlano} />
            <Kpi label="Total de planos" value={String(planos.length)} />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Visão por classificação</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {(["saudavel","atencao","risco_alto","prejuizo","sem_dados"] as Classificacao[]).map((c) => {
                  const qtd = planos.filter((p) => saudes[p.id]?.classificacao === c).length;
                  return (
                    <div key={c} className="rounded-lg border p-3">
                      <Badge variant="outline" className={corClassificacao[c]}>{labelClassificacao[c]}</Badge>
                      <div className="text-2xl font-semibold mt-2">{qtd}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PLANOS */}
        <TabsContent value="planos" className="space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome ou descrição..." />
              </div>
            </div>
            <FilterSelect label="Público" value={filtroPublico} onChange={setFiltroPublico} options={[["todos","Todos"],["paciente","Paciente"],["empresa","Empresa"],["ambos","Ambos"]]} />
            <FilterSelect label="Status" value={filtroStatus} onChange={setFiltroStatus} options={[["todos","Todos"],["ativos","Ativos"],["inativos","Inativos"]]} />
            <FilterSelect label="Saúde" value={filtroSaude} onChange={setFiltroSaude} options={[["todos","Todos"],["saudavel","Saudável"],["atencao","Atenção"],["risco_alto","Risco alto"],["prejuizo","Prejuízo"],["sem_dados","Sem dados"]]} />
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plano</TableHead>
                    <TableHead>Público</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Assin.</TableHead>
                    <TableHead>Receita</TableHead>
                    <TableHead>Lucro</TableHead>
                    <TableHead>Saúde</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planosFiltrados.map((p) => {
                    const s = saudes[p.id];
                    const cls = (s?.classificacao ?? "sem_dados") as Classificacao;
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium">{p.nome}</div>
                          <div className="text-xs text-muted-foreground">{p.categoria}</div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{p.publico}</Badge></TableCell>
                        <TableCell>{brl(p.valor_mensal_centavos)}/mês</TableCell>
                        <TableCell>{s?.qtd_assinantes ?? 0}</TableCell>
                        <TableCell>{brl(s?.receita_total_centavos ?? 0)}</TableCell>
                        <TableCell className={s && s.lucro_centavos < 0 ? "text-red-600" : "text-emerald-600"}>
                          {brl(s?.lucro_centavos ?? 0)}
                        </TableCell>
                        <TableCell><Badge variant="outline" className={corClassificacao[cls]}>{labelClassificacao[cls]}</Badge></TableCell>
                        <TableCell><Badge variant={p.status === "ativo" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => editar(p.id)} title="Editar"><BarChart3 className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => duplicar(p)} title="Duplicar"><Copy className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => toggleAtivo(p)} title="Ativar/Desativar"><Power className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => excluir(p)} title="Excluir"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {planosFiltrados.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum plano encontrado.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ASSINATURAS */}
        <TabsContent value="assinaturas">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titular</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ciclo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Próxima cobrança</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assinaturas.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.paciente?.nome || a.empresa?.nome_fantasia || a.empresa?.razao_social || "—"}</TableCell>
                      <TableCell>{a.plano?.nome ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                      <TableCell>{a.ciclo}</TableCell>
                      <TableCell>{brl(a.valor_cobrado_centavos)}</TableCell>
                      <TableCell>{a.data_inicio}</TableCell>
                      <TableCell>{a.proxima_cobranca ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {assinaturas.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma assinatura ainda.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUDITORIA */}
        <TabsContent value="auditoria">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Campo</TableHead>
                    <TableHead>De</TableHead>
                    <TableHead>Para</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditoria.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{new Date(l.created_at).toLocaleString("pt-BR")}</TableCell>
                      <TableCell>{l.plano?.nome ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline">{l.acao}</Badge></TableCell>
                      <TableCell>{l.campo ?? "—"}</TableCell>
                      <TableCell className="text-xs">{l.valor_anterior ?? "—"}</TableCell>
                      <TableCell className="text-xs">{l.valor_novo ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {auditoria.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sem registros de auditoria.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DESCONTOS PROGRESSIVOS */}
        <TabsContent value="descontos">
          <DescontoProgressivoConfig />
        </TabsContent>

        {/* TAXA PLATAFORMA */}
        <TabsContent value="taxa">
          <TaxaPlataformaConfig />
        </TabsContent>
      </Tabs>

      <PlanoBuilder
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        planoId={editingId}
        onSaved={carregar}
      />
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon?: React.ReactNode; label: string; value: string; tone?: "positive" | "negative" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
        <div className={`text-xl font-semibold mt-1 ${tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-red-600" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
