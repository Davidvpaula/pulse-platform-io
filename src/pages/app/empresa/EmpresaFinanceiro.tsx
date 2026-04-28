import { Wallet, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { getKpis, getPerfil, listFaturas, brl, STATUS_FATURA_LABEL } from "@/lib/empresa";

export default function EmpresaFinanceiro() {
  const kpis = getKpis();
  const perfil = getPerfil();
  const faturas = listFaturas();
  const consumoPercent = perfil.vidasContratadas === 0 ? 0 : Math.round((kpis.ativos / perfil.vidasContratadas) * 100);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Financeiro</p>
        <h1 className="font-display text-2xl font-bold">Faturas e consumo</h1>
        <p className="text-sm text-muted-foreground">{perfil.plano} · {perfil.vidasContratadas} vidas contratadas · ciclo dia {perfil.cicloFechamento}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card-elevated p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valor mensal</p>
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold">{brl(kpis.custoMensal)}</p>
          <p className="text-[11px] text-muted-foreground">{kpis.ativos} colaboradores ativos × {brl(perfil.precoPorVida)}</p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Custo por colaborador</p>
          <p className="mt-2 text-2xl font-bold">{brl(kpis.custoMedioColaborador)}</p>
          <p className="text-[11px] text-muted-foreground">Média no ciclo corrente</p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Consumo do plano</p>
          <p className="mt-2 text-2xl font-bold">{consumoPercent}%</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className={`h-full ${consumoPercent > 90 ? "bg-warning" : "bg-gradient-primary"}`} style={{ width: `${Math.min(consumoPercent, 100)}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{kpis.ativos} de {perfil.vidasContratadas} vidas</p>
        </div>
      </div>

      <section className="card-elevated p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Histórico de faturas</h2>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="pb-2 pr-3">Competência</th><th className="pb-2 pr-3">Vidas</th><th className="pb-2 pr-3">Valor</th><th className="pb-2 pr-3">Emissão</th><th className="pb-2 pr-3">Status</th><th className="pb-2 text-right">Ações</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {faturas.slice().reverse().map(f => (
                <tr key={f.id}>
                  <td className="py-3 pr-3 font-medium">{f.competencia}</td>
                  <td className="py-3 pr-3">{f.vidas}</td>
                  <td className="py-3 pr-3">{brl(f.valor)}</td>
                  <td className="py-3 pr-3 text-muted-foreground">{f.emitidaEm}</td>
                  <td className="py-3 pr-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      f.status === "paga" ? "bg-success/10 text-success" :
                      f.status === "em_aberto" ? "bg-warning/10 text-warning" :
                      "bg-destructive/10 text-destructive"
                    }`}>{STATUS_FATURA_LABEL[f.status]}</span>
                  </td>
                  <td className="py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => toast({ title: "Em breve", description: "Download de boleto/NF." })}>
                      <Download className="mr-1 h-3.5 w-3.5" /> Baixar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
