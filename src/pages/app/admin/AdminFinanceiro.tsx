import { useEffect, useMemo, useState, useCallback } from "react";
import {
  DollarSign, TrendingUp, Users, FileText, RefreshCw, Plus, Pencil,
  Loader2, Download, AlertTriangle, Percent, CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const brl = (c: number) =>
  ((c || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const meses = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AdminFinanceiro() {
  // Período do dashboard
  const hoje = new Date();
  const [inicio, setInicio] = useState<string>(
    new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10),
  );
  const [fim, setFim] = useState<string>(
    new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10),
  );
  const [empresaId, setEmpresaId] = useState<string>("todas");
  const [empresas, setEmpresas] = useState<any[]>([]);

  const [dash, setDash] = useState<any>(null);
  const [loadingDash, setLoadingDash] = useState(false);

  // Fechamento
  const [fechAno, setFechAno] = useState(hoje.getFullYear());
  const [fechMes, setFechMes] = useState(hoje.getMonth() + 1);
  const [fech, setFech] = useState<any>(null);
  const [loadingFech, setLoadingFech] = useState(false);

  // Serviços
  const [servicos, setServicos] = useState<any[]>([]);
  const [servDialog, setServDialog] = useState<{ open: boolean; servico?: any }>({ open: false });

  // Overrides
  const [overrides, setOverrides] = useState<any[]>([]);
  const [medicos, setMedicos] = useState<any[]>([]);
  const [overrideDialog, setOverrideDialog] = useState(false);
  const [novoOverride, setNovoOverride] = useState({ medico_id: "", servico_id: "", pct: "", motivo: "" });

  // Comissão padrão
  const [pctPadrao, setPctPadrao] = useState<string>("44");

  const carregarEmpresas = useCallback(async () => {
    const { data } = await supabase
      .from("empresas").select("id, nome_fantasia, razao_social").eq("ativo", true);
    setEmpresas(data || []);
  }, []);

  const carregarMedicos = useCallback(async () => {
    const { data } = await supabase
      .from("medicos").select("id, nome").eq("status", "aprovado").order("nome");
    setMedicos(data || []);
  }, []);

  const carregarDash = useCallback(async () => {
    setLoadingDash(true);
    const { data, error } = await supabase.rpc("financeiro_dashboard", {
      _inicio: inicio, _fim: fim,
      _empresa_id: empresaId === "todas" ? null : empresaId,
    });
    setLoadingDash(false);
    if (error) { toast.error("Falha ao carregar dashboard", { description: error.message }); return; }
    setDash(data);
  }, [inicio, fim, empresaId]);

  const carregarFech = useCallback(async () => {
    setLoadingFech(true);
    const { data, error } = await supabase.rpc("financeiro_fechamento_mensal", {
      _ano: fechAno, _mes: fechMes,
    });
    setLoadingFech(false);
    if (error) { toast.error("Falha no fechamento", { description: error.message }); return; }
    setFech(data);
  }, [fechAno, fechMes]);

  const carregarServicos = useCallback(async () => {
    const { data } = await supabase
      .from("servicos_financeiros").select("*").order("ordem").order("nome");
    setServicos(data || []);
  }, []);

  const carregarOverrides = useCallback(async () => {
    const { data } = await supabase
      .from("medico_comissao_override")
      .select("*, medicos:medico_id(nome), servicos_financeiros:servico_id(nome)")
      .eq("ativo", true);
    setOverrides(data || []);
  }, []);

  const carregarPadrao = useCallback(async () => {
    const { data } = await supabase
      .from("app_settings").select("value").eq("key", "financeiro.comissao_padrao_pct").maybeSingle();
    if (data?.value !== undefined && data.value !== null) setPctPadrao(String(data.value));
  }, []);

  useEffect(() => { carregarEmpresas(); carregarMedicos(); carregarServicos(); carregarOverrides(); carregarPadrao(); }, [
    carregarEmpresas, carregarMedicos, carregarServicos, carregarOverrides, carregarPadrao,
  ]);
  useEffect(() => { carregarDash(); }, [carregarDash]);
  useEffect(() => { carregarFech(); }, [carregarFech]);

  // Salvar serviço
  async function salvarServico(form: any) {
    const payload: any = {
      nome: form.nome.trim(),
      descricao: form.descricao || null,
      tipo: form.tipo,
      modelo: form.modelo,
      ativo: form.ativo,
      ordem: Number(form.ordem || 0),
    };
    if (form.modelo === "percentual") {
      const p = Number(form.comissao_pct);
      if (isNaN(p) || p < 0 || p > 100) return toast.error("% inválida (0–100)");
      payload.comissao_pct = p; payload.valor_fixo_centavos = null;
    } else {
      const v = Math.round(Number(form.valor_fixo) * 100);
      if (isNaN(v) || v < 0) return toast.error("Valor inválido");
      payload.valor_fixo_centavos = v; payload.comissao_pct = null;
    }
    const { error } = form.id
      ? await supabase.from("servicos_financeiros").update(payload).eq("id", form.id)
      : await supabase.from("servicos_financeiros").insert(payload);
    if (error) return toast.error("Erro ao salvar serviço", { description: error.message });
    toast.success("Serviço salvo");
    setServDialog({ open: false }); carregarServicos();
  }

  async function salvarPctPadrao() {
    const p = Number(pctPadrao);
    if (isNaN(p) || p < 0 || p > 100) return toast.error("% inválida (0–100)");
    const { error } = await supabase.from("app_settings").upsert({
      key: "financeiro.comissao_padrao_pct", value: p as any,
    }, { onConflict: "key" });
    if (error) return toast.error(error.message);
    toast.success("Comissão padrão atualizada");
  }

  async function criarOverride() {
    const p = Number(novoOverride.pct);
    if (!novoOverride.medico_id) return toast.error("Selecione um médico");
    if (isNaN(p) || p < 0 || p > 100) return toast.error("% inválida (0–100)");
    const { error } = await supabase.from("medico_comissao_override").insert({
      medico_id: novoOverride.medico_id,
      servico_id: novoOverride.servico_id || null,
      comissao_pct: p,
      motivo: novoOverride.motivo || null,
    });
    if (error) return toast.error("Erro ao criar exceção", { description: error.message });
    toast.success("Exceção criada");
    setOverrideDialog(false);
    setNovoOverride({ medico_id: "", servico_id: "", pct: "", motivo: "" });
    carregarOverrides();
  }

  async function removerOverride(id: string) {
    const { error } = await supabase.from("medico_comissao_override").update({ ativo: false }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Exceção removida");
    carregarOverrides();
  }

  async function marcarPago(medico_id: string) {
    const { error } = await supabase.rpc("financeiro_marcar_pago", {
      _medico_id: medico_id, _ano: fechAno, _mes: fechMes, _observacao: null,
    });
    if (error) return toast.error("Erro ao marcar pago", { description: error.message });
    toast.success("Marcado como pago");
    carregarFech();
  }

  function exportarFechamentoCSV() {
    if (!fech?.medicos?.length) return;
    const rows: any[][] = [
      ["Médico", "Email", "Consultas válidas", "Inválidas", "Bruto (R$)", "Plataforma (R$)", "Médico (R$)", "% média", "Status"],
      ...fech.medicos.map((m: any) => [
        m.medico_nome, m.medico_email, m.qtd_validas, m.qtd_invalidas,
        (m.bruto_centavos / 100).toFixed(2),
        (m.plataforma_centavos / 100).toFixed(2),
        (m.valor_medico_centavos / 100).toFixed(2),
        m.pct_media, m.fechamento_status,
      ]),
    ];
    downloadCSV(`fechamento-${fechAno}-${String(fechMes).padStart(2, "0")}.csv`, rows);
  }

  function exportarRelatorio(tipo: "medico" | "servico" | "empresa") {
    if (!dash) return;
    const arr = dash[`por_${tipo}`] || [];
    const headerMap: any = {
      medico: ["Médico","Qtd","Bruto (R$)","Plataforma (R$)","Médico (R$)"],
      servico: ["Serviço","Qtd","Bruto (R$)","Plataforma (R$)","Médico (R$)"],
      empresa: ["Empresa","Qtd","Bruto (R$)","Plataforma (R$)","Médico (R$)"],
    };
    const keyMap: any = { medico: "medico_nome", servico: "servico_nome", empresa: "empresa_nome" };
    const rows: any[][] = [
      headerMap[tipo],
      ...arr.map((r: any) => [
        r[keyMap[tipo]], r.qtd,
        (r.bruto_centavos / 100).toFixed(2),
        (r.plataforma_centavos / 100).toFixed(2),
        (r.valor_medico_centavos / 100).toFixed(2),
      ]),
    ];
    downloadCSV(`relatorio-${tipo}-${inicio}-a-${fim}.csv`, rows);
  }

  const kpis = dash?.kpis;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description="Receita, repasse aos médicos, serviços e fechamento mensal."
        actions={
          <Button variant="outline" onClick={() => { carregarDash(); carregarFech(); }}>
            <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
          </Button>
        }
      />

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="fechamento">Fechamento mensal</TabsTrigger>
          <TabsTrigger value="servicos">Serviços</TabsTrigger>
          <TabsTrigger value="excecoes">Exceções por médico</TabsTrigger>
          <TabsTrigger value="config">Configuração</TabsTrigger>
        </TabsList>

        {/* DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="rounded-lg border bg-card p-4 flex flex-wrap gap-3 items-end">
            <div>
              <Label>Início</Label>
              <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div>
              <Label>Fim</Label>
              <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
            </div>
            <div className="min-w-[200px]">
              <Label>Empresa (B2B)</Label>
              <Select value={empresaId} onValueChange={setEmpresaId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome_fantasia || e.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loadingDash && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {kpis && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "Faturamento bruto", value: brl(kpis.faturamento_bruto_centavos), icon: DollarSign, cls: "text-primary" },
                { label: "Receita plataforma", value: brl(kpis.receita_plataforma_centavos), icon: TrendingUp, cls: "text-success" },
                { label: "Repasse médicos", value: brl(kpis.repasse_medicos_centavos), icon: Users, cls: "text-accent" },
                { label: "Ticket médio", value: brl(kpis.ticket_medio_centavos), icon: Percent, cls: "text-muted-foreground" },
                { label: "Consultas válidas", value: kpis.consultas_validas, icon: CheckCircle2, cls: "text-success" },
                { label: "Reembolsadas", value: kpis.consultas_reembolsadas + kpis.consultas_invalidadas, icon: AlertTriangle, cls: "text-destructive" },
              ].map((k) => (
                <div key={k.label} className="rounded-lg border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{k.label}</span>
                    <k.icon className={`h-4 w-4 ${k.cls}`} />
                  </div>
                  <div className="text-xl font-display font-semibold mt-1">{k.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Quebras */}
          {dash && (
            <div className="grid lg:grid-cols-3 gap-4">
              {(["medico", "servico", "empresa"] as const).map((tipo) => {
                const arr = dash[`por_${tipo}`] || [];
                const titulo = tipo === "medico" ? "Por médico" : tipo === "servico" ? "Por serviço" : "Por empresa";
                const keyName = tipo === "medico" ? "medico_nome" : tipo === "servico" ? "servico_nome" : "empresa_nome";
                return (
                  <div key={tipo} className="rounded-lg border bg-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-display font-semibold">{titulo}</h3>
                      <Button size="sm" variant="outline" onClick={() => exportarRelatorio(tipo)} disabled={!arr.length}>
                        <Download className="h-3 w-3 mr-1" /> CSV
                      </Button>
                    </div>
                    <div className="space-y-1 max-h-[280px] overflow-y-auto text-sm">
                      {arr.length === 0 && <p className="text-muted-foreground text-center py-6">Sem dados</p>}
                      {arr.map((r: any, i: number) => (
                        <div key={i} className="flex justify-between border-b py-1.5 gap-2">
                          <span className="truncate">{r[keyName] || "—"}</span>
                          <span className="text-right whitespace-nowrap">
                            <span className="text-muted-foreground text-xs">{r.qtd}× </span>
                            <b>{brl(r.valor_medico_centavos)}</b>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* FECHAMENTO */}
        <TabsContent value="fechamento" className="space-y-4">
          <div className="rounded-lg border bg-card p-4 flex flex-wrap gap-3 items-end">
            <div>
              <Label>Mês</Label>
              <Select value={String(fechMes)} onValueChange={(v) => setFechMes(Number(v))}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {meses.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ano</Label>
              <Input type="number" value={fechAno} onChange={(e) => setFechAno(Number(e.target.value))} className="w-[100px]" />
            </div>
            <Button onClick={exportarFechamentoCSV} disabled={!fech?.medicos?.length}>
              <Download className="h-4 w-4 mr-2" /> Exportar CSV
            </Button>
          </div>

          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Médico</th>
                  <th className="text-center px-3 py-2">Válidas</th>
                  <th className="text-right px-3 py-2">Bruto</th>
                  <th className="text-right px-3 py-2">Plataforma</th>
                  <th className="text-right px-3 py-2">A pagar</th>
                  <th className="text-center px-3 py-2">% média</th>
                  <th className="text-center px-3 py-2">Status</th>
                  <th className="text-right px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {loadingFech && (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-4 w-4 inline animate-spin mr-2" />Carregando…
                  </td></tr>
                )}
                {!loadingFech && (!fech?.medicos?.length) && (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Sem consultas neste período.</td></tr>
                )}
                {fech?.medicos?.map((m: any) => (
                  <tr key={m.medico_id} className="border-t">
                    <td className="px-3 py-2">
                      <div className="font-medium">{m.medico_nome}</div>
                      <div className="text-xs text-muted-foreground">{m.medico_email}</div>
                    </td>
                    <td className="text-center px-3 py-2">{m.qtd_validas}</td>
                    <td className="text-right px-3 py-2">{brl(m.bruto_centavos)}</td>
                    <td className="text-right px-3 py-2 text-muted-foreground">{brl(m.plataforma_centavos)}</td>
                    <td className="text-right px-3 py-2 font-semibold">{brl(m.valor_medico_centavos)}</td>
                    <td className="text-center px-3 py-2">{m.pct_media}%</td>
                    <td className="text-center px-3 py-2">
                      {m.fechamento_status === "pago"
                        ? <Badge variant="outline" className="border-success/40 text-success">Pago</Badge>
                        : <Badge variant="outline" className="border-warning/40 text-warning">Em aberto</Badge>}
                    </td>
                    <td className="text-right px-3 py-2">
                      {m.fechamento_status !== "pago" && (
                        <Button size="sm" variant="outline" onClick={() => marcarPago(m.medico_id)}>
                          Marcar pago
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* SERVIÇOS */}
        <TabsContent value="servicos" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setServDialog({ open: true, servico: { modelo: "percentual", tipo: "consulta", ativo: true, comissao_pct: pctPadrao } })}>
              <Plus className="h-4 w-4 mr-2" /> Novo serviço
            </Button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {servicos.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground py-8 border rounded-lg">
                Nenhum serviço cadastrado.
              </div>
            )}
            {servicos.map((s) => (
              <div key={s.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold">{s.nome}</h4>
                    <Badge variant="outline" className="mt-1 text-xs">{s.tipo}</Badge>
                  </div>
                  <Switch
                    checked={s.ativo}
                    onCheckedChange={async (v) => {
                      await supabase.from("servicos_financeiros").update({ ativo: v }).eq("id", s.id);
                      carregarServicos();
                    }}
                  />
                </div>
                {s.descricao && <p className="text-xs text-muted-foreground mb-2">{s.descricao}</p>}
                <div className="text-sm">
                  {s.modelo === "percentual"
                    ? <>Plataforma: <b>{s.comissao_pct}%</b></>
                    : <>Plataforma fixa: <b>{brl(s.valor_fixo_centavos)}</b></>}
                </div>
                <Button size="sm" variant="ghost" className="mt-2" onClick={() => setServDialog({ open: true, servico: { ...s, valor_fixo: s.valor_fixo_centavos ? s.valor_fixo_centavos / 100 : 0 } })}>
                  <Pencil className="h-3 w-3 mr-1" /> Editar
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* EXCEÇÕES */}
        <TabsContent value="excecoes" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              % personalizada por médico — sobrescreve o padrão e o serviço.
            </p>
            <Dialog open={overrideDialog} onOpenChange={setOverrideDialog}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Nova exceção</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova exceção de comissão</DialogTitle>
                  <DialogDescription>Override de % para um médico (opcionalmente em um serviço específico).</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Médico</Label>
                    <Select value={novoOverride.medico_id} onValueChange={(v) => setNovoOverride({ ...novoOverride, medico_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                      <SelectContent>
                        {medicos.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Serviço (opcional — em branco = todos)</Label>
                    <Select value={novoOverride.servico_id || "_global"} onValueChange={(v) => setNovoOverride({ ...novoOverride, servico_id: v === "_global" ? "" : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_global">Todos os serviços (global)</SelectItem>
                        {servicos.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>% da plataforma</Label>
                    <Input type="number" min={0} max={100} step="0.01"
                      value={novoOverride.pct} onChange={(e) => setNovoOverride({ ...novoOverride, pct: e.target.value })} />
                  </div>
                  <div>
                    <Label>Motivo</Label>
                    <Textarea rows={2} value={novoOverride.motivo} onChange={(e) => setNovoOverride({ ...novoOverride, motivo: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOverrideDialog(false)}>Cancelar</Button>
                  <Button onClick={criarOverride}>Criar exceção</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {overrides.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground py-8 border rounded-lg">
                Nenhuma exceção ativa. Todos os médicos seguem o padrão de {pctPadrao}%.
              </div>
            )}
            {overrides.map((o: any) => (
              <div key={o.id} className="rounded-lg border bg-card p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">{o.medicos?.nome || "—"}</h4>
                    <p className="text-xs text-muted-foreground">
                      {o.servicos_financeiros?.nome || "Todos os serviços (global)"}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-primary/40 text-primary">
                    {o.comissao_pct}%
                  </Badge>
                </div>
                {o.motivo && <p className="text-xs mt-2 text-muted-foreground">{o.motivo}</p>}
                <Button size="sm" variant="ghost" className="mt-2 text-destructive" onClick={() => removerOverride(o.id)}>
                  Remover
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* CONFIG */}
        <TabsContent value="config" className="space-y-4">
          <div className="rounded-lg border bg-card p-4 max-w-md">
            <h3 className="font-display font-semibold mb-2 flex items-center gap-2">
              <Percent className="h-4 w-4" /> Comissão padrão da plataforma
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Aplicada a todas as consultas que não tenham regra específica de serviço ou exceção de médico.
            </p>
            <div className="flex gap-2">
              <Input type="number" min={0} max={100} step="0.01" value={pctPadrao} onChange={(e) => setPctPadrao(e.target.value)} />
              <Button onClick={salvarPctPadrao}>Salvar</Button>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4 max-w-md">
            <h3 className="font-display font-semibold mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" /> Próximos passos
            </h3>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              <li>Adesão do médico aos serviços (página em /app/medico/configuracoes/servicos)</li>
              <li>Export PDF do fechamento mensal</li>
              <li>Integração Stripe/PIX para split automático</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Serviço */}
      <ServicoDialog
        open={servDialog.open}
        servico={servDialog.servico}
        onClose={() => setServDialog({ open: false })}
        onSave={salvarServico}
      />
    </div>
  );
}

function ServicoDialog({ open, servico, onClose, onSave }: any) {
  const [form, setForm] = useState<any>(servico || {});
  useEffect(() => { setForm(servico || {}); }, [servico]);
  if (!servico) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{form.id ? "Editar serviço" : "Novo serviço"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={form.nome || ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} maxLength={120} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea rows={2} value={form.descricao || ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} maxLength={500} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo || "consulta"} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="consulta">Consulta</SelectItem>
                  <SelectItem value="pronto_atendimento">Pronto atendimento</SelectItem>
                  <SelectItem value="pacote">Pacote</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Modelo</Label>
              <Select value={form.modelo || "percentual"} onValueChange={(v) => setForm({ ...form, modelo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentual">% sobre consulta</SelectItem>
                  <SelectItem value="valor_fixo">Valor fixo plataforma</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.modelo === "percentual" ? (
            <div>
              <Label>% da plataforma</Label>
              <Input type="number" min={0} max={100} step="0.01" value={form.comissao_pct || ""} onChange={(e) => setForm({ ...form, comissao_pct: e.target.value })} />
            </div>
          ) : (
            <div>
              <Label>Valor fixo da plataforma (R$)</Label>
              <Input type="number" min={0} step="0.01" value={form.valor_fixo || ""} onChange={(e) => setForm({ ...form, valor_fixo: e.target.value })} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={!!form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
            <Label>Ativo</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={!form.nome?.trim()}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
