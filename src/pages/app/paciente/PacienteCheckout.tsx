import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { CreditCard, QrCode, Lock, ShieldCheck, Loader2, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  cancelarPagamento,
  confirmarPagamento,
  formatBRL,
  getPagamento,
  type Pagamento,
  type PagamentoMetodo,
} from "@/lib/pagamentos";

export default function PacienteCheckout() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const [pagamento, setPagamento] = useState<Pagamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [metodo, setMetodo] = useState<PagamentoMetodo>("pix");
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await getPagamento(sessionId);
      setPagamento(p);
      setLoading(false);
    })();
  }, [sessionId]);

  const pagar = async () => {
    if (!pagamento) return;
    setProcessando(true);
    try {
      // Simula latência de gateway real
      await new Promise((r) => setTimeout(r, 1200));
      await confirmarPagamento(pagamento.id, metodo);
      toast.success("Pagamento aprovado!");
      navigate(`/app/paciente/pagamento/sucesso?p=${pagamento.id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Falha no pagamento");
    } finally {
      setProcessando(false);
    }
  };

  const cancelar = async () => {
    if (!pagamento) return;
    try {
      await cancelarPagamento(pagamento.id);
      navigate(`/app/paciente/pagamento/cancelado?p=${pagamento.id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao cancelar");
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pagamento) {
    return (
      <div className="space-y-4">
        <PageHeader title="Sessão de pagamento" description="Não encontrada." />
        <Button asChild variant="outline">
          <Link to="/app/paciente/dashboard">Voltar</Link>
        </Button>
      </div>
    );
  }

  if (pagamento.status === "pago") {
    return (
      <div className="space-y-4">
        <PageHeader title="Pagamento já confirmado" description="Esta sessão já foi paga." />
        <Button asChild>
          <Link to={`/app/paciente/pagamento/sucesso?p=${pagamento.id}`}>Ver recibo</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finalizar pagamento"
        description="Ambiente de demonstração — nenhum valor real é cobrado."
      />

      {/* Banner DEV */}
      <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-warning-foreground">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div>
          <strong>Modo simulado.</strong> A integração real com Stripe será conectada
          em seguida. Aqui você pode testar o fluxo completo sem cobrança.
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Coluna principal */}
        <div className="space-y-6">
          <div className="card-elevated p-6">
            <h2 className="font-display text-lg font-bold">Forma de pagamento</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Escolha como deseja pagar.
            </p>

            <RadioGroup
              value={metodo}
              onValueChange={(v) => setMetodo(v as PagamentoMetodo)}
              className="mt-5 grid gap-3"
            >
              <label
                htmlFor="m-pix"
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                  metodo === "pix" ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <RadioGroupItem value="pix" id="m-pix" className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <QrCode className="h-4 w-4" /> Pix
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Aprovação imediata. Sem taxas para o paciente.
                  </p>
                </div>
              </label>

              <label
                htmlFor="m-cartao"
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                  metodo === "cartao" ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <RadioGroupItem value="cartao" id="m-cartao" className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <CreditCard className="h-4 w-4" /> Cartão de crédito
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Visa, Mastercard, Elo, Amex.
                  </p>
                </div>
              </label>
            </RadioGroup>

            {metodo === "cartao" && (
              <div className="mt-5 grid gap-3 rounded-lg border border-dashed border-border p-4">
                <div>
                  <Label htmlFor="card-number">Número do cartão</Label>
                  <Input
                    id="card-number"
                    placeholder="4242 4242 4242 4242"
                    disabled={processando}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="card-exp">Validade</Label>
                    <Input id="card-exp" placeholder="MM/AA" disabled={processando} />
                  </div>
                  <div>
                    <Label htmlFor="card-cvc">CVC</Label>
                    <Input id="card-cvc" placeholder="123" disabled={processando} />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Os dados não são processados — modo simulado.
                </p>
              </div>
            )}

            {metodo === "pix" && (
              <div className="mt-5 flex items-center gap-4 rounded-lg border border-dashed border-border p-4">
                <div className="grid h-24 w-24 place-items-center rounded-md bg-muted">
                  <QrCode className="h-12 w-12 text-muted-foreground" />
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-semibold">QR Code Pix</p>
                  <p className="text-xs text-muted-foreground">
                    Em produção, aqui aparece o QR e o código copia-e-cola gerado pelo Stripe.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            Conexão segura. Pagamentos processados pelo Stripe (em breve).
          </div>
        </div>

        {/* Resumo */}
        <aside className="space-y-3">
          <div className="card-elevated p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Resumo</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Consulta</span>
                <span className="font-mono text-xs">{pagamento.consulta_id.slice(0, 8)}…</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatBRL(pagamento.valor_centavos)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxas</span>
                <span>R$ 0,00</span>
              </div>
              <div className="my-2 border-t border-border" />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatBRL(pagamento.valor_centavos)}</span>
              </div>
            </div>
            <Button
              className="mt-4 w-full"
              size="lg"
              onClick={pagar}
              disabled={processando}
            >
              {processando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando…
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Pagar {formatBRL(pagamento.valor_centavos)}
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              className="mt-2 w-full"
              onClick={cancelar}
              disabled={processando}
            >
              Cancelar
            </Button>
          </div>
          <p className="px-1 text-[11px] text-muted-foreground">
            Provider: <strong>{pagamento.provider}</strong> · Sessão{" "}
            <span className="font-mono">{pagamento.id.slice(0, 8)}</span>
          </p>
        </aside>
      </div>
    </div>
  );
}
