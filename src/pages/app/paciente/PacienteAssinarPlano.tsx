import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { useSession } from "@/lib/session";
import PageShell from "@/components/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldCheck, CheckCircle2, CreditCard, Loader2, ArrowLeft, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";

type PlanoData = {
  id: string;
  nome: string;
  descricao: string | null;
  descricao_comercial: string | null;
  valor_mensal_centavos: number;
  cta_texto: string | null;
  feats: string[];
};

export default function PacienteAssinarPlano() {
  const { planoId } = useParams<{ planoId: string }>();
  const { session } = useSession();
  const navigate = useNavigate();
  const uid = session?.user?.id;

  const [loading, setLoading] = useState(true);
  const [plano, setPlano] = useState<PlanoData | null>(null);
  const [jaTemPlano, setJaTemPlano] = useState(false);
  const [step, setStep] = useState<"detalhes" | "pagamento">("detalhes");

  useEffect(() => {
    if (!planoId || !uid) return;
    (async () => {
      setLoading(true);
      try {
        // Load plan
        const { data: p } = await supabase
          .from("planos")
          .select("id, nome, descricao, descricao_comercial, valor_mensal_centavos, cta_texto")
          .eq("id", planoId)
          .eq("status", "ativo" as any)
          .eq("nivel", "admin" as any)
          .maybeSingle();

        if (!p) {
          toast.error("Plano não encontrado ou não está disponível.");
          navigate("/app/paciente/plano");
          return;
        }

        // Fetch benefits
        const { data: beneficios } = await supabase
          .from("plano_beneficios")
          .select("nome")
          .eq("plano_id", p.id)
          .order("ordem");

        setPlano({
          ...p,
          feats: (beneficios ?? []).map(b => b.nome).filter(Boolean) as string[],
        });

        // Check active subscription
        const { data: paciente } = await supabase
          .from("pacientes")
          .select("id")
          .eq("user_id", uid)
          .maybeSingle();

        if (paciente) {
          const { data: existentes } = await supabase
            .from("assinaturas")
            .select("id")
            .eq("paciente_id", paciente.id)
            .in("status", ["ativa", "trial"] as any)
            .limit(1);
          setJaTemPlano((existentes?.length ?? 0) > 0);
        }
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar plano.");
      } finally {
        setLoading(false);
      }
    })();
  }, [planoId, uid, navigate]);

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    if (!plano) throw new Error("Plano não carregado");
    const { data, error } = await supabase.functions.invoke("criar-checkout-plano", {
      body: {
        planoIds: [plano.id],
        valorFinalCentavos: plano.valor_mensal_centavos,
        descontoPct: 0,
        environment: getStripeEnvironment(),
      },
    });
    if (error) throw new Error(error.message ?? "Falha ao criar checkout");
    const payload = data as { clientSecret?: string; error?: string };
    if (payload.error) throw new Error(payload.error);
    if (!payload.clientSecret) throw new Error("clientSecret ausente");
    return payload.clientSecret;
  }, [plano]);

  if (loading) {
    return (
      <PageShell title="Assinar Plano" subtitle="">
        <div className="max-w-lg mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </PageShell>
    );
  }

  if (!plano) return null;

  return (
    <PageShell title="Assinar Plano" subtitle="Revise os detalhes e finalize sua assinatura">
      <div className="max-w-2xl mx-auto space-y-6">

        {jaTemPlano && (
          <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Você já possui um plano ativo</p>
              <p className="text-muted-foreground">
                Cancele ou aguarde a conclusão do plano atual antes de assinar outro.
              </p>
            </div>
          </div>
        )}

        {/* ─── Detalhes ─── */}
        {step === "detalhes" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                {plano.nome}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {(plano.descricao_comercial || plano.descricao) && (
                <p className="text-sm text-muted-foreground">
                  {plano.descricao_comercial || plano.descricao}
                </p>
              )}

              <div className="rounded-xl border border-border bg-muted/30 p-5 text-center">
                <p className="text-sm text-muted-foreground mb-1">Valor mensal</p>
                <p className="font-display text-4xl font-extrabold text-primary">
                  {brl(plano.valor_mensal_centavos)}
                  <span className="text-base font-medium text-muted-foreground">/mês</span>
                </p>
              </div>

              {plano.feats.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-3">O que está incluso:</p>
                  <ul className="space-y-2.5">
                    {plano.feats.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span>Pagamento seguro processado via Stripe. Cancele quando quiser.</span>
                </p>
              </div>

              <div className="flex gap-2 justify-between">
                <Button variant="outline" onClick={() => navigate(-1)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
                </Button>
                <Button
                  onClick={() => setStep("pagamento")}
                  disabled={jaTemPlano}
                >
                  <CreditCard className="h-4 w-4 mr-1" />
                  Ir para pagamento
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Pagamento ─── */}
        {step === "pagamento" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Pagamento — {plano.nome}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 rounded-xl border border-border bg-muted/30 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assinatura mensal</span>
                  <span className="font-bold text-primary">{brl(plano.valor_mensal_centavos)}/mês</span>
                </div>
              </div>

              <div className="min-h-[400px]">
                <EmbeddedCheckoutProvider
                  stripe={getStripe()}
                  options={{ fetchClientSecret }}
                >
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>

              <div className="mt-4">
                <Button variant="outline" onClick={() => setStep("detalhes")}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
