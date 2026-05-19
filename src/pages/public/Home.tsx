import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Stethoscope,
  Users,
  CalendarDays,
  Star,
  Heart,
  MapPin,
  Clock,
  ShieldCheck,
  Loader2,
  HelpCircle,
  Sparkles,
  Plus,
  Activity,
  Pill,
  Cross,
  Syringe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEspecialidadesPublicas } from "@/hooks/useEspecialidadesPublicas";
import { usePublicHomeStats } from "@/hooks/usePublicHomeStats";
import EmBreveDialog from "@/components/EmBreveDialog";
import HeroServicoCarousel from "@/components/public/HeroServicoCarousel";

import diffHumanizado from "@/assets/home/diferencial-humanizado.jpg";
import diffLugar from "@/assets/home/diferencial-qualquer-lugar.jpg";
import diffMomento from "@/assets/home/diferencial-qualquer-momento.jpg";

export default function Home() {
  const { especialidades, loading: loadingEsps } = useEspecialidadesPublicas();
  const stats = usePublicHomeStats();
  const [emBreveNome, setEmBreveNome] = useState<string | null>(null);

  return (
    <>
      {/* ─── 1. HERO ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[hsl(var(--primary))] via-[hsl(var(--primary))] to-[hsl(215_70%_18%)]">
        {/* Brilho radial sutil */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,hsl(var(--primary-soft)/0.18),transparent_60%)]" />

        {/* Ícones decorativos espalhados (escondidos no mobile) */}
        <div className="pointer-events-none absolute inset-0 z-0 hidden md:block" aria-hidden="true">
          {/* Estetoscópio principal — reposicionado para topo central, longe do card */}
          <div className="absolute left-[42%] top-10 flex h-24 w-24 items-center justify-center rounded-full bg-white/10 ring-4 ring-white/5 backdrop-blur-sm lg:left-[46%] lg:top-14 lg:h-32 lg:w-32">
            <Stethoscope className="h-12 w-12 text-white/70 lg:h-16 lg:w-16" strokeWidth={1.5} />
          </div>
          <Heart className="absolute left-8 top-16 h-10 w-10 text-white/15 lg:h-14 lg:w-14" strokeWidth={1.5} />
          <Plus className="absolute left-[12%] top-[55%] h-8 w-8 text-white/20 lg:h-10 lg:w-10" strokeWidth={2} />
          <Activity className="absolute bottom-16 left-[6%] h-12 w-12 text-white/15 lg:h-16 lg:w-16" strokeWidth={1.5} />
          <Cross className="absolute left-[35%] top-[58%] h-7 w-7 rotate-12 text-white/15 lg:h-9 lg:w-9" strokeWidth={2} />
          <Sparkles className="absolute left-[55%] top-[28%] h-6 w-6 text-white/25 lg:h-8 lg:w-8" strokeWidth={1.5} />
          <ShieldCheck className="absolute right-[8%] top-[6%] h-9 w-9 text-white/15 lg:h-12 lg:w-12" strokeWidth={1.5} />
          <Pill className="absolute right-[14%] bottom-[18%] h-8 w-8 -rotate-12 text-white/15 lg:h-10 lg:w-10" strokeWidth={1.5} />
          <CalendarDays className="absolute right-[4%] bottom-8 h-9 w-9 text-white/15 lg:h-12 lg:w-12" strokeWidth={1.5} />
          <Syringe className="absolute left-[28%] bottom-10 h-7 w-7 -rotate-45 text-white/15 lg:h-9 lg:w-9" strokeWidth={1.5} />
        </div>

        <div className="container relative z-10 grid max-w-full gap-8 px-5 pb-16 pt-24 md:min-h-[640px] md:grid-cols-2 md:gap-10 md:pb-28 md:pt-36">
          {/* Texto */}
          <div className="relative z-10 flex min-w-0 max-w-xl flex-col justify-center text-white">
            <h1 className="max-w-[12ch] text-balance font-display text-[2.65rem] font-extrabold leading-[0.98] tracking-tight sm:max-w-xl sm:text-5xl md:text-6xl lg:text-[64px]">
              <span className="text-primary-soft">Saúde a distância,</span>
              <br />
              cuidado próximo.
            </h1>
            <p className="mt-5 max-w-[31ch] text-sm font-medium leading-relaxed text-white/92 sm:max-w-md sm:text-base md:text-lg">
              <span className="font-bold">Medicina acessível para quem você se importa</span>,
              com médicos que se importam com você.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                asChild
                size="lg"
                className="w-full rounded-[10px] bg-white px-7 font-semibold text-primary shadow-elegant hover:bg-white/95 sm:w-auto"
              >
                <Link to="/agendar">
                  Agendar consulta <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full rounded-[10px] border-white/70 bg-white/10 font-semibold text-white backdrop-blur-sm hover:bg-white/20 hover:text-white sm:w-auto"
              >
                <Link to="/atendimento-imediato">Atendimento imediato</Link>
              </Button>
            </div>

            {/* Contadores em tempo real */}
            <div className="mt-8 grid min-w-0 grid-cols-3 gap-2 border-t border-white/15 pt-5 sm:gap-6 md:mt-10 md:pt-6">
              <HeroCounter icon={Stethoscope} value={stats.medicos} label="Médicos cadastrados" />
              <HeroCounter icon={Users} value={stats.pacientes} label="Pacientes cadastrados" plus />
              <HeroCounter icon={CalendarDays} value={stats.consultas} label="Consultas realizadas" plus />
            </div>

          </div>

          {/* Card flutuante: Carrossel de serviços (mesma silhueta do antigo card PA) */}
          <HeroServicoCarousel />
        </div>
      </section>

      {/* ─── 2. ESPECIALIDADES (mantém hook real) ─── */}
      <section className="bg-background">
        <div className="container px-4 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Especialidades
              </span>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
                Encontre o profissional certo
              </h2>
              <p className="mt-2 max-w-xl text-muted-foreground">
                Dezenas de especialidades médicas disponíveis para você.
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-[10px]">
              <Link to="/especialidades">Ver todas</Link>
            </Button>
          </div>

          {loadingEsps ? (
            <div className="mt-10 flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando especialidades…
            </div>
          ) : (
            <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
              {especialidades.slice(0, 8).map((e) => {
                const temMedicos = e.total_medicos > 0;
                return temMedicos ? (
                  <Link
                    key={e.id}
                    to={`/agendar?esp=${e.id}`}
                    className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card"
                  >
                    <div className="text-2xl">{e.icone ?? "🩺"}</div>
                    <p className="mt-3 font-semibold tracking-tight">{e.nome}</p>
                    <p className="mt-1 text-xs text-muted-foreground transition-colors group-hover:text-primary">
                      {e.total_medicos} {e.total_medicos === 1 ? "médico" : "médicos"} →
                    </p>
                  </Link>
                ) : (
                  <button
                    key={e.id}
                    onClick={() => setEmBreveNome(e.nome)}
                    className="rounded-2xl border border-border bg-card p-5 text-left opacity-70 transition hover:opacity-90"
                  >
                    <div className="text-2xl grayscale">{e.icone ?? "🩺"}</div>
                    <p className="mt-3 font-semibold">{e.nome}</p>
                    <Badge className="mt-1.5 bg-muted text-[10px] text-muted-foreground hover:bg-muted">
                      <Clock className="mr-1 h-3 w-3" /> Em breve
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ─── 5+6. FAIXA AZUL CONTÍNUA: Diferenciais → Dúvidas → (rodapé) ─── */}
      <div
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(to bottom, hsl(198 100% 92%) 0%, hsl(198 85% 70%) 22%, hsl(204 80% 42%) 55%, hsl(200 80% 22%) 100%)",
        }}
      >
        {/* textura de quadradinhos contínua */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(to right, hsl(0 0% 100% / 0.18) 1px, transparent 1px), linear-gradient(to bottom, hsl(0 0% 100% / 0.18) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
          aria-hidden
        />
        {/* brilhos suaves */}
        <div className="pointer-events-none absolute -top-24 left-10 h-72 w-72 rounded-full bg-white/30 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute bottom-40 right-0 h-80 w-80 rounded-full bg-primary-glow/30 blur-3xl" aria-hidden />

        {/* DIFERENCIAIS */}
        <section className="relative z-10">
          <div className="container space-y-6 px-4 py-20">
            <Diferencial
              image={diffHumanizado}
              icon={Heart}
              title="Atendimento Humanizado"
              text="Médicos que escutam de verdade. Consultas sem pressa, com foco em você e na sua história clínica."
            />
            <Diferencial
              image={diffLugar}
              icon={MapPin}
              title="Em qualquer lugar"
              text="De casa, do trabalho ou em viagem. Tudo o que você precisa é uma conexão de internet — sem deslocamento, sem filas."
              reverse
            />
            <Diferencial
              image={diffMomento}
              icon={Clock}
              title="A qualquer momento"
              text="Agenda inteligente com horários ampliados. Encaixes, retornos e pronto atendimento quando você precisar."
            />
          </div>
        </section>

        {/* DÚVIDAS — sobre a mesma faixa, parte mais escura */}
        <section className="relative z-10 text-deep-foreground">
          <div className="container relative px-4 pb-24 pt-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm md:p-12">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-start gap-5">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-soft/20 text-white ring-1 ring-white/20">
                  <HelpCircle className="h-7 w-7" />
                </span>
                <div>
                  <h2 className="font-display text-3xl font-bold tracking-tight">
                    Dúvidas?
                  </h2>
                  <p className="mt-1 max-w-xl text-white/80">
                    Reunimos as perguntas mais comuns sobre consultas, planos e atendimento.
                  </p>
                </div>
              </div>
              <Button
                asChild
                size="lg"
                className="rounded-[10px] bg-white px-7 font-semibold text-deep shadow-elegant hover:bg-white/95"
              >
                <Link to="/faq">
                  Tirar dúvidas <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
        </section>
      </div>

      <EmBreveDialog
        open={!!emBreveNome}
        onOpenChange={(o) => !o && setEmBreveNome(null)}
        especialidade={emBreveNome ?? ""}
      />
    </>
  );
}

/* ───── Subcomponentes ───── */

function BigStat({
  icon: Icon,
  value,
  label,
  plus,
}: {
  icon: typeof Stethoscope;
  value: number;
  label: string;
  plus?: boolean;
}) {
  const display = useCountUp(value);
  const formatted = display.toLocaleString("pt-BR");
  return (
    <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-primary-soft ring-1 ring-white/20 backdrop-blur">
        <Icon className="h-6 w-6" strokeWidth={1.75} />
      </span>
      <p className="mt-4 font-display text-4xl font-extrabold tracking-tight text-white md:text-5xl">
        {plus ? "+" : ""}{formatted}
      </p>
      <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-soft/90">
        {label}
      </p>
    </div>
  );
}

function HeroCounter({
  icon: Icon,
  value,
  label,
  plus,
}: {
  icon: typeof Stethoscope;
  value: number;
  label: string;
  plus?: boolean;
}) {
  const display = useCountUp(value);
  const formatted = display.toLocaleString("pt-BR");
  return (
    <div className="flex min-w-0 flex-col items-start text-white">
      <Icon className="mb-1.5 h-4 w-4 text-white/80 sm:mb-2 sm:h-6 sm:w-6" strokeWidth={1.75} />
      <p className="max-w-full truncate font-display text-lg font-extrabold leading-none tracking-tight tabular-nums sm:text-3xl md:text-4xl">
        {plus ? "+" : ""}
        {formatted}
      </p>
      <p className="mt-1.5 text-[9px] font-semibold uppercase leading-tight tracking-[0.12em] text-white/70 sm:text-xs sm:tracking-[0.14em]">
        {label}
      </p>
    </div>
  );
}


function useCountUp(target: number, durationMs = 1500) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!target) {
      setValue(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

function Diferencial({
  image,
  icon: Icon,
  title,
  text,
  reverse,
}: {
  image: string;
  icon: typeof Heart;
  title: string;
  text: string;
  reverse?: boolean;
}) {
  return (
    <article
      className={`grid overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md md:grid-cols-2 ${
        reverse ? "md:[&>div:first-child]:order-2" : ""
      }`}
    >
      <div className="relative min-h-[260px]">
        <img
          src={image}
          alt={title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          width={900}
          height={600}
        />
      </div>
      <div className="flex flex-col justify-center gap-4 p-8 md:p-12">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <h3 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {title}
        </h3>
        <p className="text-muted-foreground">{text}</p>
      </div>
    </article>
  );
}
