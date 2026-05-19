import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Activity, AlertTriangle, CheckCircle2, Clock, FileText, Link2, MessageSquare,
  PlayCircle, RefreshCw, Settings2, Shield, Sparkles, TestTube2, Webhook, XCircle,
  Eye, ListChecks, Map as MapIcon, FileSignature, CreditCard, Bot,
} from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/permissions/RequirePermission";

// ===== Tipos =====
type IntegracaoTipo = "feegow"|"whatsapp"|"google"|"pagamentos"|"ia_provider"|"assinatura_digital"|"eventos_sistema";
type IntegracaoStatus = "nao_configurado"|"aguardando_configuracao"|"conectado"|"erro"|"simulado"|"manutencao";
type EventStatus = "pending"|"processing"|"completed"|"failed"|"cancelled";
type PendenciaStatus = "aberta"|"em_analise"|"resolvida"|"ignorada";

type Integracao = {
  id: string; tipo: IntegracaoTipo; nome: string; descricao: string|null;
  status: IntegracaoStatus; ambiente: string; modo_simulado: boolean; ativo: boolean;
  config: Record<string, unknown>; secrets_keys: string[]|null;
  ultimo_teste_at: string|null; ultimo_teste_ok: boolean|null;
  ultima_sincronizacao_at: string|null; ultimo_erro: string|null;
};

type EventoFila = {
  id: string; event_type: string; entity_type: string|null; entity_id: string|null;
  status: EventStatus; attempts: number; max_attempts: number;
  scheduled_for: string; processed_at: string|null; error_message: string|null;
  created_at: string;
};

type LogTecnico = {
  id: string; integracao: IntegracaoTipo; acao: string; status: string;
  entidade_tipo: string|null; entidade_id_interno: string|null;
  erro: string|null; origem: string; duracao_ms: number|null; created_at: string;
};

type Pendencia = {
  id: string; integracao: IntegracaoTipo; tipo: string; titulo: string;
  descricao: string|null; status: PendenciaStatus; prioridade: string;
  created_at: string; resolvido_at: string|null;
};

type Mapping = {
  id: string; sistema_origem: string; status_interno: string;
  status_externo: string; descricao: string|null; ativo: boolean;
};

// ===== Helpers visuais =====
const STATUS_BADGE: Record<IntegracaoStatus, { label: string; variant: "default"|"secondary"|"destructive"|"outline"; icon: typeof CheckCircle2 }> = {
  nao_configurado: { label: "Não configurado", variant: "secondary", icon: Settings2 },
  aguardando_configuracao: { label: "Aguardando", variant: "outline", icon: Clock },
  conectado: { label: "Conectado", variant: "default", icon: CheckCircle2 },
  erro: { label: "Erro", variant: "destructive", icon: XCircle },
  simulado: { label: "Modo simulado", variant: "outline", icon: TestTube2 },
  manutencao: { label: "Manutenção", variant: "secondary", icon: AlertTriangle },
};

const TIPO_ICON: Record<IntegracaoTipo, typeof MessageSquare> = {
  feegow: FileText, whatsapp: MessageSquare, google: Link2, pagamentos: CreditCard,
  ia_provider: Bot, assinatura_digital: FileSignature, eventos_sistema: Activity,
};

const fmtData = (s: string|null) =>
  !s ? "—" : new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

