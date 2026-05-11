import { useState } from "react";
import { formatNomeMedico } from "@/lib/clinico";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck,
  Video,
  ShieldCheck,
  Stethoscope,
  Building2,
  Sparkles,
  Star,
  Clock,
  HeartPulse,
  Activity,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEspecialidadesPublicas } from "@/hooks/useEspecialidadesPublicas";
import { useMedicosDestaque } from "@/hooks/useMedicosDestaque";
import EmBreveDialog from "@/components/EmBreveDialog";
import logoSymbol from "@/assets/brand/logo-symbol-white.png";

export default function Home() {
  const { especialidades, loading: loadingEsps } = useEspecialidadesPublicas();
  const { medicos, loading: loadingMedicos } = useMedicosDestaque();
  const [emBreveNome, setEmBreveNome] = useState<string | null>(null);

  return (
    <>
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,white,transparent_55%)] opacity-10" />
        {/* Watermark símbolo Lasmar */}
        <img
          src={logoSymbol}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 -right-12 hidden h-[420px] w-auto opacity-[0.08] md:block"
        />

        <div className="container relative grid gap-12 py-20 text-primary-foreground md:grid-cols-2 md:py-28">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Saúde digital integrada
            </span>
            <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              Cuidado médico,
              <br />
              <span className="text-primary-soft">onde você estiver.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-primary-foreground/85 md:text-lg">
              Telemedicina, agenda inteligente e atendimento humanizado em uma única plataforma.
              Médicos verificados, tecnologia confiável.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-background font-semibold text-primary hover:bg-background/95">
                <Link to="/agendar">
                  Agendar consulta <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 bg-white/0 text-primary-foreground hover:bg-white/10"
              >
                <Link to="/atendimento-imediato">Atendimento imediato</Link>
              </Button>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-10 gap-y-4 text-sm">
              <Stat n="120+" l="Médicos" />
              <Stat n="35k" l="Atendimentos" />
              <Stat n="4.9★" l="Satisfação" />
            </div>
          </div>

          {/* Right: floating cards */}
          <div className="relative hidden md:block">
            <FloatCard
              className="right-0 top-4 w-72"
              icon={<Video className="h-4 w-4" />}
              title="Consulta agora"
              subtitle="Dr. Rafael Lasmar · Cardiologia"
              tag="Online"
            />
            <FloatCard
              className="left-0 top-44 w-64"
              icon={<CalendarCheck className="h-4 w-4" />}
              title="Próxima consulta"
              subtitle="Hoje, 14:30 · Telemedicina"
              tag="Confirmado"
            />
            <FloatCard
              className="bottom-0 right-10 w-72"
              icon={<HeartPulse className="h-4 w-4" />}
              title="Pressão arterial"
              subtitle="124 / 82 mmHg · Estável"
              tag="OK"
            />
          </div>
        </div>
      </section>

      {/* ─── TRUST STRIP ─── */}
      <section className="border-b border-border bg-background">
        <div className="container grid gap-x-8 gap-y-6 py-10 md:grid-cols-4">
          {[
            { icon: ShieldCheck, t: "LGPD & sigilo médico", d: "Dados criptografados" },
            { icon: Clock, t: "Atendimento em <10 min", d: "Pronto atendimento online" },
            { icon: Stethoscope, t: "Médicos verificados", d: "CRM ativo conferido" },
            { icon: Building2, t: "Solução para empresas", d: "Saúde corporativa" },
          ].map((b) => (
            <div key={b.t} className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <b.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{b.t}</p>
                <p className="text-xs text-muted-foreground">{b.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── ATENDIMENTO IMEDIATO ─── */}
      <section className="container py-16">
        <Link
          to="/atendimento-imediato"
          className="group relative block overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary-soft/30 via-background to-background p-8 transition hover:shadow-elegant md:p-10"
        >
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-elegant">
                <Activity className="h-7 w-7" />
              </span>
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                  Disponível agora
                </span>
                <h3 className="mt-2 font-display text-2xl font-bold tracking-tight">
                  Atendimento imediato
                </h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Conecte-se em minutos com o primeiro médico disponível na fila.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow transition group-hover:bg-primary/90">
              Iniciar agora <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </Link>
      </section>

      {/* ─── ESPECIALIDADES ─── */}
      <section className="container pb-20">
        <SectionHead
          eyebrow="Especialidades"
          title="Encontre o profissional certo"
          subtitle="Dezenas de especialidades médicas disponíveis para você"
          link={{ to: "/especialidades", label: "Ver todas" }}
        />
        {loadingEsps ? (
          <div className="mt-10 flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando especialidades…
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
            {especialidades.map((e) => {
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
      </section>

      {/* ─── MÉDICOS EM DESTAQUE ─── */}
      <section className="bg-muted/40 py-20">
        <div className="container">
          <SectionHead
            eyebrow="Profissionais"
            title="Médicos em destaque"
            subtitle="Avaliados e recomendados pelos nossos pacientes"
            link={{ to: "/medicos", label: "Ver todos" }}
          />
          {loadingMedicos ? (
            <div className="mt-10 flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando médicos…
            </div>
          ) : medicos.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Médicos em destaque aparecerão aqui em breve.
            </div>
          ) : (
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {medicos.map((m) => (
                <div
                  key={m.id}
                  className="rounded-2xl border border-border bg-card p-6 transition hover:border-primary/25 hover:shadow-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-primary font-bold text-primary-foreground">
                      {m.nome
                        .split(" ")
                        .filter((s) => s.length > 1)
                        .map((s) => s[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold tracking-tight">
                        {formatNomeMedico(m.tratamento, m.nome)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.especialidade ?? "Clínica"} · {m.crm}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1 text-warning">
                      <Star className="h-4 w-4 fill-current" />
                      {m.avaliacao_media?.toFixed(1) ?? "—"}
                    </span>
                    {m.online && (
                      <Badge className="bg-success/10 text-[10px] text-success hover:bg-success/15">
                        Online
                      </Badge>
                    )}
                  </div>
                  <Button asChild className="mt-5 w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    <Link to={`/agendar`}>Agendar consulta</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── CTA FINAL ─── */}
      <section className="container py-20">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary-soft/40 via-background to-background p-10 text-center md:p-16">
          <img
            src={logoSymbol}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-64 w-auto opacity-[0.06]"
          />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Comece agora
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
              Pronto para cuidar da sua saúde?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Agende em minutos, atenda por vídeo e receba receitas digitais válidas em todo Brasil.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/agendar">Agendar consulta</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/empresas">Sou empresa</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <EmBreveDialog
        open={!!emBreveNome}
        onOpenChange={(v) => {
          if (!v) setEmBreveNome(null);
        }}
        especialidade={emBreveNome ?? ""}
      />
    </>
  );
}

const Stat = ({ n, l }: { n: string; l: string }) => (
  <div>
    <p className="font-display text-2xl font-bold">{n}</p>
    <p className="text-[11px] uppercase tracking-[0.14em] text-primary-foreground/65">{l}</p>
  </div>
);

const FloatCard = ({
  className,
  icon,
  title,
  subtitle,
  tag,
}: {
  className: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tag: string;
}) => (
  <div
    className={`absolute rounded-2xl border border-border/50 bg-card/95 p-4 shadow-card backdrop-blur ${className}`}
  >
    <div className="flex items-center justify-between">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
        {tag}
      </span>
    </div>
    <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
    <p className="text-xs text-muted-foreground">{subtitle}</p>
  </div>
);

const SectionHead = ({
  eyebrow,
  title,
  subtitle,
  link,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  link?: { to: string; label: string };
}) => (
  <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
    <div>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
        {title}
      </h2>
      <p className="mt-2 text-muted-foreground">{subtitle}</p>
    </div>
    {link && (
      <Link
        to={link.to}
        className="text-sm font-semibold text-primary transition-colors hover:text-primary/80"
      >
        {link.label} →
      </Link>
    )}
  </div>
);
