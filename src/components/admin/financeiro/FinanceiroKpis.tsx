import { DollarSign, AlertTriangle, RefreshCw, Wallet, FileText, XCircle } from "lucide-react";

const brl = (v: number) => (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface FinanceiroKpisProps {
  dash: Record<string, number> | null;
}

export function FinanceiroKpis({ dash }: FinanceiroKpisProps) {
  const items = [
    { label: "Faturamento", v: dash?.faturamento_total, icon: DollarSign, cls: "text-success" },
    { label: "Pendentes", v: dash?.pendentes, icon: AlertTriangle, cls: "text-warning" },
    { label: "Reembolsos", v: dash?.reembolsos_valor, icon: RefreshCw, cls: "text-muted-foreground" },
    { label: "A repassar", v: dash?.valor_repassar, icon: Wallet, cls: "text-primary" },
    { label: "Receita empresas", v: dash?.receita_empresas, icon: FileText, cls: "text-primary" },
    { label: "Receita particular", v: dash?.receita_particular, icon: DollarSign, cls: "text-success" },
    { label: "Em aberto", v: dash?.valor_em_aberto, icon: AlertTriangle, cls: "text-warning" },
    { label: "Recusados", v: dash?.recusados, icon: XCircle, cls: "text-destructive" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((k) => (
        <div key={k.label} className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{k.label}</span>
            <k.icon className={`h-4 w-4 ${k.cls}`} />
          </div>
          <div className="text-2xl font-bold">{brl(k.v || 0)}</div>
        </div>
      ))}
    </div>
  );
}
