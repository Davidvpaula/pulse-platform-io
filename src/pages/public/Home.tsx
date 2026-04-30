import { Link } from "react-router-dom";
import { ArrowRight, CalendarCheck, Video, ShieldCheck, Stethoscope, Building2, Sparkles, Star, Clock, HeartPulse, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { especialidades, medicos } from "@/lib/mock";

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-95" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,white,transparent_60%)] opacity-15" />
        <div className="container relative grid gap-12 py-20 md:grid-cols-2 md:py-28 text-primary-foreground">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Saúde digital integrada
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] md:text-6xl">
              Cuidado médico,<br />onde você estiver.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-primary-foreground/85">
              Telemedicina, prontuário, agenda e empresas em uma única plataforma.
              Atendimento ágil, médicos verificados e tecnologia de verdade.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-background text-primary hover:bg-background/90 font-semibold">
                <Link to="/agendar">Agendar agora <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/40 bg-white/0 text-primary-foreground hover:bg-white/10">
                <Link to="/medicos">Ver médicos</Link>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-sm">
              <Stat n="120+" l="Médicos" />
              <Stat n="35k" l="Atendimentos" />
              <Stat n="4.9★" l="Satisfação" />
            </div>
          </div>

          {/* Right: floating cards */}
          <div className="relative hidden md:block">
            <FloatCard className="top-4 right-0 w-72" icon={<Video className="h-4 w-4" />} title="Consulta agora" subtitle="Dr. Rafael Lasmar · Cardiologia" tag="Online" />
            <FloatCard className="top-44 left-0 w-64" icon={<CalendarCheck className="h-4 w-4" />} title="Próxima consulta" subtitle="Hoje, 14:30 · Telemedicina" tag="Confirmado" />
            <FloatCard className="bottom-0 right-10 w-72" icon={<HeartPulse className="h-4 w-4" />} title="Pressão arterial" subtitle="124 / 82 mmHg · Estável" tag="OK" />
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="border-y border-border bg-muted/30">
        <div className="container grid gap-6 py-10 md:grid-cols-4">
          {[
            { icon: ShieldCheck, t: "LGPD & sigilo médico", d: "Dados criptografados" },
            { icon: Clock, t: "Atendimento em <10min", d: "Pronto atendimento online" },
            { icon: Stethoscope, t: "Médicos verificados", d: "CRM ativo conferido" },
            { icon: Building2, t: "Solução para empresas", d: "Saúde corporativa" },
          ].map((b) => (
            <div key={b.t} className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary">
                <b.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-sm">{b.t}</p>
                <p className="text-xs text-muted-foreground">{b.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ATENDIMENTO IMEDIATO */}
      <section className="container py-12">
        <Link
          to="/atendimento-imediato"
          className="group block overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-emerald-100/50 to-background p-6 md:p-8 shadow-sm transition hover:shadow-elegant"
        >
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-xl bg-emerald-500 text-white shadow-md">
                <Activity className="h-7 w-7" />
              </span>
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  Agora
                </span>
                <h3 className="mt-1 font-display text-2xl font-bold">⚡ Atendimento imediato</h3>
                <p className="text-sm text-muted-foreground">
                  Conecte-se em minutos com o primeiro médico disponível.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow group-hover:bg-emerald-700">
              Iniciar agora <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </Link>
      </section>

      {/* ESPECIALIDADES */}
      <section className="container py-20">
        <SectionHead title="Especialidades disponíveis" subtitle="Encontre o profissional certo para você" link={{ to: "/especialidades", label: "Ver todas" }} />
        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
          {especialidades.map((e) => (
            <Link key={e.slug} to={`/medicos`} className="group card-elevated p-5 transition hover:-translate-y-0.5 hover:shadow-elegant">
              <div className="text-2xl">{e.icon}</div>
              <p className="mt-3 font-semibold">{e.nome}</p>
              <p className="mt-1 text-xs text-muted-foreground group-hover:text-primary">Ver médicos →</p>
            </Link>
          ))}
        </div>
      </section>

      {/* MÉDICOS */}
      <section className="bg-muted/30 py-20">
        <div className="container">
          <SectionHead title="Médicos em destaque" subtitle="Profissionais avaliados pelos pacientes" link={{ to: "/medicos", label: "Ver todos" }} />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {medicos.slice(0, 3).map((m) => (
              <div key={m.slug} className="card-elevated p-6">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-primary text-primary-foreground font-bold">
                    {m.nome.split(" ").map(s => s[0]).slice(0,2).join("")}
                  </div>
                  <div>
                    <p className="font-semibold">{m.nome}</p>
                    <p className="text-xs text-muted-foreground">{m.especialidade} · {m.crm}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1 text-warning">
                    <Star className="h-4 w-4 fill-current" /> {m.rating}
                  </span>
                  <span className="font-semibold text-foreground">R$ {m.valor}</span>
                </div>
                <Button asChild className="mt-5 w-full bg-gradient-primary hover:opacity-90">
                  <Link to={`/medicos/${m.slug}`}>Ver perfil</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20">
        <div className="card-elevated overflow-hidden p-10 md:p-14 gradient-soft text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Pronto para cuidar da sua saúde?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Agende em minutos, atenda por vídeo e receba receitas digitais válidas em todo Brasil.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-primary hover:opacity-90">
              <Link to="/agendar">Agendar consulta</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/empresas">Sou empresa</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

const Stat = ({ n, l }: { n: string; l: string }) => (
  <div>
    <p className="font-display text-2xl font-bold">{n}</p>
    <p className="text-xs uppercase tracking-wider text-primary-foreground/70">{l}</p>
  </div>
);

const FloatCard = ({ className, icon, title, subtitle, tag }:
  { className: string; icon: React.ReactNode; title: string; subtitle: string; tag: string }) => (
  <div className={`absolute card-elevated bg-card/95 backdrop-blur p-4 ${className}`}>
    <div className="flex items-center justify-between">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary">{icon}</span>
      <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">{tag}</span>
    </div>
    <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
    <p className="text-xs text-muted-foreground">{subtitle}</p>
  </div>
);

const SectionHead = ({ title, subtitle, link }: { title: string; subtitle: string; link?: { to: string; label: string } }) => (
  <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
    <div>
      <h2 className="font-display text-3xl font-bold">{title}</h2>
      <p className="mt-1 text-muted-foreground">{subtitle}</p>
    </div>
    {link && (
      <Link to={link.to} className="text-sm font-semibold text-primary hover:underline">
        {link.label} →
      </Link>
    )}
  </div>
);
