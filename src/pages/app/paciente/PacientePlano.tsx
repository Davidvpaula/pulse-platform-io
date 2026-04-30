import { Link } from "react-router-dom";
import {
  BadgeCheck, CheckCircle2, XCircle, Calendar, CreditCard, Users,
  Stethoscope, Video, FileText, Repeat, ChevronRight, Sparkles, Building2,
  AlertTriangle, Download, Wallet, TrendingUp, Receipt,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  cobrancasMock,
  statusCobrancaUI,
  resumoFinanceiroMock,
} from "@/lib/mocks/financeiroMock";

/**
 * Página: Meu Plano (paciente)
 * Estado: 100% mockado, pronto para integração futura.
 * Quando o backend estiver pronto, basta substituir `planoAtual`, `historico` e
 * `planosDisponiveis` por chamadas reais (ex.: tabela `paciente_planos`).
 */

type StatusPlano = "ativo" | "vencendo" | "vencido" | "cancelado";

const statusStyles: Record<StatusPlano, { label: string; wrap: string; dot: string }> = {
  ativo:    { label: "Ativo",          wrap: "bg-success/10 text-success border-success/20",       dot: "bg-success" },
  vencendo: { label: "Vence em breve", wrap: "bg-warning/10 text-warning border-warning/20",       dot: "bg-warning" },
  vencido:  { label: "Vencido",        wrap: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" },
  cancelado:{ label: "Cancelado",      wrap: "bg-muted text-muted-foreground border-border",       dot: "bg-muted-foreground" },
};

const planoAtual = {
  nome: "Saúde Plus Família",
  operadora: "MedClin Saúde",
  plano_id: "PLN-2026-00184",
  tipo: "Familiar",
  cobertura: "Nacional",
  status: "ativo" as StatusPlano,
  inicio: "2025-02-15",
  validade: "2026-02-14",
  renovacao_automatica: true,
  carencia_concluida: true,
  mensalidade: 489.9,
  proxima_cobranca: "2026-05-15",
  forma_pagamento: "Cartão final 4421",
  titular: "Maria Silva (Você)",
  dependentes: [
    { nome: "João Silva", parentesco: "Cônjuge", idade: 38 },
    { nome: "Ana Silva",  parentesco: "Filha",   idade: 9 },
  ],
  beneficios: [
    { icon: Stethoscope, titulo: "Consultas presenciais",  detalhe: "Ilimitadas na rede credenciada" },
    { icon: Video,       titulo: "Telemedicina 24h",       detalhe: "Inclusa sem coparticipação" },
    { icon: FileText,    titulo: "Exames laboratoriais",   detalhe: "Cobertura completa nacional" },
    { icon: Repeat,      titulo: "Retorno gratuito",       detalhe: "Em até 15 dias após a consulta" },
  ],
};

const historico = [
  { id: "h1", data: "2025-02-15", evento: "Adesão ao plano Saúde Plus Família",            tipo: "ok" as const },
  { id: "h2", data: "2025-08-15", evento: "Inclusão de dependente: Ana Silva",            tipo: "info" as const },
  { id: "h3", data: "2025-12-10", evento: "Reajuste anual aplicado (+6,8%)",              tipo: "info" as const },
  { id: "h4", data: "2026-04-15", evento: "Mensalidade paga · R$ 489,90",                  tipo: "ok" as const },
];

const planosDisponiveis = [
  {
    id: "essencial",
    nome: "Essencial",
    preco: 189.9,
    destaque: false,
    bullets: ["Consultas presenciais", "Telemedicina ilimitada", "Cobertura regional"],
  },
  {
    id: "plus",
    nome: "Saúde Plus",
    preco: 489.9,
    destaque: true,
    bullets: ["Tudo do Essencial", "Cobertura nacional", "Exames laboratoriais", "Retorno gratuito"],
  },
  {
    id: "premium",
    nome: "Premium Black",
    preco: 899.0,
    destaque: false,
    bullets: ["Tudo do Plus", "Internação suíte", "Atendimento domiciliar", "Reembolso ampliado"],
  },
];

function formatBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function diasAteVencimento(iso: string) {
  const hoje = new Date();
  const fim = new Date(iso + "T00:00:00");
  return Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

export default function PacientePlano() {
  const dias = diasAteVencimento(planoAtual.validade);
  const status = planoAtual.status;
  const statusUI = statusStyles[status];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu plano"
        description="Veja sua cobertura, validade e benefícios contratados"
      />

      {/* Card principal do plano */}
      <section className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BadgeCheck className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  {planoAtual.operadora} · {planoAtual.plano_id}
                </div>
                <h2 className="text-2xl font-semibold">{planoAtual.nome}</h2>
              </div>
              <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium", statusUI.wrap)}>
                <span className={cn("h-2 w-2 rounded-full", statusUI.dot)} />
                {statusUI.label}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Info label="Tipo" value={planoAtual.tipo} />
              <Info label="Cobertura" value={planoAtual.cobertura} />
              <Info label="Início" value={formatBR(planoAtual.inicio)} />
              <Info
                label="Validade"
                value={formatBR(planoAtual.validade)}
                hint={dias > 0 ? `${dias} dias restantes` : "Vencido"}
                hintTone={dias <= 30 ? "warning" : "default"}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:w-56">
            <Button variant="outline" className="justify-start">
              <Download className="mr-2 h-4 w-4" /> Carteirinha digital
            </Button>
            <Button variant="outline" className="justify-start">
              <FileText className="mr-2 h-4 w-4" /> Contrato (PDF)
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/app/paciente/financeiro">
                <CreditCard className="mr-2 h-4 w-4" /> Histórico financeiro
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Aviso de vencimento se aplicável */}
      {dias <= 30 && dias > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-foreground">Seu plano vence em {dias} dias</p>
            <p className="text-muted-foreground">
              {planoAtual.renovacao_automatica
                ? `Renovação automática ativa. Próxima cobrança em ${formatBR(planoAtual.proxima_cobranca)}.`
                : "Renovação automática desativada. Renove para evitar interrupção."}
            </p>
          </div>
          {!planoAtual.renovacao_automatica && (
            <Button size="sm">Renovar agora</Button>
          )}
        </div>
      )}

      {/* Grid: Benefícios + Pagamento/Dependentes */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Benefícios */}
        <section className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Benefícios inclusos</h3>
            <span className="text-xs text-muted-foreground">
              {planoAtual.carencia_concluida ? "Carência concluída" : "Em carência"}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {planoAtual.beneficios.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.titulo} className="flex items-start gap-3 rounded-xl border border-border bg-background/50 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{b.titulo}</p>
                    <p className="text-xs text-muted-foreground">{b.detalhe}</p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                </div>
              );
            })}
          </div>
        </section>

        {/* Pagamento + dependentes */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <CreditCard className="h-4 w-4 text-primary" /> Pagamento
            </h3>
            <dl className="space-y-3 text-sm">
              <Row label="Mensalidade" value={formatBRL(planoAtual.mensalidade)} strong />
              <Row label="Próxima cobrança" value={formatBR(planoAtual.proxima_cobranca)} />
              <Row label="Forma" value={planoAtual.forma_pagamento} />
              <Row
                label="Renovação automática"
                value={planoAtual.renovacao_automatica ? "Ativada" : "Desativada"}
                tone={planoAtual.renovacao_automatica ? "success" : "muted"}
              />
            </dl>
            <Button variant="outline" size="sm" className="mt-4 w-full">
              Alterar forma de pagamento
            </Button>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Users className="h-4 w-4 text-primary" /> Titular e dependentes
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2">
                <div>
                  <p className="font-medium">{planoAtual.titular}</p>
                  <p className="text-xs text-muted-foreground">Titular</p>
                </div>
                <BadgeCheck className="h-4 w-4 text-primary" />
              </li>
              {planoAtual.dependentes.map((d) => (
                <li key={d.nome} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div>
                    <p className="font-medium">{d.nome}</p>
                    <p className="text-xs text-muted-foreground">{d.parentesco} · {d.idade} anos</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {/* Histórico */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Calendar className="h-4 w-4 text-primary" /> Histórico do plano
        </h3>
        <ol className="relative space-y-4 border-l border-border pl-6">
          {historico.map((h) => (
            <li key={h.id} className="relative">
              <span className={cn(
                "absolute -left-[27px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-card",
                h.tipo === "ok" ? "bg-success" : "bg-primary",
              )} />
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium">{h.evento}</p>
                <span className="text-xs text-muted-foreground">{formatBR(h.data)}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Outros planos disponíveis */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> Outros planos disponíveis
          </h3>
          <span className="text-xs text-muted-foreground">Faça upgrade quando quiser</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {planosDisponiveis.map((p) => {
            const isAtual = p.nome === "Saúde Plus";
            return (
              <div
                key={p.id}
                className={cn(
                  "relative rounded-xl border p-5 transition",
                  p.destaque
                    ? "border-primary/40 bg-primary/5 shadow-sm"
                    : "border-border bg-background/50 hover:border-primary/30",
                )}
              >
                {p.destaque && (
                  <span className="absolute -top-2 left-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                    Mais escolhido
                  </span>
                )}
                <p className="text-sm text-muted-foreground">{p.nome}</p>
                <p className="mt-1 text-2xl font-semibold">
                  {formatBRL(p.preco)}
                  <span className="text-xs font-normal text-muted-foreground">/mês</span>
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-5 w-full"
                  variant={isAtual ? "outline" : p.destaque ? "default" : "outline"}
                  disabled={isAtual}
                >
                  {isAtual ? "Plano atual" : "Fazer upgrade"}
                  {!isAtual && <ChevronRight className="ml-1 h-4 w-4" />}
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Cancelamento */}
      <section className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="text-sm">
              <p className="font-medium">Cancelar meu plano</p>
              <p className="text-muted-foreground">
                A solicitação será analisada pela operadora. Você manterá a cobertura até a próxima data de vencimento.
              </p>
            </div>
          </div>
          <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10">
            Solicitar cancelamento
          </Button>
        </div>
      </section>
    </div>
  );
}

function Info({
  label, value, hint, hintTone = "default",
}: { label: string; value: string; hint?: string; hintTone?: "default" | "warning" }) {
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

function Row({
  label, value, strong, tone,
}: { label: string; value: string; strong?: boolean; tone?: "success" | "muted" }) {
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
