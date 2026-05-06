import { Badge } from "@/components/ui/badge";

const STATUS_MAP: Record<string, string> = {
  pago: "bg-success/10 text-success",
  aprovado: "bg-success/10 text-success",
  pendente: "bg-warning/10 text-warning",
  processando: "bg-primary/10 text-primary",
  recusado: "bg-destructive/10 text-destructive",
  falhou: "bg-destructive/10 text-destructive",
  cancelado: "bg-muted text-muted-foreground",
  reembolsado: "bg-muted text-muted-foreground",
  reembolsado_parcial: "bg-muted text-muted-foreground",
  expirado: "bg-muted text-muted-foreground",
  solicitado: "bg-warning/10 text-warning",
  em_analise: "bg-primary/10 text-primary",
  em_aberto: "bg-warning/10 text-warning",
  em_processamento: "bg-primary/10 text-primary",
  bloqueado: "bg-destructive/10 text-destructive",
  contestado: "bg-warning/10 text-warning",
  ativo: "bg-primary/10 text-primary",
  concluido: "bg-success/10 text-success",
};

export function FinanceiroStatusBadge({ s }: { s: string }) {
  return <Badge className={STATUS_MAP[s] || "bg-muted"}>{s}</Badge>;
}
