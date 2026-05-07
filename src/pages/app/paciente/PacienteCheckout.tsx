import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { CreditCard, QrCode, Lock, ShieldCheck, Loader2, AlertTriangle, Ticket, X, CheckCircle2, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { trackConversion } from "@/lib/analytics/tracker";
import {
  cancelarPagamento,
  confirmarPagamento,
  formatBRL,
  getPagamento,
  type Pagamento,
  type PagamentoMetodo,
} from "@/lib/pagamentos";
import {
  validarCupomParaConsulta,
  aplicarCupomNoPagamento,
  removerCupomDoPagamento,
  registrarUsoCupom,
  type CupomAplicado,
} from "@/lib/cupons";

type ConsultaCtx = {
  paciente_id: string;
  medico_id: string;
  especialidade_id: string | null;
};

type AtendidoInfo = {
  nome: string;
  parentesco: string | null;
} | null;

export default function PacienteCheckout() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const [pagamento, setPagamento] = useState<Pagamento | null>(null);
  const [consultaCtx, setConsultaCtx] = useState<ConsultaCtx | null>(null);
  const [loading, setLoading] = useState(true);
  const [metodo, setMetodo] = useState<PagamentoMetodo>("pix");
  const [processando, setProcessando] = useState(false);
  const [atendidoInfo, setAtendidoInfo] = useState<AtendidoInfo>(null);
  const [titularNome, setTitularNome] = useState<string>("");

  // Cupom
  const [codigoCupom, setCodigoCupom] = useState("");
  const [cupomAplicado, setCupomAplicado] = useState<CupomAplicado | null>(null);
  const [cupomLoading, setCupomLoading] = useState(false);

  // Pré-validação (enquanto digita)
  type Preview =
    | { state: "idle" }
    | { state: "checking" }
    | { state: "ok"; aplicado: CupomAplicado }
    | { state: "error"; message: string };
  const [preview, setPreview] = useState<Preview>({ state: "idle" });

  async function carregar() {
    const p = await getPagamento(sessionId);
    setPagamento(p);

    // Lê cupom já aplicado (caso volte na página)
    const meta = (p?.metadata as any) ?? {};
    if (meta?.cupom) {
      setCupomAplicado({
        cupom_id: meta.cupom.cupom_id,
        codigo: meta.cupom.codigo,
        nome: meta.cupom.nome,
        tipo: meta.cupom.tipo,
        valor_original_centavos: meta.cupom.valor_original_centavos,
        desconto_centavos: meta.cupom.desconto_centavos,
        valor_final_centavos: meta.cupom.valor_final_centavos,
      });
    }

    if (p) {
      // Fluxo unificado: consulta_id pode ser null — contexto vem do metadata
      if (p.consulta_id) {
        const { data: c } = await supabase
          .from("consultas")
          .select("paciente_id, medico_id, especialidade_id")
          .eq("id", p.consulta_id)
          .maybeSingle();
        if (c) setConsultaCtx(c as ConsultaCtx);
      } else {
        // Contexto da reserva unificada (pré-consulta)
        const meta = (p.metadata as any) ?? {};
        if (meta.paciente_id && meta.medico_id) {
          setConsultaCtx({
            paciente_id: meta.paciente_id,
            medico_id: meta.medico_id,
            especialidade_id: meta.referencia_id ?? null,
          });
        }
      }
    }

    setLoading(false);
  }

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [sessionId]);

  const valorOriginal = cupomAplicado?.valor_original_centavos ?? pagamento?.valor_centavos ?? 0;
  const desconto = cupomAplicado?.desconto_centavos ?? 0;
  const valorFinal = pagamento?.valor_centavos ?? 0;

  // Pré-validação debounced enquanto digita o cupom
  useEffect(() => {
    if (cupomAplicado) return; // já há cupom aplicado
    const codigo = codigoCupom.trim();
    if (!codigo) {
      setPreview({ state: "idle" });
      return;
    }
    if (codigo.length < 3) {
      setPreview({ state: "error", message: "Código muito curto." });
      return;
    }
    if (!consultaCtx || !pagamento) return;

    setPreview({ state: "checking" });
    let cancelled = false;
    const t = setTimeout(async () => {
      const r = await validarCupomParaConsulta({
        codigo,
        valorCentavos: valorOriginal,
        medicoId: consultaCtx.medico_id,
        especialidadeId: consultaCtx.especialidade_id,
      });
      if (cancelled) return;
      if (r.ok) setPreview({ state: "ok", aplicado: r.aplicado });
      else setPreview({ state: "error", message: (r as { ok: false; error: string }).error });
    }, 400);

    return () => { cancelled = true; clearTimeout(t); };
  }, [codigoCupom, cupomAplicado, consultaCtx, pagamento, valorOriginal]);


  async function aplicarCupom() {
    if (!pagamento || !consultaCtx) return;
    setCupomLoading(true);
    try {
      const r = await validarCupomParaConsulta({
        codigo: codigoCupom,
        valorCentavos: valorOriginal,
        medicoId: consultaCtx.medico_id,
        especialidadeId: consultaCtx.especialidade_id,
      });
      if (r.ok !== true) {
        toast.error(r.error);
        return;
      }
      const ap = await aplicarCupomNoPagamento(pagamento.id, r.aplicado);
      if (!ap.ok) {
        toast.error(ap.error ?? "Não foi possível aplicar o cupom");
        return;
      }
      toast.success(`Cupom ${r.aplicado.codigo} aplicado: −${formatBRL(r.aplicado.desconto_centavos)}`);
      setCodigoCupom("");
      await carregar();
    } finally {
      setCupomLoading(false);
    }
  }

  async function removerCupom() {
    if (!pagamento) return;
    setCupomLoading(true);
    try {
      const r = await removerCupomDoPagamento(pagamento.id);
      if (!r.ok) {
        toast.error(r.error ?? "Não foi possível remover o cupom");
        return;
      }
      setCupomAplicado(null);
      toast.success("Cupom removido");
      await carregar();
    } finally {
      setCupomLoading(false);
    }
  }

  const pagar = async () => {
    if (!pagamento) return;
    setProcessando(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      await confirmarPagamento(pagamento.id, metodo);

      // Registra uso do cupom (após pagamento confirmado)
      if (cupomAplicado && consultaCtx) {
        const reg = await registrarUsoCupom({
          cupomId: cupomAplicado.cupom_id,
          consultaId: pagamento.consulta_id ?? pagamento.id,
          pacienteId: consultaCtx.paciente_id,
          medicoId: consultaCtx.medico_id,
          codigoSnapshot: cupomAplicado.codigo,
          tipoSnapshot: cupomAplicado.tipo,
          valorOriginalCentavos: cupomAplicado.valor_original_centavos,
          valorDescontoCentavos: cupomAplicado.desconto_centavos,
          valorFinalCentavos: cupomAplicado.valor_final_centavos,
        });
        if (!reg.ok) {
          // Não bloqueia o sucesso do pagamento, só registra log
          console.warn("[checkout] falha ao registrar uso de cupom:", reg.error);
        }
      }

      // analytics: conversão paga
      try {
        await trackConversion({
          tipo: "pagamento",
          valor: (pagamento.valor_centavos ?? 0) / 100,
          consulta_id: pagamento.consulta_id ?? undefined,
          pagamento_id: pagamento.id,
          servico: "consulta",
        });
      } catch {}

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
            <p className="mt-1 text-sm text-muted-foreground">Escolha como deseja pagar.</p>

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
                  <p className="text-xs text-muted-foreground">Visa, Mastercard, Elo, Amex.</p>
                </div>
              </label>
            </RadioGroup>

            {metodo === "cartao" && (
              <div className="mt-5 grid gap-3 rounded-lg border border-dashed border-border p-4">
                <div>
                  <Label htmlFor="card-number">Número do cartão</Label>
                  <Input id="card-number" placeholder="4242 4242 4242 4242" disabled={processando} />
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
                <span className="text-muted-foreground">{pagamento.consulta_id ? "Consulta" : "Reserva"}</span>
                <span className="font-mono text-xs">
                  {pagamento.consulta_id
                    ? `${pagamento.consulta_id.slice(0, 8)}…`
                    : ((pagamento.metadata as any)?.descricao ?? pagamento.id.slice(0, 8) + "…")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatBRL(valorOriginal)}</span>
              </div>
              {cupomAplicado && (
                <div className="flex justify-between text-emerald-600">
                  <span className="inline-flex items-center gap-1">
                    <Ticket className="h-3.5 w-3.5" /> Cupom {cupomAplicado.codigo}
                  </span>
                  <span>− {formatBRL(desconto)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxas</span>
                <span>R$ 0,00</span>
              </div>
              <div className="my-2 border-t border-border" />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatBRL(valorFinal)}</span>
              </div>
            </div>

            {/* Cupom */}
            <div className="mt-4 rounded-lg border border-dashed border-border p-3">
              <Label className="text-xs">Cupom de desconto</Label>
              {cupomAplicado ? (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-3.5 w-3.5" />
                    <div>
                      <p className="font-semibold">{cupomAplicado.codigo}</p>
                      <p className="text-[11px] opacity-80">{cupomAplicado.nome}</p>
                    </div>
                  </div>
                  <button
                    onClick={removerCupom}
                    disabled={cupomLoading}
                    className="rounded-full p-1 hover:bg-emerald-100 disabled:opacity-50"
                    title="Remover cupom"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={codigoCupom}
                      onChange={(e) => setCodigoCupom(e.target.value.toUpperCase())}
                      placeholder="Ex.: PRIMEIRA10"
                      maxLength={32}
                      aria-invalid={preview.state === "error"}
                      className={`h-9 text-sm ${
                        preview.state === "error"
                          ? "border-destructive focus-visible:ring-destructive"
                          : preview.state === "ok"
                          ? "border-emerald-500 focus-visible:ring-emerald-500"
                          : ""
                      }`}
                      disabled={cupomLoading || processando}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={aplicarCupom}
                      disabled={
                        !codigoCupom ||
                        cupomLoading ||
                        processando ||
                        preview.state === "checking" ||
                        preview.state === "error"
                      }
                    >
                      {cupomLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Aplicar"}
                    </Button>
                  </div>

                  {preview.state === "checking" && (
                    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Verificando cupom…
                    </p>
                  )}
                  {preview.state === "error" && (
                    <p className="flex items-center gap-1.5 text-[11px] text-destructive">
                      <AlertCircle className="h-3 w-3" /> {preview.message}
                    </p>
                  )}
                  {preview.state === "ok" && (
                    <p className="flex items-center gap-1.5 text-[11px] text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Cupom válido — desconto de {formatBRL(preview.aplicado.desconto_centavos)}
                      {" "}({formatBRL(preview.aplicado.valor_final_centavos)} no total)
                    </p>
                  )}
                </div>
              )}
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
                  Pagar {formatBRL(valorFinal)}
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
