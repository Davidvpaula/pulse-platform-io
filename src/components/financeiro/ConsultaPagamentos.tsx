import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, Clock, XCircle, RefreshCw, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

type PagamentoResumo = {
  id: string;
  valor_centavos: number;
  status: string;
  metodo: string;
  paid_at: string | null;
  created_at: string;
};

const statusUI: Record<string, { label: string; icon: typeof CheckCircle2; cls: string }> = {
  pago:        { label: "Pago",        icon: CheckCircle2, cls: "text-success" },
  aprovado:    { label: "Aprovado",    icon: CheckCircle2, cls: "text-success" },
  pendente:    { label: "Pendente",    icon: Clock,        cls: "text-warning" },
  processando: { label: "Processando", icon: Loader2,      cls: "text-primary" },
  falhou:      { label: "Falhou",      icon: XCircle,      cls: "text-destructive" },
  cancelado:   { label: "Cancelado",   icon: XCircle,      cls: "text-muted-foreground" },
  reembolsado: { label: "Reembolsado", icon: RefreshCw,    cls: "text-muted-foreground" },
};

const metodoLabel: Record<string, string> = {
  cartao: "Cartão", pix: "Pix", boleto: "Boleto", simulado: "Sandbox",
};

function fmtData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

interface Props {
  consultaId: string;
  className?: string;
}

export function ConsultaPagamentos({ consultaId, className }: Props) {
  const [loading, setLoading] = useState(true);
  const [pagamentos, setPagamentos] = useState<PagamentoResumo[]>([]);

  useEffect(() => {
    if (!consultaId) return;
    setLoading(true);
    supabase
      .from("pagamentos")
      .select("id, valor_centavos, status, metodo, paid_at, created_at")
      .eq("consulta_id", consultaId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setPagamentos(data ?? []);
        setLoading(false);
      });
  }, [consultaId]);

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground py-3", className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando pagamentos…
      </div>
    );
  }

  if (pagamentos.length === 0) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground py-3", className)}>
        <Receipt className="h-4 w-4 opacity-50" /> Nenhum pagamento vinculado.
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
        Pagamentos ({pagamentos.length})
      </p>
      {pagamentos.map((p) => {
        const ui = statusUI[p.status] ?? { label: p.status, icon: Receipt, cls: "text-muted-foreground" };
        const Icon = ui.icon;
        return (
          <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <Icon className={cn("h-4 w-4 shrink-0", ui.cls, p.status === "processando" && "animate-spin")} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{formatBRL(p.valor_centavos)}</span>
                <Badge variant="outline" className="text-[10px]">{ui.label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {metodoLabel[p.metodo] ?? p.metodo} · {fmtData(p.paid_at ?? p.created_at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
