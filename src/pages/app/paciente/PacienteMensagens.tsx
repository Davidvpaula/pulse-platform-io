import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell, Calendar, CheckCircle2, Repeat, CreditCard, FileText, Video,
  AlertTriangle, Search, Inbox, Filter, Check, Trash2, Settings,
  Stethoscope, MessageSquare, Sparkles, ChevronRight, Clock,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Página: Mensagens (paciente)
 * Sistema interno de notificações automáticas — apenas visual / mocks.
 * Quando integrar, substituir `mensagensMock` por leitura da tabela `notificacoes`
 * filtrada pelo paciente_id, e mover `marcarLida`/`apagar` para mutations.
 */

type Categoria =
  | "lembrete"
  | "alteracao"
  | "retorno"
  | "pagamento"
  | "documento"
  | "telemedicina"
  | "sistema";

type Mensagem = {
  id: string;
  categoria: Categoria;
  titulo: string;
  resumo: string;
  corpo: string;
  data: string;     // ISO
  lida: boolean;
  importante?: boolean;
  cta?: { label: string; to: string };
  remetente?: string;
};

const catMeta: Record<Categoria, { label: string; icon: typeof Bell; color: string; bg: string }> = {
  lembrete:     { label: "Lembrete",     icon: Bell,           color: "text-primary",     bg: "bg-primary/10" },
  alteracao:    { label: "Alteração",    icon: AlertTriangle,  color: "text-warning",     bg: "bg-warning/10" },
  retorno:      { label: "Retorno",      icon: Repeat,         color: "text-success",     bg: "bg-success/10" },
  pagamento:    { label: "Pagamento",    icon: CreditCard,     color: "text-destructive", bg: "bg-destructive/10" },
  documento:    { label: "Documento",    icon: FileText,       color: "text-primary",     bg: "bg-primary/10" },
  telemedicina: { label: "Telemedicina", icon: Video,          color: "text-primary",     bg: "bg-primary/10" },
  sistema:      { label: "Sistema",      icon: Sparkles,       color: "text-muted-foreground", bg: "bg-muted" },
};

const mensagensMock: Mensagem[] = [
  {
    id: "m1",
    categoria: "lembrete",
    titulo: "Sua consulta começa em 1 hora",
    resumo: "Dr. Rafael Lasmar · Cardiologia · 14:30",
    corpo: "Lembre-se de chegar 15 minutos antes ou, se for telemedicina, testar câmera e microfone. Você pode acessar a sala diretamente pelo botão abaixo.",
    data: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    lida: false,
    importante: true,
    cta: { label: "Entrar na sala", to: "/app/paciente/agendamentos" },
    remetente: "MedClin · Automático",
  },
  {
    id: "m2",
    categoria: "retorno",
    titulo: "Você ganhou um retorno gratuito 🎉",
    resumo: "Cardiologia · válido por 15 dias",
    corpo: "Sua consulta com Dr. Rafael Lasmar dá direito a um retorno gratuito em até 15 dias. Aproveite enquanto está dentro do prazo.",
    data: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    lida: false,
    cta: { label: "Agendar retorno", to: "/agendar" },
    remetente: "MedClin · Automático",
  },
  {
    id: "m3",
    categoria: "alteracao",
    titulo: "Horário da sua consulta foi alterado",
    resumo: "Dra. Camila Mendes · de 10:00 para 11:30",
    corpo: "A secretaria reagendou sua consulta de Dermatologia para o dia 03/05/2026 às 11:30. Se não puder comparecer, reagende ou cancele com até 24h de antecedência.",
    data: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    lida: false,
    importante: true,
    cta: { label: "Ver consulta", to: "/app/paciente/agendamentos" },
    remetente: "Secretaria · MedClin",
  },
  {
    id: "m4",
    categoria: "pagamento",
    titulo: "Pagamento pendente · R$ 220,00",
    resumo: "Vence hoje · Consulta de Cardiologia",
    corpo: "Sua consulta só será confirmada após o pagamento. Você pode pagar via Pix, cartão ou boleto.",
    data: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    lida: false,
    cta: { label: "Pagar agora", to: "/app/paciente/financeiro" },
    remetente: "Financeiro · Automático",
  },
  {
    id: "m5",
    categoria: "documento",
    titulo: "Nova receita disponível",
    resumo: "Emitida por Dr. Rafael Lasmar",
    corpo: "Sua receita foi assinada digitalmente e está disponível para download na seção Documentos.",
    data: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    lida: true,
    cta: { label: "Abrir documento", to: "/app/paciente/documentos" },
    remetente: "Dr. Rafael Lasmar",
  },
  {
    id: "m6",
    categoria: "telemedicina",
    titulo: "Sua sala de telemedicina está pronta",
    resumo: "Consulta de 30/04 às 14:30",
    corpo: "Acesse pelo computador ou celular. Recomendamos usar Chrome ou Safari atualizados e fones de ouvido.",
    data: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    lida: true,
    cta: { label: "Testar agora", to: "/app/paciente/agendamentos" },
    remetente: "MedClin · Automático",
  },
  {
    id: "m7",
    categoria: "lembrete",
    titulo: "Confirme sua presença",
    resumo: "Consulta amanhã às 09:00",
    corpo: "Confirme sua presença para garantir o horário. Caso não confirme em até 12h, sua vaga poderá ser liberada.",
    data: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    lida: true,
    cta: { label: "Confirmar", to: "/app/paciente/agendamentos" },
    remetente: "MedClin · Automático",
  },
  {
    id: "m8",
    categoria: "sistema",
    titulo: "Bem-vinda ao MedClin",
    resumo: "Tudo pronto para sua primeira consulta",
    corpo: "Complete seu perfil para agilizar atendimentos e ativar lembretes por WhatsApp.",
    data: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    lida: true,
    cta: { label: "Completar perfil", to: "/app/paciente/perfil" },
    remetente: "MedClin",
  },
];

