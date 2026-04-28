import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Calendar, FileText } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { formatBRL, getPagamento, type Pagamento } from "@/lib/pagamentos";

export default function PacientePagamentoSucesso() {
  const [params] = useSearchParams();
  const id = params.get("p") ?? "";
  const [p, setP] = useState<Pagamento | null>(null);

  useEffect(() => {
    if (id) getPagamento(id).then(setP);
  }, [id]);

  return (
    <div className="space-y-6">
      <PageHeader title="Pagamento confirmado" description="Sua consulta está garantida." />

      <div className="card-elevated overflow-hidden">
        <div className="gradient-soft flex flex-col items-center gap-3 p-8 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-success/15">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h2 className="font-display text-2xl font-bold">Pagamento aprovado</h2>
          {p && (
            <p className="text-sm text-muted-foreground">
              Valor pago: <strong>{formatBRL(p.valor_centavos)}</strong> · Método:{" "}
              <strong className="capitalize">{p.metodo}</strong>
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
