import { Link } from "react-router-dom";
import { XCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

export default function PacientePagamentoCancelado() {
  return (
    <div className="space-y-6">
      <PageHeader title="Pagamento cancelado" description="Nenhum valor foi cobrado." />
      <div className="card-elevated p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-muted">
          <XCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="mt-3 font-display text-xl font-bold">Tudo certo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Você cancelou o pagamento. A consulta segue como pendente até o pagamento ser concluído.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button asChild>
            <Link to="/app/paciente/dashboard">Voltar ao painel</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/agendar">Tentar novamente</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
