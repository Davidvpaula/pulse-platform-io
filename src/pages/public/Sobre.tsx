import { Link } from "react-router-dom";
import { Star, Clock, ShieldCheck, HeartHandshake, Award, Users, Stethoscope, CalendarCheck, ArrowRight } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";

const diferenciais = [
  {
    icon: Star,
    title: "Referência em Satisfação",
    desc: "Mais de 600 avaliações 5 estrelas no Google. Uma das plataformas mais bem avaliadas do país, com feedbacks positivos diários de pacientes reais.",
  },
  {
    icon: Clock,
    title: "Pontualidade de 90%",
    desc: "Diferente do mercado comum, respeitamos seu tempo. Nossa taxa de assiduidade médica garante que você seja atendido no horário agendado, sem faltas.",
  },
  {
    icon: ShieldCheck,
    title: "Transparência e Ética",
    desc: "Todo o nosso corpo clínico é rigorosamente verificado. Os números de CRM dos nossos médicos são públicos e validados conforme as normas do CFM em cada região.",
  },
  {
    icon: HeartHandshake,
    title: "Atendimento Humanizado",
    desc: "Unimos a agilidade do digital com o acolhimento do presencial. Consultas completas, emissão de atestados, receitas e pedidos de exames em poucos cliques.",
  },
];

const numeros = [
  { icon: Stethoscope, valor: "+10", label: "Médicos credenciados" },
  { icon: Users, valor: "+3.900", label: "Pacientes cadastrados" },
  { icon: CalendarCheck, valor: "+5.800", label: "Consultas realizadas" },
];

export default function Sobre() {
  return (
    <PageShell
      title="Sobre a Nova Saúde"
      subtitle="Tecnologia a serviço do cuidado humano."
    >
      <div className="mx-auto max-w-5xl space-y-16">
        {/* Hero / O que é */}
        <section className="card-elevated overflow-hidden">
          <div className="relative bg-gradient-to-br from-primary/5 via-background to-background p-8 sm:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Quem somos
            </p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              O que é a Nova Saúde?
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              A Nova Saúde é uma plataforma inovadora de telemedicina que conecta pacientes a
              médicos e profissionais de saúde especializados. Oferecemos consultas online com
              praticidade, segurança e conforto.
            </p>
          </div>
        </section>

        {/* Por que escolher */}
        <section>
          <div className="mb-8 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Por que escolher a Nova Saúde?
            </p>
            <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              Há 2 anos transformando o acesso à saúde no Brasil com 99,9% de aprovação.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Acreditamos que a tecnologia deve servir ao cuidado humano. Com mais de 4.000
              pacientes atendidos e uma estrutura sólida desde 2024, consolidamos nossa posição
              como referência em telemedicina de alta performance e custo-benefício.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {diferenciais.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card-elevated p-6">
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Números */}
        <section>
          <div className="grid gap-4 sm:grid-cols-3">
            {numeros.map(({ icon: Icon, valor, label }) => (
              <div
                key={label}
                className="card-elevated flex flex-col items-center p-8 text-center"
              >
                <Icon className="h-7 w-7 text-primary" />
                <p className="mt-4 font-display text-4xl font-extrabold tracking-tight text-foreground">
                  {valor}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Reconhecimentos */}
        <section className="card-elevated p-8 sm:p-10">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Reconhecimentos
              </p>
              <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight">
                Certificações que reforçam nosso compromisso
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Possuímos selo de certificação Reclame Aqui e somos uma das clínicas digitais
                mais bem avaliadas no Google, com centenas de avaliações 5 estrelas verificadas.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3">
                <Award className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Certificado</p>
                  <p className="text-sm font-semibold">Reclame Aqui</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3">
                <Star className="h-5 w-5 fill-current text-warning" />
                <div>
                  <p className="text-xs text-muted-foreground">Avaliação</p>
                  <p className="text-sm font-semibold">5,0 no Google</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="relative overflow-hidden rounded-2xl shadow-deep">
          <div className="relative bg-gradient-deep-vibrant p-8 text-deep-foreground sm:p-12">
            <div className="pointer-events-none absolute inset-0 bg-grid-soft opacity-30" aria-hidden />
            <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-primary-soft/20 blur-3xl" aria-hidden />
            <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white ring-1 ring-white/20 backdrop-blur">
                  Comece agora
                </span>
                <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                  Pronto para cuidar da sua saúde com quem entende?
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/85 sm:text-base">
                  Agende uma consulta online com um dos nossos médicos verificados em poucos cliques.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-[10px] bg-white px-6 font-semibold text-deep shadow-elegant hover:bg-white/95">
                  <Link to="/medicos">
                    Agendar consulta <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-[10px] border-white/40 bg-white/10 font-semibold text-white backdrop-blur hover:bg-white/20 hover:text-white"
                >
                  <Link to="/faq">Tire suas dúvidas</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
