import { useEffect, useState } from "react";
import {
  Loader2, DollarSign, Crown, Megaphone, TrendingUp, BarChart3, Target, Zap, Download,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  listarTodasCampanhas, listarTodosPremium, getConversoesPorCampanha,
  type ImpulsionamentoCampanha, type MedicoPremium,
} from "@/lib/gamificacao";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

function downloadCsv(filename: string, header: string[], rows: string[][]) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [header.map(escape).join(","), ...rows.map(r => r.map(escape).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function brl(c: number) { return `R$ ${(c / 100).toFixed(2)}`; }
function pct(v: number) { return `${(v * 100).toFixed(1)}%`; }

export default function AdminGamificacaoFinanceiro() {
  const [loading, setLoading] = useState(true);
  const [campanhas, setCampanhas] = useState<(ImpulsionamentoCampanha & { nome?: string; conversoes?: number })[]>([]);
  const [premiums, setPremiums] = useState<(MedicoPremium & { nome?: string })[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [camps, prems, convMap] = await Promise.all([
        listarTodasCampanhas(100),
        listarTodosPremium(),
        getConversoesPorCampanha(),
      ]);

      const ids = [...new Set([...camps.map((c) => c.medico_id), ...prems.map((p) => p.medico_id)])];
      let nomeMap = new Map<string, string>();
      if (ids.length) {
        const { data } = await supabase.from("medicos").select("id,nome").in("id", ids);
        nomeMap = new Map((data ?? []).map((m) => [m.id, m.nome]));
      }
      setCampanhas(camps.map((c) => ({ ...c, nome: nomeMap.get(c.medico_id) ?? "—", conversoes: convMap[c.id] ?? 0 })));
      setPremiums(prems.map((p) => ({ ...p, nome: nomeMap.get(p.medico_id) ?? "—" })));
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando financeiro da gamificação…
      </div>
    );
  }

  const totalGastoCPC = campanhas.reduce((s, c) => s + c.gasto_centavos, 0);
  const totalOrcamentoCPC = campanhas.reduce((s, c) => s + c.orcamento_centavos, 0);
  const totalCliques = campanhas.reduce((s, c) => s + c.cliques, 0);
  const totalConversoes = campanhas.reduce((s, c) => s + (c.conversoes ?? 0), 0);
  const campanhasAtivas = campanhas.filter((c) => c.status === "ativa").length;
  const premiumsAtivos = premiums.filter((p) => p.ativo).length;
  const taxaConvGlobal = totalCliques > 0 ? totalConversoes / totalCliques : 0;

  const exportKpis = () => {
    const hoje = new Date().toLocaleDateString("pt-BR");
    downloadCsv(`gamificacao-kpis-${hoje}.csv`,
      ["Métrica", "Valor"],
      [
        ["Receita CPC total", brl(totalGastoCPC)],
        ["Orçamento CPC total", brl(totalOrcamentoCPC)],
        ["Cliques totais", String(totalCliques)],
        ["Conversões", String(totalConversoes)],
        ["Taxa de conversão", pct(taxaConvGlobal)],
        ["Premium ativos", String(premiumsAtivos)],
        ["Premium total", String(premiums.length)],
        ["Campanhas total", String(campanhas.length)],
        ["Campanhas ativas", String(campanhasAtivas)],
      ],
    );
  };

  const exportCampanhas = () => {
    const hoje = new Date().toLocaleDateString("pt-BR");
    downloadCsv(`gamificacao-campanhas-${hoje}.csv`,
      ["Médico", "Campanha", "Status", "Orçamento", "Gasto", "Cliques", "Conversões", "CPC", "ROI %"],
      campanhas.map(c => [
        c.nome ?? "—",
        c.titulo,
        c.status,
        brl(c.orcamento_centavos),
        brl(c.gasto_centavos),
        String(c.cliques),
        String(c.conversoes ?? 0),
        brl(c.cpc_centavos),
        c.cliques > 0 ? ((c.conversoes ?? 0) / c.cliques * 100).toFixed(1) : "0.0",
      ]),
    );
  };

  const exportPremium = () => {
    const hoje = new Date().toLocaleDateString("pt-BR");
    downloadCsv(`gamificacao-premium-${hoje}.csv`,
      ["Médico", "Status", "Tipo", "Início", "Fim"],
      premiums.map(p => [
        p.nome ?? "—",
        p.ativo ? "Ativo" : "Inativo",
        p.tipo,
        p.inicio ? new Date(p.inicio).toLocaleDateString("pt-BR") : "—",
        p.fim ? new Date(p.fim).toLocaleDateString("pt-BR") : "Sem prazo",
      ]),
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro da Gamificação"
        description="Receita de assinaturas premium, consumo CPC, conversões e métricas de ROI."
        actions={
          <Button variant="outline" size="sm" onClick={exportKpis}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Exportar KPIs
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard label="Receita CPC total" value={brl(totalGastoCPC)} icon={DollarSign} hint={`${brl(totalOrcamentoCPC)} em orçamento`} />
        <StatCard label="Cliques totais" value={String(totalCliques)} icon={TrendingUp} hint={`${campanhasAtivas} campanhas ativas`} />
        <StatCard label="Conversões" value={String(totalConversoes)} icon={Target} hint={`${pct(taxaConvGlobal)} de taxa`} />
        <StatCard label="Premium ativos" value={String(premiumsAtivos)} icon={Crown} hint={`${premiums.length} registros totais`} />
        <StatCard label="Campanhas" value={String(campanhas.length)} icon={Megaphone} hint={`${campanhasAtivas} ativas agora`} />
      </div>

      {/* Premium members */}
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            <h3 className="font-display text-lg font-semibold">Membros Premium</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{premiumsAtivos} ativos</Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={exportPremium} title="Exportar CSV">
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {premiums.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Nenhum membro premium ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-3">Médico</th>
                  <th className="pb-2 pr-3 text-center">Status</th>
                  <th className="pb-2 pr-3 text-center">Tipo</th>
                  <th className="pb-2 pr-3">Início</th>
                  <th className="pb-2">Fim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {premiums.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="py-2.5 pr-3 font-medium">{p.nome}</td>
                    <td className="py-2.5 pr-3 text-center">
                      <Badge className={p.ativo ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}>
                        {p.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-3 text-center capitalize">{p.tipo}</td>
                    <td className="py-2.5 pr-3 text-xs">{p.inicio ? new Date(p.inicio).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="py-2.5 text-xs">{p.fim ? new Date(p.fim).toLocaleDateString("pt-BR") : "Sem prazo"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Campanhas com ROI */}
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-semibold">Campanhas CPC — ROI</h3>
          </div>
          <Badge variant="secondary">{campanhas.length} total</Badge>
        </div>

        {campanhas.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma campanha criada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-3">Médico</th>
                  <th className="pb-2 pr-3">Campanha</th>
                  <th className="pb-2 pr-3 text-center">Status</th>
                  <th className="pb-2 pr-3 text-right">Orçamento</th>
                  <th className="pb-2 pr-3 text-right">Gasto</th>
                  <th className="pb-2 pr-3 text-center">Cliques</th>
                  <th className="pb-2 pr-3 text-center">Conv.</th>
                  <th className="pb-2 pr-3 text-right">CPC</th>
                  <th className="pb-2 text-right">ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {campanhas.map((c) => {
                  const roi = c.cliques > 0 ? ((c.conversoes ?? 0) / c.cliques * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={c.id} className="hover:bg-muted/30">
                      <td className="py-2.5 pr-3 font-medium truncate max-w-[150px]">{c.nome}</td>
                      <td className="py-2.5 pr-3 truncate max-w-[150px]">{c.titulo}</td>
                      <td className="py-2.5 pr-3 text-center">
                        <Badge className={cn("text-[10px]",
                          c.status === "ativa" ? "bg-success/15 text-success" :
                          c.status === "pausada" ? "bg-warning/15 text-warning" :
                          c.status === "encerrada" ? "bg-muted text-muted-foreground" :
                          "bg-destructive/15 text-destructive"
                        )}>{c.status}</Badge>
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono">{brl(c.orcamento_centavos)}</td>
                      <td className="py-2.5 pr-3 text-right font-mono">{brl(c.gasto_centavos)}</td>
                      <td className="py-2.5 pr-3 text-center">{c.cliques}</td>
                      <td className="py-2.5 pr-3 text-center">{c.conversoes ?? 0}</td>
                      <td className="py-2.5 pr-3 text-right font-mono">{brl(c.cpc_centavos)}</td>
                      <td className="py-2.5 text-right font-mono">{roi}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