// ===== Componente principal =====
export default function AdminIntegracoes() {
  const [tab, setTab] = useState("visao");
  const [integracoes, setIntegracoes] = useState<Integracao[]>([]);
  const [dashboard, setDashboard] = useState<Record<string, number>>({});
  const [eventos, setEventos] = useState<EventoFila[]>([]);
  const [logs, setLogs] = useState<LogTecnico[]>([]);
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [filtroEvento, setFiltroEvento] = useState<EventStatus | "todos">("todos");
  const [filtroLogStatus, setFiltroLogStatus] = useState<string>("todos");
  const [selecionada, setSelecionada] = useState<Integracao | null>(null);
  const [loading, setLoading] = useState(false);

  const carregar = async () => {
    setLoading(true);
    const [intg, dash, ev, lg, pend, map] = await Promise.all([
      supabase.from("integracoes_config").select("*").order("nome"),
      supabase.rpc("integracoes_dashboard"),
      supabase.from("event_queue").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("integracoes_logs").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("integracoes_pendencias").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("integracoes_status_mapping").select("*").order("status_interno"),
    ]);
    if (intg.data) setIntegracoes(intg.data as Integracao[]);
    if (dash.data) setDashboard(dash.data as Record<string, number>);
    if (ev.data) setEventos(ev.data as EventoFila[]);
    if (lg.data) setLogs(lg.data as LogTecnico[]);
    if (pend.data) setPendencias(pend.data as Pendencia[]);
    if (map.data) setMappings(map.data as Mapping[]);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const testarConexao = async (intg: Integracao) => {
    toast.loading(`Testando ${intg.nome}...`, { id: "test-" + intg.id });
    try {
      const { data, error } = await supabase.functions.invoke("integracoes-test", {
        body: { tipo: intg.tipo, integracao_id: intg.id },
      });
      if (error) throw error;
      toast.success(data?.mensagem ?? "Teste concluído", { id: "test-" + intg.id });
      carregar();
    } catch (e) {
      toast.error("Falha no teste: " + (e instanceof Error ? e.message : "desconhecido"), { id: "test-" + intg.id });
    }
  };

  const reprocessarEvento = async (id: string) => {
    const { error } = await supabase.rpc("event_reprocessar", { p_event_id: id });
    if (error) toast.error(error.message);
    else { toast.success("Evento reagendado"); carregar(); }
  };

  const eventosFiltrados = useMemo(
    () => filtroEvento === "todos" ? eventos : eventos.filter(e => e.status === filtroEvento),
    [eventos, filtroEvento]
  );
  const logsFiltrados = useMemo(
    () => filtroLogStatus === "todos" ? logs : logs.filter(l => l.status === filtroLogStatus),
    [logs, filtroLogStatus]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central de Integrações"
        description="Configure, monitore e teste todas as conexões externas da plataforma."
        actions={
          <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <KpiMini icon={CheckCircle2} label="Conectadas" value={dashboard.conectadas ?? 0} tone="success" />
        <KpiMini icon={TestTube2} label="Simuladas" value={dashboard.simuladas ?? 0} tone="warning" />
        <KpiMini icon={XCircle} label="Em erro" value={dashboard.erros ?? 0} tone="destructive" />
        <KpiMini icon={Activity} label="Eventos pendentes" value={dashboard.eventos_pendentes ?? 0} tone="info" />
        <KpiMini icon={AlertTriangle} label="Pendências críticas" value={dashboard.pendencias_criticas ?? 0} tone="destructive" />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="visao"><ListChecks className="mr-1.5 h-4 w-4" />Visão geral</TabsTrigger>
          <TabsTrigger value="eventos"><Activity className="mr-1.5 h-4 w-4" />Eventos do sistema</TabsTrigger>
          <TabsTrigger value="logs"><Eye className="mr-1.5 h-4 w-4" />Logs técnicos</TabsTrigger>
          <TabsTrigger value="pendencias"><AlertTriangle className="mr-1.5 h-4 w-4" />Pendências</TabsTrigger>
          <TabsTrigger value="mapeamento"><MapIcon className="mr-1.5 h-4 w-4" />Mapeamento de status</TabsTrigger>
        </TabsList>

        {/* VISÃO GERAL */}
        <TabsContent value="visao" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {integracoes.map(i => <CardIntegracao key={i.id} intg={i} onTestar={testarConexao} onConfig={setSelecionada} />)}
          </div>
        </TabsContent>

        {/* EVENTOS */}
        <TabsContent value="eventos" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Fila de eventos</CardTitle>
                <CardDescription>Eventos disparados pelo sistema, automações e webhooks.</CardDescription>
              </div>
              <Select value={filtroEvento} onValueChange={(v) => setFiltroEvento(v as EventStatus | "todos")}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="processing">Processando</SelectItem>
                  <SelectItem value="completed">Concluídos</SelectItem>
                  <SelectItem value="failed">Com erro</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tentativas</TableHead>
                    <TableHead>Agendado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventosFiltrados.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum evento encontrado.</TableCell></TableRow>
                  )}
                  {eventosFiltrados.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs">{e.event_type}</TableCell>
                      <TableCell className="text-xs">{e.entity_type ?? "—"} {e.entity_id ? `· ${e.entity_id.slice(0,8)}` : ""}</TableCell>
                      <TableCell><BadgeEvento status={e.status} /></TableCell>
                      <TableCell className="text-xs">{e.attempts}/{e.max_attempts}</TableCell>
                      <TableCell className="text-xs">{fmtData(e.scheduled_for)}</TableCell>
                      <TableCell className="text-right">
                        {(e.status === "failed" || e.status === "cancelled") && (
                          <RequirePermission perm="integracoes.reprocessar_eventos">
                            <Button size="sm" variant="ghost" onClick={() => reprocessarEvento(e.id)}>
                              <PlayCircle className="mr-1 h-3.5 w-3.5" />Reprocessar
                            </Button>
                          </RequirePermission>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LOGS */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Logs técnicos</CardTitle>
                <CardDescription>Cada chamada às integrações é registrada (sem expor tokens).</CardDescription>
              </div>
              <Select value={filtroLogStatus} onValueChange={setFiltroLogStatus}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="warning">Aviso</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Integração</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Duração</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsFiltrados.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sem logs ainda.</TableCell></TableRow>
                  )}
                  {logsFiltrados.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{fmtData(l.created_at)}</TableCell>
                      <TableCell className="text-xs capitalize">{l.integracao}</TableCell>
                      <TableCell className="font-mono text-xs">{l.acao}</TableCell>
                      <TableCell><BadgeLog status={l.status} /></TableCell>
                      <TableCell className="text-xs">{l.origem}</TableCell>
                      <TableCell className="text-xs">{l.duracao_ms ? `${l.duracao_ms}ms` : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PENDÊNCIAS */}
        <TabsContent value="pendencias" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pendências de integração</CardTitle>
              <CardDescription>Registros que precisam de atenção operacional manual.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Integração</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aberta em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendencias.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma pendência aberta. ✨</TableCell></TableRow>
                  )}
                  {pendencias.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs capitalize">{p.integracao}</TableCell>
                      <TableCell className="text-xs">{p.tipo}</TableCell>
                      <TableCell className="text-sm">{p.titulo}</TableCell>
                      <TableCell><Badge variant={p.prioridade === "critica" ? "destructive" : p.prioridade === "alta" ? "default" : "secondary"}>{p.prioridade}</Badge></TableCell>
                      <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                      <TableCell className="text-xs">{fmtData(p.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MAPEAMENTO */}
        <TabsContent value="mapeamento" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mapeamento de status</CardTitle>
              <CardDescription>Correspondência entre status internos e status dos sistemas externos.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sistema</TableHead>
                    <TableHead>Status interno</TableHead>
                    <TableHead>Status externo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Ativo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs capitalize">{m.sistema_origem}</TableCell>
                      <TableCell><Badge variant="outline" className="font-mono text-xs">{m.status_interno}</Badge></TableCell>
                      <TableCell className="text-sm">{m.status_externo}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.descricao ?? "—"}</TableCell>
                      <TableCell><Switch checked={m.ativo} disabled /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sheet de configuração */}
      <SheetConfig integracao={selecionada} onClose={() => setSelecionada(null)} onSaved={carregar} onTestar={testarConexao} />
    </div>
  );
}

