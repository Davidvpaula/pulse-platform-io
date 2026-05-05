import React from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck, CheckCircle2, Calendar, CreditCard, ChevronRight,
  Sparkles, AlertTriangle, TrendingUp, Receipt, Wallet,
  Stethoscope, Heart, Activity, Package, ArrowUpRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { brl, formatDataBR } from "@/lib/format";

/* ─────────── Status styles ─────────── */

export type StatusPlano = "ativa" | "trial" | "pausada" | "cancelada" | "inadimplente";

export const statusStyles: Record<StatusPlano, { label: string; wrap: string; dot: string }> = {
  ativa:        { label: "Ativo",        wrap: "bg-success/10 text-success border-success/20",             dot: "bg-success" },
  trial:        { label: "Trial",        wrap: "bg-primary/10 text-primary border-primary/20",             dot: "bg-primary" },
  pausada:      { label: "Pausado",      wrap: "bg-warning/10 text-warning border-warning/20",             dot: "bg-warning" },
  cancelada:    { label: "Cancelado",    wrap: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" },
  inadimplente: { label: "Inadimplente", wrap: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" },
};

export const beneficioIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  especialidade: Stethoscope,
  medico: Heart,
  servico: Activity,
  categoria: Package,
  desconto_geral: BadgeCheck,
};

/* ─────────── Helpers ─────────── */

export function diasAteData(iso: string | null | undefined) {
  if (!iso) return null;
  const hoje = new Date();
  const fim = new Date(iso + "T00:00:00");
  return Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

/* ─────────── Sub-components ─────────── */

export function Info({ label, value, hint, hintTone = "default" }: {
  label: string; value: string; hint?: string; hintTone?: "default" | "warning";
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
      {hint && (
        <p className={cn("mt-0.5 text-xs", hintTone === "warning" ? "text-warning" : "text-muted-foreground")}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function Row({ label, value, strong, tone }: {
  label: string; value: string; strong?: boolean; tone?: "success" | "muted";
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn(
        strong ? "text-base font-semibold" : "font-medium",
        tone === "success" && "text-success",
        tone === "muted" && "text-muted-foreground",
      )}>{value}</dd>
    </div>
  );
}

export function KpiCard({ icon: Icon, label, value, hint, tone = "default" }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; hint?: string;
  tone?: "default" | "success" | "warning" | "muted";
}) {
  const toneCls =
    tone === "success" ? "text-success bg-success/10"
    : tone === "warning" ? "text-warning bg-warning/10"
    : tone === "muted" ? "text-muted-foreground bg-muted"
    : "text-primary bg-primary/10";

  return (
    <div className="rounded-xl border border-border bg-background/50 p-4">
      <div className="flex items-center gap-2">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", toneCls)}>
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2 text-xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ─────────── Resumo Financeiro ─────────── */

export function ResumoFinanceiro({ resumo, pagamentos }: { resumo: any; pagamentos: any[] }) {
  const ultimas = pagamentos.slice(0, 5);
  if (pagamentos.length === 0) return null;

  const statusLabel: Record<string, { label: string; wrap: string; dot: string }> = {
    aprovado:    { label: "Pago",        wrap: "bg-success/10 text-success border-success/20",             dot: "bg-success" },
    pago:        { label: "Pago",        wrap: "bg-success/10 text-success border-success/20",             dot: "bg-success" },
    pendente:    { label: "Pendente",    wrap: "bg-warning/10 text-warning border-warning/20",             dot: "bg-warning" },
    processando: { label: "Processando", wrap: "bg-primary/10 text-primary border-primary/20",            dot: "bg-primary" },
    falhou:      { label: "Falhou",      wrap: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" },
    recusado:    { label: "Recusado",    wrap: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" },
    reembolsado: { label: "Reembolsado", wrap: "bg-muted text-muted-foreground border-border",            dot: "bg-muted-foreground" },
    cancelado:   { label: "Cancelado",   wrap: "bg-muted text-muted-foreground border-border",            dot: "bg-muted-foreground" },
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Wallet className="h-4 w-4 text-primary" /> Resumo financeiro
        </h3>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/app/paciente/financeiro">
            Ver tudo <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard icon={TrendingUp} label="Pago nos últimos 12 meses" value={brl(resumo.totalPago)} tone="success" />
        <KpiCard
          icon={AlertTriangle}
          label="A pagar"
          value={brl(resumo.aPagar)}
          hint={`${resumo.pendentesCount} cobrança${resumo.pendentesCount === 1 ? "" : "s"} pendente${resumo.pendentesCount === 1 ? "" : "s"}`}
          tone={resumo.pendentesCount > 0 ? "warning" : "muted"}
        />
        <KpiCard
          icon={Receipt}
          label="Última paga"
          value={resumo.ultimaPaga ? brl(resumo.ultimaPaga.valor_centavos) : "—"}
          hint={resumo.ultimaPaga ? formatDataBR(resumo.ultimaPaga.paid_at?.slice(0, 10) || resumo.ultimaPaga.created_at?.slice(0, 10)) : "Sem registros"}
          tone="default"
        />
      </div>

      {ultimas.length > 0 && (
        <div className="mt-5 overflow-hidden rounded-xl border border-border">
          <ul className="divide-y divide-border">
            {ultimas.map((c) => {
              const ui = statusLabel[c.status] || statusLabel.pendente;
              return (
                <li key={c.id} className="flex items-center gap-3 p-3 sm:p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.metodo || "Pagamento"}</p>
                    <p className="text-xs text-muted-foreground">{formatDataBR(c.created_at?.slice(0, 10))}</p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-semibold">{brl(c.valor_centavos)}</p>
                  </div>
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium", ui.wrap)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", ui.dot)} />
                    {ui.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ─────────── Planos Disponíveis Section ─────────── */

export function PlanosDisponiveisSection({
  planos, planoAtualIds, onSelecionar,
}: {
  planos: any[];
  planoAtualIds: string[];
  onSelecionar: (id: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-4 w-4 text-primary" /> Planos disponíveis
        </h3>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/app/paciente/montar-plano">
            Montar plano personalizado <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {planos.map((p) => {
          const isAtual = planoAtualIds.includes(p.id);
          return (
            <div
              key={p.id}
              className={cn(
                "relative rounded-xl border p-5 transition",
                isAtual
                  ? "border-success/40 bg-success/5"
                  : p.destacado
                  ? "border-primary/40 bg-primary/5 shadow-sm"
                  : "border-border bg-background/50 hover:border-primary/30",
              )}
            >
              {isAtual ? (
                <span className="absolute -top-2 left-4 rounded-full bg-success px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success-foreground">
                  Seu plano
                </span>
              ) : p.destacado ? (
                <span className="absolute -top-2 left-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                  Mais escolhido
                </span>
              ) : null}
              <p className="text-sm text-muted-foreground">{p.nome}</p>
              <p className="mt-1 text-2xl font-semibold">
                {brl(p.valor_mensal_centavos)}
                <span className="text-xs font-normal text-muted-foreground">/mês</span>
              </p>
              {p.plano_beneficios && p.plano_beneficios.length > 0 && (
                <ul className="mt-4 space-y-2 text-sm">
                  {p.plano_beneficios.slice(0, 4).map((b: any, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span>{b.nome}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                className="mt-5 w-full"
                variant={isAtual ? "outline" : "default"}
                disabled={isAtual}
                onClick={() => onSelecionar(p.id)}
              >
                {isAtual ? "Plano atual" : "Selecionar"}
                {!isAtual && <ArrowUpRight className="ml-1 h-4 w-4" />}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────── Confirmação Dialog ─────────── */

export function ConfirmacaoDialog({
  acao, planoAtual, processando, onCancelar, onConfirmar,
}: {
  acao: any;
  planoAtual: any;
  processando: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  if (!acao) return null;

  const titulo = acao.tipo === "upgrade"
    ? "Confirmar upgrade de plano"
    : acao.tipo === "downgrade"
    ? "Confirmar downgrade de plano"
    : "Confirmar troca de plano";

  return (
    <Dialog open={!!acao} onOpenChange={(o) => { if (!o) onCancelar(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            Revise os detalhes. A integração de pagamento será ativada em breve.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Plano atual</span>
            <span className="font-medium">{planoAtual?.nome} · {brl(planoAtual?.valor_mensal_centavos)}/mês</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Novo plano</span>
            <span className="font-semibold">{acao.planoNome} · {brl(acao.planoPreco)}/mês</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onCancelar} disabled={processando}>
            Voltar
          </Button>
          <Button onClick={onConfirmar} disabled={processando}>
            {processando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
