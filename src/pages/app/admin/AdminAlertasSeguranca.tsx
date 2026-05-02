import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Loader2, ShieldAlert, RefreshCw, Search, CheckCircle2,
  AlertTriangle, XCircle, Info, Bell, Eye,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

interface AlertRow {
  id: string;
  tipo: string;
  severidade: string;
  user_id: string | null;
  email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  detalhes: any;
  descricao: string | null;
  lida: boolean;
  lida_por: string | null;
  lida_em: string | null;
  created_at: string;
}

const TIPO_LABEL: Record<string, string> = {
  brute_force: "Brute Force",
  novo_dispositivo: "Novo Dispositivo",
  login_suspeito: "Login Suspeito",
  senha_expirada_ignorada: "Senha Expirada Ignorada",
  multiplas_sessoes: "Múltiplas Sessões",
};

const SEV_CONFIG: Record<string, { icon: typeof AlertTriangle; cls: string; label: string }> = {
  critica: { icon: XCircle, cls: "bg-destructive/15 text-destructive", label: "Crítica" },
  alta: { icon: AlertTriangle, cls: "bg-warning/15 text-warning", label: "Alta" },
  media: { icon: Info, cls: "bg-info/15 text-info", label: "Média" },
  baixa: { icon: Info, cls: "bg-muted text-muted-foreground", label: "Baixa" },
};

