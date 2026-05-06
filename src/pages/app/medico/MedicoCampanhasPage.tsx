import { useEffect, useState } from "react";
import { brl } from "@/lib/format";
import {
  Megaphone, Plus, Pause, Play, X, Eye, MousePointerClick,
  ArrowUpRight, Loader2, TrendingUp, DollarSign, Target,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useSession } from "@/lib/session";
import { useMedicoAtual } from "@/lib/useMedicoAtual";
import {
  listarCampanhasMedico, criarCampanha, atualizarStatusCampanha,
  getSaldoAtual, getMedicoPremium, getAssinaturaPremium,
  listarMetricasDiarias, getConversoesPorCampanha,
  type ImpulsionamentoCampanha, type CampanhaMetricaDiaria,
} from "@/lib/gamificacao";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  ativa: { label: "Ativa", color: "bg-success text-white" },
  pausada: { label: "Pausada", color: "bg-warning text-white" },
  encerrada: { label: "Encerrada", color: "bg-muted text-muted-foreground" },
  cancelada: { label: "Cancelada", color: "bg-destructive text-white" },
};

export default function MedicoCampanhasPage() {
  const { session } = useSession();
  const { medico: medicoAtual } = useMedicoAtual();
  const [loading, setLoading] = useState(true);
  const [medicoId, setMedicoId] = useState<string | null>(null);
  const [campanhas, setCampanhas] = useState<ImpulsionamentoCampanha[]>([]);
  const [conversoes, setConversoes] = useState<Record<string, number>>({});
  const [saldo, setSaldo] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [plano, setPlano] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [metricas, setMetricas] = useState<CampanhaMetricaDiaria[]>([]);

  // Form
  const [titulo, setTitulo] = useState("");
  const [orcamento, setOrcamento] = useState("");
  const [cpc, setCpc] = useState("");
  const [creating, setCreating] = useState(false);

  const maxCampanhas = plano === "enterprise" ? 999 : plano === "profissional" ? 3 : 1;
  const ativas = campanhas.filter(c => c.status === "ativa").length;

  useEffect(() => {
    if (!session) return;
    (async () => {
      setLoading(true);
      const medico = medicoAtual;
      if (!medico) { setLoading(false); return; }
      setMedicoId(medico.id);
      const [camps, s, p, a, conv] = await Promise.all([
        listarCampanhasMedico(medico.id),
        getSaldoAtual(medico.id),
        getMedicoPremium(medico.id),
        getAssinaturaPremium(medico.id),
        getConversoesPorCampanha(),
      ]);
      setCampanhas(camps);
      setSaldo(s);
      setIsPremium(p?.ativo ?? false);
      setPlano(a?.plano ?? null);
      setConversoes(conv);
      setLoading(false);
    })();
  }, [session]);

  const handleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    try {
      const m = await listarMetricasDiarias(id);
      setMetricas(m);
    } catch { setMetricas([]); }
  };

  const handleCreate = async () => {
    if (!medicoId || !titulo.trim() || !orcamento) return;
    if (ativas >= maxCampanhas) {
      toast.error(`Limite de ${maxCampanhas} campanha(s) ativa(s) atingido`);
      return;
    }
    setCreating(true);
    try {
      await criarCampanha({
        medico_id: medicoId,
        titulo: titulo.trim(),
        orcamento_centavos: Math.round(parseFloat(orcamento) * 100),
        cpc_centavos: cpc ? Math.round(parseFloat(cpc) * 100) : undefined,
      });
      toast.success("Campanha criada!");
      setShowNew(false);
      setTitulo(""); setOrcamento(""); setCpc("");
      const camps = await listarCampanhasMedico(medicoId);
      setCampanhas(camps);
      const s = await getSaldoAtual(medicoId);
      setSaldo(s);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar campanha");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (c: ImpulsionamentoCampanha) => {
    const next = c.status === "ativa" ? "pausada" : "ativa";
    try {
      await atualizarStatusCampanha(c.id, next);
      toast.success(next === "ativa" ? "Campanha retomada" : "Campanha pausada");
      setCampanhas(prev => prev.map(x => x.id === c.id ? { ...x, status: next } : x));
    } catch { toast.error("Erro ao atualizar"); }
  };

  const handleCancel = async (c: ImpulsionamentoCampanha) => {
    try {
      await atualizarStatusCampanha(c.id, "cancelada");
      toast.success("Campanha cancelada");
      setCampanhas(prev => prev.map(x => x.id === c.id ? { ...x, status: "cancelada" } : x));
    } catch { toast.error("Erro ao cancelar"); }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-20 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…</div>;
  }

  if (!isPremium) {
    return (
      <div className="space-y-6">
        <PageHeader title="Campanhas" description="Gerencie suas campanhas CPC" />
        <div className="card-elevated p-10 text-center space-y-4">
          <Megaphone className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="font-display text-xl font-bold">Recurso Premium</h2>
          <p className="text-muted-foreground">Assine o Premium para criar e gerenciar campanhas de impulsionamento.</p>
          <Button onClick={() => window.location.href = "/app/medico/premium"}>Ver planos Premium</Button>
        </div>
      </div>
    );
  }

  // KPIs
  const totalCliques = campanhas.reduce((s, c) => s + c.cliques, 0);
  const totalImpressoes = campanhas.reduce((s, c) => s + c.impressoes, 0);
  const totalGasto = campanhas.reduce((s, c) => s + c.gasto_centavos, 0);
  const totalConversoes = Object.values(conversoes).reduce((s, v) => s + v, 0);
  const ctr = totalImpressoes > 0 ? ((totalCliques / totalImpressoes) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campanhas"
        description="Gerencie suas campanhas CPC de impulsionamento"
        actions={
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm">Saldo: {saldo} pts</Badge>
            <Dialog open={showNew} onOpenChange={setShowNew}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-1.5 h-4 w-4" /> Nova Campanha</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova Campanha CPC</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div><Label>Título</Label><Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Campanha Março" /></div>
                  <div><Label>Orçamento (R$)</Label><Input type="number" min="1" step="0.01" value={orcamento} onChange={e => setOrcamento(e.target.value)} placeholder="50.00" /></div>
                  <div><Label>CPC personalizado (R$) — opcional</Label><Input type="number" min="0.01" step="0.01" value={cpc} onChange={e => setCpc(e.target.value)} placeholder="Padrão do sistema" /></div>
                  <p className="text-xs text-muted-foreground">Ativas: {ativas}/{maxCampanhas} — Plano {plano}</p>
                  <Button className="w-full" disabled={creating || !titulo.trim() || !orcamento} onClick={handleCreate}>
                    {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Criar campanha
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-5">
        {[
          { icon: Eye, label: "Impressões", value: totalImpressoes.toLocaleString() },
          { icon: MousePointerClick, label: "Cliques", value: totalCliques.toLocaleString() },
          { icon: Target, label: "CTR", value: `${ctr}%` },
          { icon: ArrowUpRight, label: "Conversões", value: totalConversoes.toString() },
          { icon: DollarSign, label: "Investido", value: brl(totalGasto) },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="card-elevated p-4 text-center">
            <Icon className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Campaigns list */}
      <div className="space-y-3">
        {campanhas.length === 0 ? (
          <div className="card-elevated p-8 text-center text-muted-foreground">Nenhuma campanha ainda. Crie sua primeira!</div>
        ) : campanhas.map((c) => {
          const st = STATUS_MAP[c.status] ?? STATUS_MAP.encerrada;
          const conv = conversoes[c.id] || 0;
          const orcPercent = c.orcamento_centavos > 0 ? Math.min(100, (c.gasto_centavos / c.orcamento_centavos) * 100) : 0;
          const isExpanded = expandedId === c.id;

          return (
            <div key={c.id} className="card-elevated">
              <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => handleExpand(c.id)}>
                <Megaphone className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{c.titulo}</p>
                    <Badge className={cn("text-[10px]", st.color)}>{st.label}</Badge>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                    <span>{c.impressoes} imp</span>
                    <span>{c.cliques} cliq</span>
                    <span>{conv} conv</span>
                    <span>CPC {brl(c.cpc_centavos)}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{brl(c.gasto_centavos)} / {brl(c.orcamento_centavos)}</p>
                  <div className="w-20 h-1.5 bg-muted rounded-full mt-1">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${orcPercent}%` }} />
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {(c.status === "ativa" || c.status === "pausada") && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={e => { e.stopPropagation(); handleToggle(c); }}>
                      {c.status === "ativa" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  )}
                  {c.status !== "cancelada" && c.status !== "encerrada" && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={e => { e.stopPropagation(); handleCancel(c); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border p-4">
                  <h4 className="text-sm font-semibold mb-3">Métricas diárias</h4>
                  {metricas.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhuma métrica registrada ainda.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="text-left py-1.5 pr-3">Data</th>
                            <th className="text-right py-1.5 px-2">Imp</th>
                            <th className="text-right py-1.5 px-2">Cliq</th>
                            <th className="text-right py-1.5 px-2">Conv</th>
                            <th className="text-right py-1.5 px-2">Gasto</th>
                            <th className="text-right py-1.5 px-2">CPC médio</th>
                            <th className="text-right py-1.5 pl-2">Taxa conv</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metricas.map(m => (
                            <tr key={m.id} className="border-b border-border/50">
                              <td className="py-1.5 pr-3">{new Date(m.data).toLocaleDateString("pt-BR")}</td>
                              <td className="text-right px-2">{m.impressoes}</td>
                              <td className="text-right px-2">{m.cliques}</td>
                              <td className="text-right px-2">{m.conversoes}</td>
                              <td className="text-right px-2">{brl(m.gasto_centavos)}</td>
                              <td className="text-right px-2">{brl(m.cpc_medio_centavos)}</td>
                              <td className="text-right pl-2">{(m.taxa_conversao * 100).toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
