import { useEffect, useState } from "react";
import { Banknote, CheckCircle2, Clock, XCircle, AlertTriangle, Loader2, Eye, Download, Settings, RotateCcw } from "lucide-react";
import { RequirePermission } from "@/components/permissions/RequirePermission";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { brl, mascarar, getSaqueConfig, type SaqueConfig } from "@/lib/saques";
import { toast } from "sonner";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  solicitado: { label: "Solicitado", cls: "border-warning/40 text-warning" },
  em_analise: { label: "Em análise", cls: "border-info/40 text-info" },
  correcao_solicitada: { label: "Correção solicitada", cls: "border-warning/40 text-warning" },
  aprovado: { label: "Aprovado", cls: "border-success/40 text-success" },
  pago: { label: "Pago", cls: "border-success/40 text-success" },
  recusado: { label: "Recusado", cls: "border-destructive/40 text-destructive" },
  cancelado: { label: "Cancelado", cls: "border-muted text-muted-foreground" },
};

export default function AdminSaquesMedicos() {
  const [saques, setSaques] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [detalheSaque, setDetalheSaque] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [recusarId, setRecusarId] = useState<string | null>(null);
  const [correcaoId, setCorrecaoId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [configOpen, setConfigOpen] = useState(false);
  const [config, setConfig] = useState<SaqueConfig | null>(null);
  const [configAnterior, setConfigAnterior] = useState<SaqueConfig | null>(null);

  useEffect(() => { load(); loadConfig(); }, [filtroStatus]);

  async function loadConfig() {
    const cfg = await getSaqueConfig();
    setConfig(cfg);
  }

  async function load() {
    setLoading(true);
    let q = supabase
      .from("saques_medicos")
      .select(`
        *, medicos:medico_id (nome, crm, crm_estado, cpf),
        medico_dados_bancarios:dados_bancarios_id (titular_nome, banco, pix_chave, conta, agencia)
      `)
      .order("solicitado_em", { ascending: false })
      .limit(200);
    if (filtroStatus !== "todos") q = q.eq("status", filtroStatus as any);
    const { data } = await q;
    setSaques(data ?? []);
    setLoading(false);
  }

  async function mudarStatus(id: string, status: string, extra?: Record<string, any>) {
    const upd: any = { status, ...extra };
    if (status === "aprovado") upd.aprovado_em = new Date().toISOString();
    if (status === "pago") upd.pago_em = new Date().toISOString();
    if (status === "recusado") upd.recusado_em = new Date().toISOString();
    const { error } = await supabase.from("saques_medicos").update(upd).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Saque ${status}`);
    load();
  }

  async function openDetalhe(saque: any) {
    // Carregar itens
    const { data: itens } = await supabase
      .from("saque_medico_itens")
      .select("*, consultas_financeiro:consulta_financeiro_id (data_consulta, servico_nome_snapshot, valor_bruto_centavos)")
      .eq("saque_id", saque.id);
    // Carregar NFes
    const { data: nfes } = await supabase
      .from("medico_nfes")
      .select("*")
      .eq("saque_id", saque.id);
    setDetalheSaque({ ...saque, itens: itens ?? [], nfes: nfes ?? [] });
    setSheetOpen(true);
  }

  const kpis = {
    solicitados: saques.filter(s => s.status === "solicitado" || s.status === "em_analise").reduce((a, s) => a + s.valor_centavos, 0),
    aprovados: saques.filter(s => s.status === "aprovado").reduce((a, s) => a + s.valor_centavos, 0),
    pagos: saques.filter(s => s.status === "pago").reduce((a, s) => a + s.valor_centavos, 0),
    pendentes: saques.filter(s => s.status === "solicitado" || s.status === "em_analise").length,
  };

  async function salvarConfig() {
    if (!config) return;
    const updates = [
      { key: "financeiro.saque.frequencia", value: JSON.stringify(config.frequencia) },
      { key: "financeiro.saque.dias_fechamento", value: JSON.stringify(config.dias_fechamento) },
      { key: "financeiro.saque.prazo_liberacao_dias", value: JSON.stringify(config.prazo_liberacao_dias) },
      { key: "financeiro.saque.valor_minimo_centavos", value: JSON.stringify(config.valor_minimo_centavos) },
      { key: "financeiro.saque.exigir_nfe", value: JSON.stringify(config.exigir_nfe) },
      { key: "financeiro.saque.permitir_parcial", value: JSON.stringify(config.permitir_parcial) },
    ];
    for (const u of updates) {
      await supabase.from("app_settings").upsert(u, { onConflict: "key" });
    }
    toast.success("Configurações de saque salvas");
    setConfigOpen(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Saques Médicos"
        description="Gerencie solicitações de saque dos médicos."
        actions={
          <Button variant="outline" onClick={() => setConfigOpen(true)}>
            <Settings className="mr-2 h-4 w-4" /> Configurar regras
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Total solicitado" value={brl(kpis.solicitados)} icon={Clock} />
        <StatCard label="Total aprovado" value={brl(kpis.aprovados)} icon={CheckCircle2} />
        <StatCard label="Total pago" value={brl(kpis.pagos)} icon={Banknote} />
        <StatCard label="Pendentes" value={kpis.pendentes.toString()} icon={AlertTriangle} />
      </div>

      {/* Filtros */}
      <div className="card-elevated p-4 flex flex-wrap gap-2 items-center">
        <Label className="text-xs">Status:</Label>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="solicitado">Solicitado</SelectItem>
            <SelectItem value="em_analise">Em análise</SelectItem>
            <SelectItem value="aprovado">Aprovado</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="recusado">Recusado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <div className="card-elevated overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : saques.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center p-8">Nenhum saque encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Médico</th>
                  <th className="px-4 py-2 text-right">Valor</th>
                  <th className="px-4 py-2 text-left">Método</th>
                  <th className="px-4 py-2 text-left">Banco</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Data</th>
                  <th className="px-4 py-2 text-left">Ações</th>
                </tr>
              </thead>
              <tbody>
                {saques.map(s => {
                  const st = STATUS_MAP[s.status] ?? { label: s.status, cls: "" };
                  const med = s.medicos as any;
                  const banco = s.medico_dados_bancarios as any;
                  return (
                    <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-2.5">
                        <div>{med?.nome ?? "—"}</div>
                        <div className="text-[11px] text-muted-foreground">{med?.crm}/{med?.crm_estado}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold">{brl(s.valor_centavos)}</td>
                      <td className="px-4 py-2.5 uppercase text-xs">{s.metodo}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {banco ? `${banco.banco} · Ag ${mascarar(banco.agencia ?? "")} · Cc ${mascarar(banco.conta ?? "")}` : "—"}
                      </td>
                      <td className="px-4 py-2.5"><Badge variant="outline" className={st.cls}>{st.label}</Badge></td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {new Date(s.solicitado_em).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => openDetalhe(s)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {(s.status === "solicitado" || s.status === "em_analise") && (
                            <>
                              <Button size="sm" variant="outline" className="text-success border-success/40"
                                onClick={() => mudarStatus(s.id, "aprovado")}>Aprovar</Button>
                              <Button size="sm" variant="outline" className="text-destructive border-destructive/40"
                                onClick={() => { setRecusarId(s.id); setMotivo(""); }}>Recusar</Button>
                            </>
                          )}
                          {s.status === "aprovado" && (
                            <Button size="sm" variant="outline" className="text-success border-success/40"
                              onClick={() => mudarStatus(s.id, "pago")}>Marcar pago</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialog Recusar */}
      <Dialog open={!!recusarId} onOpenChange={() => setRecusarId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Recusar saque</DialogTitle></DialogHeader>
          <div><Label>Motivo da recusa</Label><Textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecusarId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => {
              if (recusarId) mudarStatus(recusarId, "recusado", { motivo_recusa: motivo });
              setRecusarId(null);
            }}>Confirmar recusa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet Detalhe */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[500px] overflow-y-auto">
          <SheetHeader><SheetTitle>Detalhe do saque</SheetTitle></SheetHeader>
          {detalheSaque && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground text-xs">Médico:</span><p className="font-medium">{detalheSaque.medicos?.nome}</p></div>
                <div><span className="text-muted-foreground text-xs">CPF:</span><p className="font-medium">{mascarar(detalheSaque.medicos?.cpf ?? "")}</p></div>
                <div><span className="text-muted-foreground text-xs">Valor:</span><p className="font-semibold text-lg">{brl(detalheSaque.valor_centavos)}</p></div>
                <div><span className="text-muted-foreground text-xs">Método:</span><p className="uppercase">{detalheSaque.metodo}</p></div>
                <div><span className="text-muted-foreground text-xs">Status:</span>
                  <Badge variant="outline" className={STATUS_MAP[detalheSaque.status]?.cls}>{STATUS_MAP[detalheSaque.status]?.label}</Badge>
                </div>
              </div>

              {detalheSaque.medico_dados_bancarios && (
                <div className="rounded-lg border border-border p-3 text-xs space-y-1">
                  <h4 className="font-semibold text-sm mb-2">Dados bancários</h4>
                  <p><b>Titular:</b> {detalheSaque.medico_dados_bancarios.titular_nome}</p>
                  <p><b>Banco:</b> {detalheSaque.medico_dados_bancarios.banco}</p>
                  <p><b>Agência:</b> {detalheSaque.medico_dados_bancarios.agencia}</p>
                  <p><b>Conta:</b> {detalheSaque.medico_dados_bancarios.conta}</p>
                  <p><b>Pix:</b> {detalheSaque.medico_dados_bancarios.pix_chave ?? "Não informado"}</p>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold mb-2">Consultas incluídas ({detalheSaque.itens.length})</h4>
                {detalheSaque.itens.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum item vinculado.</p>
                ) : (
                  <div className="space-y-1">
                    {detalheSaque.itens.map((it: any) => (
                      <div key={it.id} className="flex justify-between text-xs border-b border-border py-1.5">
                        <span>{it.consultas_financeiro?.servico_nome_snapshot ?? "Consulta"} — {it.consultas_financeiro?.data_consulta ? new Date(it.consultas_financeiro.data_consulta).toLocaleDateString("pt-BR") : ""}</span>
                        <span className="font-mono">{brl(it.valor_medico_centavos)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {detalheSaque.nfes.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">NFe anexada</h4>
                  {detalheSaque.nfes.map((nfe: any) => (
                    <a key={nfe.id} href={nfe.arquivo_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <Download className="h-3 w-3" /> Baixar NFe
                    </a>
                  ))}
                </div>
              )}

              {detalheSaque.observacao && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Observação</h4>
                  <p className="text-xs text-muted-foreground">{detalheSaque.observacao}</p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Config Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Regras de liberação de saque</DialogTitle></DialogHeader>
          {config && (
            <div className="space-y-4">
              <div>
                <Label>Frequência</Label>
                <Select value={config.frequencia} onValueChange={v => setConfig({ ...config, frequencia: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="quinzenal">Quinzenal</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Dias de fechamento (separados por vírgula)</Label>
                <Input value={config.dias_fechamento.join(", ")}
                  onChange={e => setConfig({ ...config, dias_fechamento: e.target.value.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n)) })} />
              </div>
              <div>
                <Label>Prazo de segurança (dias)</Label>
                <Input type="number" value={config.prazo_liberacao_dias}
                  onChange={e => setConfig({ ...config, prazo_liberacao_dias: parseInt(e.target.value) || 7 })} />
              </div>
              <div>
                <Label>Valor mínimo para saque (centavos)</Label>
                <Input type="number" value={config.valor_minimo_centavos}
                  onChange={e => setConfig({ ...config, valor_minimo_centavos: parseInt(e.target.value) || 5000 })} />
                <p className="text-[11px] text-muted-foreground mt-1">Atualmente: {brl(config.valor_minimo_centavos)}</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={config.exigir_nfe}
                  onChange={e => setConfig({ ...config, exigir_nfe: e.target.checked })} id="exigir-nfe" />
                <label htmlFor="exigir-nfe" className="text-sm">Exigir NFe antes de aprovar saque</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={config.permitir_parcial}
                  onChange={e => setConfig({ ...config, permitir_parcial: e.target.checked })} id="parcial" />
                <label htmlFor="parcial" className="text-sm">Permitir saque parcial</label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancelar</Button>
            <Button onClick={salvarConfig} className="bg-gradient-primary">Salvar configurações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
