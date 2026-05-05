import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

export default function PlanoCheckoutRetorno() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    sessionId ? "success" : "error"
  );

  useEffect(() => {
    if (sessionId) {
      // Small delay to let webhook process
      const t = setTimeout(() => setStatus("success"), 1500);
      return () => clearTimeout(t);
    }
  }, [sessionId]);

  return (
    <PageShell title="Resultado do Pagamento" subtitle="">
      <Card className="max-w-lg mx-auto">
        <CardContent className="py-12 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="h-14 w-14 text-primary mx-auto mb-4 animate-spin" />
              <h3 className="text-xl font-semibold">Processando pagamento...</h3>
              <p className="text-sm text-muted-foreground mt-2">Aguarde um momento.</p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="h-14 w-14 text-success mx-auto mb-4" />
              <h3 className="text-xl font-semibold">Plano contratado com sucesso!</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Sua assinatura está ativa. Agora você pode agendar consultas com os médicos do seu plano.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => navigate("/app/paciente/plano")}>
                  Ver Meu Plano
                </Button>
                <Button variant="outline" onClick={() => navigate("/app/paciente/agendamentos")}>
                  Agendar consulta
                </Button>
              </div>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="h-14 w-14 text-destructive mx-auto mb-4" />
              <h3 className="text-xl font-semibold">Pagamento não confirmado</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Não foi possível confirmar o pagamento. Tente novamente.
              </p>
              <Button className="mt-6" onClick={() => navigate("/app/paciente/montar-plano")}>
                Tentar novamente
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