// ===== Subcomponentes =====
function KpiMini({ icon: Icon, label, value, tone }: {
  icon: typeof CheckCircle2; label: string; value: number;
  tone: "success"|"warning"|"destructive"|"info";
}) {
  const toneClass = {
    success: "text-success", warning: "text-warning",
    destructive: "text-destructive", info: "text-primary",
  }[tone];
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-md bg-muted p-2 ${toneClass}`}><Icon className="h-4 w-4" /></div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function CardIntegracao({ intg, onTestar, onConfig }: {
  intg: Integracao; onTestar: (i: Integracao) => void; onConfig: (i: Integracao) => void;
}) {
  const Icon = TIPO_ICON[intg.tipo];
  const badge = STATUS_BADGE[intg.status];
  const BadgeIcon = badge.icon;
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></div>
            <div>
              <CardTitle className="text-base">{intg.nome}</CardTitle>
              <CardDescription className="text-xs">{intg.descricao}</CardDescription>
            </div>
          </div>
          <Badge variant={badge.variant} className="shrink-0">
            <BadgeIcon className="mr-1 h-3 w-3" />{badge.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-muted-foreground">Último teste</div>
            <div>{fmtData(intg.ultimo_teste_at)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Última sincronização</div>
            <div>{fmtData(intg.ultima_sincronizacao_at)}</div>
          </div>
        </div>
        {intg.ultimo_erro && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
            <AlertTriangle className="mr-1 inline h-3 w-3" />{intg.ultimo_erro}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs">{intg.ambiente}</Badge>
          {intg.modo_simulado && <Badge variant="outline" className="text-xs"><TestTube2 className="mr-1 h-3 w-3" />Simulado</Badge>}
          {!intg.ativo && <Badge variant="outline" className="text-xs">Pausada</Badge>}
        </div>
        {intg.secrets_keys && intg.secrets_keys.length > 0 && intg.status !== "conectado" && (
          <div className="rounded-md border border-warning/30 bg-warning/5 p-2 text-xs text-warning">
            <Shield className="mr-1 inline h-3 w-3" />
            Secrets pendentes: {intg.secrets_keys.join(", ")}
          </div>
        )}
      </CardContent>
      <div className="flex gap-2 border-t border-border p-3">
        <Button size="sm" variant="outline" className="flex-1" onClick={() => onConfig(intg)}>
          <Settings2 className="mr-1.5 h-3.5 w-3.5" />Configurar
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onTestar(intg)}>
          <TestTube2 className="mr-1.5 h-3.5 w-3.5" />Testar
        </Button>
      </div>
    </Card>
  );
}

function BadgeEvento({ status }: { status: EventStatus }) {
  const map: Record<EventStatus, { label: string; variant: "default"|"secondary"|"destructive"|"outline" }> = {
    pending: { label: "Pendente", variant: "outline" },
    processing: { label: "Processando", variant: "secondary" },
    completed: { label: "Concluído", variant: "default" },
    failed: { label: "Falhou", variant: "destructive" },
    cancelled: { label: "Cancelado", variant: "secondary" },
  };
  return <Badge variant={map[status].variant}>{map[status].label}</Badge>;
}

function BadgeLog({ status }: { status: string }) {
  const variant: "default"|"secondary"|"destructive"|"outline" =
    status === "error" ? "destructive" : status === "warning" ? "outline" :
    status === "success" ? "default" : "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}

function SheetConfig({ integracao, onClose, onSaved, onTestar }: {
  integracao: Integracao | null;
  onClose: () => void;
  onSaved: () => void;
  onTestar: (i: Integracao) => void;
}) {
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [ambiente, setAmbiente] = useState("sandbox");
  const [modoSimulado, setModoSimulado] = useState(true);
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    if (integracao) {
      setConfig(integracao.config || {});
      setAmbiente(integracao.ambiente);
      setModoSimulado(integracao.modo_simulado);
      setAtivo(integracao.ativo);
    }
  }, [integracao]);

  if (!integracao) return null;

  const salvar = async () => {
    const { error } = await supabase
      .from("integracoes_config")
      .update({ config: config as never, ambiente, modo_simulado: modoSimulado, ativo })
      .eq("id", integracao.id);
    if (error) toast.error(error.message);
    else { toast.success("Configuração salva"); onSaved(); onClose(); }
  };

  return (
    <Sheet open={!!integracao} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{integracao.nome}</SheetTitle>
          <SheetDescription>{integracao.descricao}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Geral */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Geral</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Ambiente</Label>
                <Select value={ambiente} onValueChange={setAmbiente}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                    <SelectItem value="teste">Teste</SelectItem>
                    <SelectItem value="producao">Produção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={modoSimulado} onCheckedChange={setModoSimulado} id="sim" />
                <Label htmlFor="sim" className="text-sm">Modo simulado</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={ativo} onCheckedChange={setAtivo} id="ativo" />
                <Label htmlFor="ativo" className="text-sm">Integração ativa</Label>
              </div>
            </div>
          </div>

          {/* Campos específicos por tipo */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Configuração específica</h3>
            <CamposPorTipo tipo={integracao.tipo} config={config} onChange={setConfig} />
            <p className="rounded-md border border-warning/30 bg-warning/5 p-2 text-xs text-warning">
              <Shield className="mr-1 inline h-3 w-3" />
              Tokens e chaves secretas nunca aparecem aqui — devem ser cadastrados nos Secrets do Lovable Cloud.
              Esta tela guarda apenas configurações não-sensíveis.
            </p>
          </div>

          {/* Status */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Status atual</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Info label="Status">{integracao.status}</Info>
              <Info label="Último teste">{fmtData(integracao.ultimo_teste_at)}</Info>
              <Info label="Última sincronização">{fmtData(integracao.ultima_sincronizacao_at)}</Info>
              <Info label="Último resultado">{integracao.ultimo_teste_ok === null ? "—" : integracao.ultimo_teste_ok ? "✓ OK" : "✗ Falha"}</Info>
            </div>
          </div>

          {/* Aviso integrações futuras */}
          {(integracao.tipo === "feegow" || integracao.tipo === "whatsapp" || integracao.tipo === "assinatura_digital") && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-foreground">
              <Sparkles className="mr-1 inline h-3 w-3 text-primary" />
              <strong>Integração ainda não ativada.</strong> Toda a arquitetura, telas e edge functions já estão prontas.
              Quando ativarmos as credenciais reais, as chamadas começam a funcionar sem alterar a UI.
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onTestar(integracao)}>
              <TestTube2 className="mr-2 h-4 w-4" />Testar conexão
            </Button>
            <Button onClick={salvar} className="flex-1">Salvar configuração</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function CamposPorTipo({ tipo, config, onChange }: {
  tipo: IntegracaoTipo; config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const set = (k: string, v: unknown) => onChange({ ...config, [k]: v });

  switch (tipo) {
    case "feegow":
      return (
        <div className="grid gap-3">
          <Field label="URL base" value={config.url_base as string} onChange={(v) => set("url_base", v)} placeholder="https://api.feegow.com/v1" />
          <Field label="Timeout (ms)" type="number" value={config.timeout as number} onChange={(v) => set("timeout", Number(v))} placeholder="15000" />
          <Field label="Máx. tentativas" type="number" value={config.max_retries as number} onChange={(v) => set("max_retries", Number(v))} placeholder="3" />
          <p className="text-xs text-muted-foreground">Token Feegow é configurado em Secrets como <code>FEEGOW_TOKEN</code>.</p>
        </div>
      );
    case "whatsapp":
      return (
        <div className="grid gap-3">
          <Field label="Número padrão" value={config.numero_padrao as string} onChange={(v) => set("numero_padrao", v)} placeholder="+55 11 9..." />
          <Field label="Phone Number ID" value={config.phone_number_id as string} onChange={(v) => set("phone_number_id", v)} />
          <Field label="WhatsApp Business Account ID" value={config.waba_id as string} onChange={(v) => set("waba_id", v)} />
          <Field label="Webhook URL (informativo)" value={config.webhook_url as string} onChange={(v) => set("webhook_url", v)} placeholder="/whatsapp-webhook" />
          <p className="text-xs text-muted-foreground">Token Meta em Secrets: <code>META_WHATSAPP_TOKEN</code>. Caixas adicionais são geridas em <em>WhatsApp Business API</em>.</p>
        </div>
      );
    case "google":
      return (
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label>Modo</Label>
            <Select value={(config.modo as string) ?? "manual"} onValueChange={(v) => set("modo", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Link fixo por médico</SelectItem>
                <SelectItem value="agenda">Google Agenda conectado</SelectItem>
                <SelectItem value="meet_dinamico">Google Meet dinâmico (futuro)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Field label="Email Google da clínica" value={config.email as string} onChange={(v) => set("email", v)} />
          <p className="text-xs text-muted-foreground">OAuth do Google será configurado por médico, em <em>Configurações</em>.</p>
        </div>
      );
    case "pagamentos":
      return (
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label>Provider ativo</Label>
            <Select value={(config.provider as string) ?? "stripe"} onValueChange={(v) => set("provider", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="pix">Pix gateway (futuro)</SelectItem>
                <SelectItem value="manual">Pagamento manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Field label="Moeda padrão" value={(config.moeda as string) ?? "BRL"} onChange={(v) => set("moeda", v)} />
          <Field label="Webhook (informativo)" value={config.webhook_url as string} onChange={(v) => set("webhook_url", v)} placeholder="/payments-webhook" />
          <p className="text-xs text-muted-foreground">Stripe usa Secrets gerenciados pelo Lovable Cloud (sandbox e live).</p>
        </div>
      );
    case "ia_provider":
      return (
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label>Provider ativo</Label>
            <Select value={(config.provider as string) ?? "lovable"} onValueChange={(v) => set("provider", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lovable">Lovable AI Gateway (Gemini)</SelectItem>
                <SelectItem value="openai">OpenAI / ChatGPT (futuro)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Field label="Modelo padrão" value={(config.modelo as string) ?? "google/gemini-2.5-flash"} onChange={(v) => set("modelo", v)} />
          <Field label="Limite mensal (tokens)" type="number" value={config.limite_mensal as number} onChange={(v) => set("limite_mensal", Number(v))} />
          <div className="space-y-1.5">
            <Label>Prompt base</Label>
            <Textarea
              value={(config.prompt_base as string) ?? ""}
              onChange={(e) => set("prompt_base", e.target.value)}
              rows={4}
              placeholder="Você é a assistente da Nova Saúde..."
            />
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-2 text-xs text-muted-foreground">
            <strong>Regras de segurança:</strong> IA nunca acessa código, nunca inicia conversa, nunca decide ações administrativas críticas, transfere para humano em casos sensíveis.
          </div>
        </div>
      );
    case "assinatura_digital":
      return (
        <div className="grid gap-3">
          <Field label="Provider" value={config.provider as string} onChange={(v) => set("provider", v)} placeholder="ICP-Brasil / outro" />
          <Field label="Tipo de assinatura" value={config.tipo_assinatura as string} onChange={(v) => set("tipo_assinatura", v)} placeholder="A1 / A3" />
          <p className="text-xs text-muted-foreground">Integração futura — médicos seguem usando Feegow/documentos externos por enquanto.</p>
        </div>
      );
    case "eventos_sistema":
      return (
        <div className="grid gap-3">
          <Field label="Máx. tentativas padrão" type="number" value={(config.max_attempts as number) ?? 5} onChange={(v) => set("max_attempts", Number(v))} />
          <Field label="Janela de retry (segundos)" type="number" value={(config.retry_window as number) ?? 60} onChange={(v) => set("retry_window", Number(v))} />
          <p className="text-xs text-muted-foreground">Fila interna que conecta Feegow, WhatsApp, financeiro, agenda, IA e automações.</p>
        </div>
      );
  }
}

function Field({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string|number|undefined;
  onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
