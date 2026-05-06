import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { brl } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search, CheckCircle2, Loader2, ArrowRight, ArrowLeft,
  Percent, AlertTriangle, Sparkles, CreditCard, ShieldCheck, X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTermsCheck } from "@/hooks/useTermsCheck";
import { TermsAcceptanceDialog } from "@/components/shared/TermsAcceptanceDialog";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";

/* ─────────── Types ─────────── */

type PlanoDisponivel = {
  id: string;
  nome: string;
  descricao_comercial: string | null;
  valor_mensal_centavos: number;
  medico_user_id: string;
  medico_nome: string;
  medico_foto: string | null;
  medico_especialidade: string | null;
  medico_crm: string | null;
  medico_pk: string;
  beneficios: string[];
};

type DescontoRegra = { qtd_medicos_min: number; desconto_pct: number };

/* ─────────── Component ─────────── */

export default function PacienteMontarPlano() {
  const { session } = useSession();
  const navigate = useNavigate();
  const uid = session?.user?.id;
  const termsPlano = useTermsCheck("plano_plataforma");

  const [step, setStep] = useState(1);
  const [planos, setPlanos] = useState<PlanoDisponivel[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [regras, setRegras] = useState<DescontoRegra[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [jaTemPlanoAtivo, setJaTemPlanoAtivo] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  async function loadData() {
    if (!uid) return;
    setLoading(true);
    try {
      const { data: planosData } = await supabase
        .from("planos")
        .select("id, nome, descricao_comercial, valor_mensal_centavos, medico_id, plano_beneficios(nome)")
        .eq("nivel", "medico" as any)
        .eq("status", "ativo" as any)
        .eq("aprovado_admin", true)
        .order("ordem_exibicao");

      const { data: medicos } = await supabase
        .from("medicos")
        .select("id, user_id, nome, especialidade, foto_url, crm")
        .eq("status", "aprovado");

      const medicoMap = new Map<string, any>();
      for (const m of (medicos ?? [])) medicoMap.set(m.id, m);

      const { data: r } = await supabase
        .from("desconto_progressivo_regras")
        .select("qtd_medicos_min, desconto_pct")
        .eq("ativo", true)
        .order("qtd_medicos_min");

      const { data: existentes } = await supabase
        .from("assinaturas")
        .select("id")
        .eq("paciente_id", uid)
        .in("status", ["ativa", "trial"] as any[])
        .limit(1);

      setJaTemPlanoAtivo((existentes?.length ?? 0) > 0);

      const enriched: PlanoDisponivel[] = (planosData ?? [])
        .map((p: any) => {
          const med = medicoMap.get(p.medico_id);
          if (!med) return null;
          return {
            id: p.id,
            nome: p.nome,
            descricao_comercial: p.descricao_comercial,
            valor_mensal_centavos: p.valor_mensal_centavos,
            medico_user_id: med.user_id,
            medico_nome: med.nome,
            medico_foto: med.foto_url,
            medico_especialidade: med.especialidade,
            medico_crm: med.crm,
            medico_pk: med.id,
            beneficios: (p.plano_beneficios ?? []).map((b: any) => b.nome),
          };
        })
        .filter(Boolean) as PlanoDisponivel[];

      setPlanos(enriched);
      setRegras((r ?? []) as DescontoRegra[]);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  }

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const medicosSelecionadosCount = useMemo(() => {
    const mIds = new Set<string>();
    for (const p of planos) {
      if (selectedIds.has(p.id)) mIds.add(p.medico_user_id);
    }
    return mIds.size;
  }, [selectedIds, planos]);

  const descontoPct = useMemo(() => {
    let d = 0;
    for (const r of regras) {
      if (medicosSelecionadosCount >= r.qtd_medicos_min) d = Number(r.desconto_pct);
    }
    return d;
  }, [medicosSelecionadosCount, regras]);

  const proximaFaixa = useMemo(() => {
    for (const r of regras) {
      if (medicosSelecionadosCount < r.qtd_medicos_min) {
        return { falta: r.qtd_medicos_min - medicosSelecionadosCount, desconto: Number(r.desconto_pct) };
      }
    }
    return null;
  }, [medicosSelecionadosCount, regras]);

  const selectedPlanos = useMemo(
    () => planos.filter((p) => selectedIds.has(p.id)),
    [planos, selectedIds]
  );

  const valorBruto = useMemo(
    () => selectedPlanos.reduce((s, p) => s + p.valor_mensal_centavos, 0),
    [selectedPlanos]
  );

  const valorFinal = Math.round(valorBruto * (1 - descontoPct / 100));

  const filtered = planos.filter(
    (p) =>
      !busca ||
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.medico_nome.toLowerCase().includes(busca.toLowerCase()) ||
      (p.medico_especialidade || "").toLowerCase().includes(busca.toLowerCase())
  );

  // ── Stripe Checkout ──
  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("criar-checkout-plano", {
      body: {
        planoIds: Array.from(selectedIds),
        valorFinalCentavos: valorFinal,
        descontoPct,
        environment: getStripeEnvironment(),
      },
    });
    if (error) throw new Error(error.message ?? "Falha ao criar checkout");
    const payload = data as { clientSecret?: string; error?: string };
    if (payload.error) throw new Error(payload.error);
    if (!payload.clientSecret) throw new Error("clientSecret ausente");
    return payload.clientSecret;
  }, [selectedIds, valorFinal, descontoPct]);

  async function iniciarCheckout() {
    if (!uid || selectedIds.size === 0) return;
    if (termsPlano.needsAcceptance) {
      termsPlano.promptAcceptance();
      return;
    }
    if (jaTemPlanoAtivo) {
      toast.error("Você já possui um plano personalizado ativo ou em rascunho.");
      return;
    }
    setSaving(true);
    setStep(3); // Go to checkout step
    setSaving(false);
  }

  /* ─── Loading ─── */
  if (loading) {
    return (
      <PageShell title="Monte seu Plano" subtitle="Escolha planos de médicos e ganhe desconto progressivo">
        <div className="space-y-4">
          <Skeleton className="h-10 max-w-sm" />
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Monte seu Plano" subtitle="Escolha planos de médicos e ganhe desconto progressivo">
      {/* Aviso: já tem plano ativo */}
      {jaTemPlanoAtivo && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Você já possui um plano personalizado</p>
            <p className="text-muted-foreground">
              Cancele ou aguarde a conclusão do plano atual antes de criar um novo.
            </p>
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { n: 1, label: "Escolher planos" },
          { n: 2, label: "Revisar" },
          { n: 3, label: "Pagamento" },
          { n: 4, label: "Confirmado" },
        ].map(({ n, label }) => (
          <div
            key={n}
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium",
              n <= step ? "text-primary" : "text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs",
                n < step
                  ? "bg-primary text-primary-foreground"
                  : n === step
                  ? "border-2 border-primary"
                  : "border border-border"
              )}
            >
              {n < step ? <CheckCircle2 className="h-4 w-4" /> : n}
            </span>
            <span className="hidden sm:inline">{label}</span>
            {n < 4 && <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />}
          </div>
        ))}
      </div>

      {/* ─── STEP 1: Escolher planos ─── */}
      {step === 1 && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar plano, médico ou especialidade..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            {selectedIds.size > 0 && (
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm">
                <Sparkles className="h-4 w-4" />
                {selectedIds.size} plano{selectedIds.size > 1 ? "s" : ""} selecionado{selectedIds.size > 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          {selectedIds.size > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {selectedPlanos.map((p) => (
                <Badge key={p.id} variant="secondary" className="gap-1">
                  {p.nome}
                  <button onClick={() => toggle(p.id)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {regras.length > 0 && (
            <div className="mb-4 rounded-xl border border-border bg-muted/30 p-3">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Percent className="h-4 w-4 text-primary" />
                  <span className="font-medium">Desconto atual: <span className="text-success">{descontoPct}%</span></span>
                </div>
                {proximaFaixa && (
                  <span className="text-muted-foreground">
                    +{proximaFaixa.falta} médico{proximaFaixa.falta > 1 ? "s" : ""} diferente{proximaFaixa.falta > 1 ? "s" : ""} para {proximaFaixa.desconto}%
                  </span>
                )}
                {valorBruto > 0 && (
                  <span className="ml-auto text-muted-foreground">
                    Total: {descontoPct > 0 ? <><s>{brl(valorBruto)}</s> → </> : null}
                    <strong className="text-foreground">{brl(valorFinal)}</strong>/mês
                  </span>
                )}
              </div>
            </div>
          )}

          {filtered.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => {
                const selected = selectedIds.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    disabled={jaTemPlanoAtivo}
                    className={cn(
                      "flex flex-col rounded-xl border p-4 text-left transition-all",
                      selected
                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                        : "hover:bg-muted/50 hover:border-muted-foreground/30",
                      jaTemPlanoAtivo && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={p.medico_foto || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {p.medico_nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.medico_nome}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {p.medico_especialidade || "Clínico Geral"}
                          {p.medico_crm ? ` · CRM ${p.medico_crm}` : ""}
                        </p>
                      </div>
                      {selected && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
                    </div>

                    <p className="font-semibold text-sm">{p.nome}</p>
                    {p.descricao_comercial && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.descricao_comercial}</p>
                    )}

                    <p className="mt-2 text-lg font-bold text-primary">
                      {brl(p.valor_mensal_centavos)}
                      <span className="text-xs font-normal text-muted-foreground">/mês</span>
                    </p>

                    {p.beneficios.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {p.beneficios.slice(0, 3).map((b, i) => (
                          <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
                            <span className="truncate">{b}</span>
                          </li>
                        ))}
                        {p.beneficios.length > 3 && (
                          <li className="text-[11px] text-muted-foreground pl-4">
                            +{p.beneficios.length - 3} benefício{p.beneficios.length - 3 > 1 ? "s" : ""}
                          </li>
                        )}
                      </ul>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {busca ? `Nenhum plano encontrado para "${busca}"` : "Nenhum plano disponível no momento"}
              </p>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button disabled={selectedIds.size === 0 || jaTemPlanoAtivo} onClick={() => setStep(2)}>
              Próximo <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </>
      )}

      {/* ─── STEP 2: Revisar ─── */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Resumo do plano
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Planos selecionados ({selectedPlanos.length})
              </p>
              <div className="space-y-2">
                {selectedPlanos.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl border border-border p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={p.medico_foto || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {p.medico_nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{p.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.medico_nome} · {p.medico_especialidade || "Clínico Geral"}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold">{brl(p.valor_mensal_centavos)}/mês</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{brl(valorBruto)}</span>
              </div>
              {descontoPct > 0 && (
                <div className="flex justify-between text-sm text-success">
                  <span>Desconto progressivo ({descontoPct}%)</span>
                  <span>-{brl(valorBruto - valorFinal)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t border-border pt-2">
                <span>Total mensal</span>
                <span className="text-primary">{brl(valorFinal)}</span>
              </div>
            </div>

            {regras.length > 0 && (
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p className="font-semibold">Tabela de descontos:</p>
                {regras.map((r) => (
                  <p key={r.qtd_medicos_min}>
                    • A partir de {r.qtd_medicos_min} médicos diferentes: {r.desconto_pct}% de desconto
                  </p>
                ))}
              </div>
            )}

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <span>Ao prosseguir, você será direcionado ao pagamento seguro via Stripe.</span>
              </p>
            </div>

            <div className="flex gap-2 justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button onClick={iniciarCheckout} disabled={saving || jaTemPlanoAtivo}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CreditCard className="h-4 w-4 mr-1" />}
                Ir para pagamento
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── STEP 3: Pagamento (Stripe Embedded Checkout) ─── */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 rounded-xl border border-border bg-muted/30 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Assinatura mensal</span>
                <span className="font-bold text-primary">{brl(valorFinal)}/mês</span>
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
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <TermsAcceptanceDialog
        tipo="plano_plataforma"
        open={termsPlano.showDialog}
        onOpenChange={termsPlano.setShowDialog}
        onAccepted={termsPlano.onAccepted}
      />
    </PageShell>
  );
}
