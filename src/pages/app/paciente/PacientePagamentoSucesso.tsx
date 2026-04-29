import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Calendar, FileText, Loader2, Clock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { formatBRL, getPagamento, type Pagamento } from "@/lib/pagamentos";

export default function PacientePagamentoSucesso() {
  const [params] = useSearchParams();
  const id = params.get("p") ?? "";
  const [p, setP] = useState<Pagamento | null>(null);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      const data = await getPagamento(id);
      if (cancelled) return;
      setP(data);
      attempts += 1;
      // Para de pollar quando pago/falhou ou após 12 tentativas (~36s)
      if (data?.status === "pago" || data?.status === "falhou" || attempts >= 12) {
        setPolling(false);
        return;
      }
      setTimeout(tick, 3000);
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const pago = p?.status === "pago";

  return (
    <div className="space-y-6">
      <PageHeader
        title={pago ? "Pagamento confirmado" : "Aguardando confirmação"}
        description={pago ? "Sua consulta está garantida." : "Recebemos seu pagamento — confirmando com o provedor."}
      />

      <div className="card-elevated overflow-hidden">
        <div className="gradient-soft flex flex-col items-center gap-3 p-8 text-center">
          <div
            className={`grid h-14 w-14 place-items-center rounded-full ${
              pago ? "bg-success/15" : "bg-warning/15"
            }`}
          >
            {pago ? (
              <CheckCircle2 className="h-8 w-8 text-success" />
            ) : polling ? (
              <Loader2 className="h-8 w-8 animate-spin text-warning" />
            ) : (
              <Clock className="h-8 w-8 text-warning" />
            )}
          </div>
          <h2 className="font-display text-2xl font-bold">
            {pago ? "Pagamento aprovado" : "Confirmando pagamento…"}
          </h2>
          {p && (
            <p className="text-sm text-muted-foreground">
              Valor: <strong>{formatBRL(p.valor_centavos)}</strong> · Status:{" "}
              <strong className="capitalize">{p.status}</strong>
            </p>
          )}
          {!pago && !polling && (
            <p className="max-w-md text-xs text-muted-foreground">
              A confirmação pode levar alguns segundos. Atualize esta página em instantes —
              assim que o provedor confirmar, sua consulta aparecerá no painel.
            </p>
          )}
        </div>
        <div className="grid gap-3 p-6 sm:grid-cols-2">
          <Button asChild>
            <Link to="/app/paciente/dashboard">
              <Calendar className="mr-2 h-4 w-4" /> Ver minhas consultas
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/app/paciente/dashboard">
              <FileText className="mr-2 h-4 w-4" /> Recibo (em breve)
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