export default function AdminAlertasSeguranca() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroSev, setFiltroSev] = useState("todos");
  const [filtroLida, setFiltroLida] = useState("nao_lidas");
  const [detalhe, setDetalhe] = useState<AlertRow | null>(null);

  async function load() {
    setLoading(true);
    let q = supabase
      .from("security_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (filtroLida === "nao_lidas") q = q.eq("lida", false);
    else if (filtroLida === "lidas") q = q.eq("lida", true);
    if (filtroTipo !== "todos") q = q.eq("tipo", filtroTipo);
    if (filtroSev !== "todos") q = q.eq("severidade", filtroSev);

    const { data, error } = await q;
    if (error) toast.error("Erro: " + error.message);
    setAlerts((data as AlertRow[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filtroTipo, filtroSev, filtroLida]);

  async function scanNow() {
    setScanning(true);
    const { data, error } = await supabase.rpc("security_generate_alerts");
    setScanning(false);
    if (error) {
      toast.error("Erro na análise: " + error.message);
      return;
    }
    const result = data as any;
    const count = result?.alertas_gerados ?? 0;
    toast.success(`Análise concluída: ${count} novo(s) alerta(s)`);
    load();
  }

  async function marcarLida(id: string) {
    const { error } = await supabase
      .from("security_alerts")
      .update({ lida: true, lida_em: new Date().toISOString(), lida_por: (await supabase.auth.getUser()).data.user?.id })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Alerta marcado como lido");
    load();
  }

  async function marcarTodasLidas() {
    const ids = alerts.filter(a => !a.lida).map(a => a.id);
    if (ids.length === 0) return;
    const { error } = await supabase
      .from("security_alerts")
      .update({ lida: true, lida_em: new Date().toISOString(), lida_por: (await supabase.auth.getUser()).data.user?.id })
      .in("id", ids);
    if (error) { toast.error(error.message); return; }
    toast.success(`${ids.length} alerta(s) marcados como lidos`);
    load();
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return alerts;
    const t = search.toLowerCase();
    return alerts.filter(a =>
      (a.email ?? "").toLowerCase().includes(t) ||
      (a.descricao ?? "").toLowerCase().includes(t) ||
      (a.ip_address ?? "").toLowerCase().includes(t),
    );
  }, [alerts, search]);

  const naoLidas = alerts.filter(a => !a.lida).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Alertas de Segurança"
          description="Monitore atividades suspeitas detectadas automaticamente no sistema."
        />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
          </Button>
          <Button size="sm" onClick={scanNow} disabled={scanning}>
            {scanning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ShieldAlert className="h-4 w-4 mr-1" />}
            Analisar agora
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard icon={Bell} label="Não lidos" value={naoLidas} accent={naoLidas > 0} />
        <KpiCard icon={AlertTriangle} label="Brute Force" value={alerts.filter(a => a.tipo === "brute_force").length} />
        <KpiCard icon={Info} label="Múltiplas Sessões" value={alerts.filter(a => a.tipo === "multiplas_sessoes").length} />
        <KpiCard icon={CheckCircle2} label="Total resolvidos" value={alerts.filter(a => a.lida).length} />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por email, IP, descrição..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="pl-8 w-72"
          />
        </div>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {Object.entries(TIPO_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroSev} onValueChange={setFiltroSev}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas severidades</SelectItem>
            <SelectItem value="critica">Crítica</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroLida} onValueChange={setFiltroLida}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="nao_lidas">Não lidos</SelectItem>
            <SelectItem value="lidas">Lidos</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
        {naoLidas > 0 && (
          <Button variant="outline" size="sm" onClick={marcarTodasLidas}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> Marcar todas como lidas
          </Button>
        )}
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {filtroLida === "nao_lidas" ? "Nenhum alerta pendente 🎉" : "Nenhum alerta encontrado"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Severidade</TableHead>
                    <TableHead>Email / Usuário</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(a => {
                    const sev = SEV_CONFIG[a.severidade] ?? SEV_CONFIG.baixa;
                    return (
                      <TableRow key={a.id} className={!a.lida ? "bg-warning/5" : ""}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(a.created_at).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {TIPO_LABEL[a.tipo] ?? a.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${sev.cls}`}>
                            <sev.icon className="h-3 w-3" /> {sev.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{a.email ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate" title={a.descricao ?? ""}>
                          {a.descricao ?? "—"}
                        </TableCell>
                        <TableCell>
                          {a.lida
                            ? <Badge variant="outline" className="text-[10px]">Lido</Badge>
                            : <Badge variant="destructive" className="text-[10px]">Pendente</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setDetalhe(a)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!a.lida && (
                              <Button size="sm" variant="outline" onClick={() => marcarLida(a.id)}>
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de detalhe */}
      <Dialog open={!!detalhe} onOpenChange={o => !o && setDetalhe(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhe do Alerta</DialogTitle>
            <DialogDescription>
              {detalhe && (TIPO_LABEL[detalhe.tipo] ?? detalhe.tipo)} — {detalhe && new Date(detalhe.created_at).toLocaleString("pt-BR")}
            </DialogDescription>
          </DialogHeader>
          {detalhe && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
                  <p className="mt-0.5">{detalhe.email ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">IP</p>
                  <p className="mt-0.5 font-mono text-xs">{detalhe.ip_address ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Severidade</p>
                  <p className="mt-0.5 capitalize">{detalhe.severidade}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                  <p className="mt-0.5">{detalhe.lida ? "Lido" : "Pendente"}</p>
                </div>
              </div>
              {detalhe.descricao && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Descrição</p>
                  <p className="mt-1 rounded-md bg-muted/40 p-2">{detalhe.descricao}</p>
                </div>
              )}
              {detalhe.user_agent && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">User Agent</p>
                  <p className="mt-1 rounded-md bg-muted/40 p-2 text-[11px] break-all">{detalhe.user_agent}</p>
                </div>
              )}
              {detalhe.detalhes && Object.keys(detalhe.detalhes).length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Dados técnicos</p>
                  <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-muted/40 p-2 text-[11px]">
                    {JSON.stringify(detalhe.detalhes, null, 2)}
                  </pre>
                </div>
              )}
              {!detalhe.lida && (
                <Button className="w-full" onClick={() => { marcarLida(detalhe.id); setDetalhe(null); }}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar como lido
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent?: boolean }) {
  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${accent ? "text-destructive" : "text-primary"}`} />
      </div>
      <p className={`mt-1 font-display text-2xl font-bold ${accent ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );
}