const filtros: { key: "todas" | "nao_lidas" | "importantes" | Categoria; label: string }[] = [
  { key: "todas",       label: "Todas" },
  { key: "nao_lidas",   label: "Não lidas" },
  { key: "importantes", label: "Importantes" },
  { key: "lembrete",    label: "Lembretes" },
  { key: "alteracao",   label: "Alterações" },
  { key: "retorno",     label: "Retornos" },
  { key: "pagamento",   label: "Pagamentos" },
  { key: "documento",   label: "Documentos" },
];

function formatTempo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function formatDataCompleta(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function PacienteMensagens() {
  const [mensagens, setMensagens] = useState<Mensagem[]>(mensagensMock);
  const [filtro, setFiltro] = useState<typeof filtros[number]["key"]>("todas");
  const [busca, setBusca] = useState("");
  const [selecionadaId, setSelecionadaId] = useState<string>(mensagensMock[0].id);

  const filtradas = useMemo(() => {
    return mensagens.filter((m) => {
      if (filtro === "nao_lidas" && m.lida) return false;
      if (filtro === "importantes" && !m.importante) return false;
      if (!["todas", "nao_lidas", "importantes"].includes(filtro) && m.categoria !== filtro) return false;
      if (busca && !(`${m.titulo} ${m.resumo} ${m.corpo}`.toLowerCase().includes(busca.toLowerCase()))) return false;
      return true;
    });
  }, [mensagens, filtro, busca]);

  const selecionada = mensagens.find((m) => m.id === selecionadaId) ?? filtradas[0];
  const naoLidas = mensagens.filter((m) => !m.lida).length;

  const marcarLida = (id: string) =>
    setMensagens((xs) => xs.map((m) => (m.id === id ? { ...m, lida: true } : m)));

  const marcarTodasLidas = () =>
    setMensagens((xs) => xs.map((m) => ({ ...m, lida: true })));

  const apagar = (id: string) => {
    setMensagens((xs) => xs.filter((m) => m.id !== id));
    if (selecionadaId === id) setSelecionadaId(mensagens[0]?.id ?? "");
  };

  const handleSelect = (id: string) => {
    setSelecionadaId(id);
    marcarLida(id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mensagens"
        description="Lembretes automáticos, alterações de consulta, retornos e avisos do sistema"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={marcarTodasLidas} disabled={naoLidas === 0}>
              <Check className="mr-2 h-4 w-4" /> Marcar todas como lidas
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/app/paciente/perfil">
                <Settings className="mr-2 h-4 w-4" /> Preferências
              </Link>
            </Button>
          </div>
        }
      />

      {/* Resumo de categorias (chips estatísticos) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatChip icon={Inbox}    label="Total"        value={mensagens.length}            tone="primary" />
        <StatChip icon={Bell}     label="Não lidas"    value={naoLidas}                    tone="warning" />
        <StatChip icon={Calendar} label="Lembretes"    value={mensagens.filter(m => m.categoria === "lembrete").length} tone="primary" />
        <StatChip icon={Repeat}   label="Retornos"     value={mensagens.filter(m => m.categoria === "retorno").length}  tone="success" />
      </div>

      {/* Layout inbox: lista + detalhe */}
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        {/* Coluna esquerda: filtros + lista */}
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar mensagens..."
                className="pl-9"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {filtros.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFiltro(f.key)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    filtro === f.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <ul className="max-h-[640px] divide-y divide-border overflow-y-auto">
            {filtradas.length === 0 && (
              <li className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
                <Inbox className="h-8 w-8 opacity-50" />
                Nenhuma mensagem por aqui
              </li>
            )}
            {filtradas.map((m) => {
              const Cat = catMeta[m.categoria];
              const Icon = Cat.icon;
              const ativa = m.id === selecionada?.id;
              return (
                <li key={m.id}>
                  <button
                    onClick={() => handleSelect(m.id)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-accent/30",
                      ativa && "bg-accent/40",
                    )}
                  >
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", Cat.bg)}>
                      <Icon className={cn("h-4 w-4", Cat.color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {!m.lida && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                        <p className={cn("truncate text-sm", m.lida ? "font-medium text-foreground/80" : "font-semibold")}>
                          {m.titulo}
                        </p>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{m.resumo}</p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatTempo(m.data)}
                        {m.importante && (
                          <span className="ml-auto rounded-full bg-warning/15 px-2 py-0.5 font-medium text-warning">
                            Importante
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Coluna direita: detalhe */}
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          {!selecionada ? (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 p-10 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Selecione uma mensagem para ler</p>
            </div>
          ) : (
            <article className="flex h-full flex-col">
              {/* Header da mensagem */}
              <header className="border-b border-border p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", catMeta[selecionada.categoria].bg)}>
                      {(() => {
                        const Icon = catMeta[selecionada.categoria].icon;
                        return <Icon className={cn("h-5 w-5", catMeta[selecionada.categoria].color)} />;
                      })()}
                    </div>
                    <div>
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                        catMeta[selecionada.categoria].bg,
                        catMeta[selecionada.categoria].color,
                      )}>
                        {catMeta[selecionada.categoria].label}
                      </span>
                      <h2 className="mt-2 text-xl font-semibold leading-tight">{selecionada.titulo}</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selecionada.remetente ?? "Sistema"} · {formatDataCompleta(selecionada.data)}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => apagar(selecionada.id)} title="Apagar">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </header>

              {/* Corpo */}
              <div className="flex-1 space-y-4 p-6 text-sm leading-relaxed text-foreground/90">
                <p className="font-medium text-foreground">{selecionada.resumo}</p>
                <p>{selecionada.corpo}</p>

                {selecionada.categoria === "retorno" && (
                  <div className="flex items-start gap-3 rounded-xl border border-success/20 bg-success/5 p-4">
                    <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                    <div className="text-sm">
                      <p className="font-medium">Benefício do seu plano</p>
                      <p className="text-muted-foreground">
                        Retornos em até 15 dias após a consulta são cobertos pelo plano Saúde Plus.
                      </p>
                    </div>
                  </div>
                )}

                {selecionada.categoria === "pagamento" && (
                  <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                    <div className="text-sm">
                      <p className="font-medium">Atenção ao prazo</p>
                      <p className="text-muted-foreground">
                        Sem o pagamento, sua consulta pode ser cancelada automaticamente.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer com CTA */}
              {selecionada.cta && (
                <footer className="border-t border-border bg-background/50 p-4">
                  <Button asChild className="w-full sm:w-auto">
                    <Link to={selecionada.cta.to}>
                      {selecionada.cta.label}
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </footer>
              )}
            </article>
          )}
        </section>
      </div>

      {/* Aviso sobre comunicação automática */}
      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm">
        <Stethoscope className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="flex-1">
          <p className="font-medium">Sistema de comunicação automática</p>
          <p className="text-muted-foreground">
            Estas mensagens são enviadas automaticamente pela clínica para mantê-lo informado sobre consultas, retornos, pagamentos e documentos. Você pode ajustar o que recebe por e-mail e WhatsApp em <Link to="/app/paciente/perfil" className="text-primary underline-offset-2 hover:underline">Preferências</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatChip({
  icon: Icon, label, value, tone,
}: { icon: typeof Bell; label: string; value: number; tone: "primary" | "warning" | "success" }) {
  const toneCls = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/10 text-warning",
    success: "bg-success/10 text-success",
  }[tone];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", toneCls)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold leading-none">{value}</p>
      </div>
    </div>
  );
}
