import React from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Star, Video, Calendar, MapPin, GraduationCap } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { especialidades, medicos } from "@/lib/mock";
import { useAuth } from "@/lib/auth";

export const Especialidades = () => (
  <PageShell title="Especialidades" subtitle="Profissionais qualificados em diversas áreas da medicina.">
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {especialidades.map((e) => (
        <Link key={e.slug} to="/medicos" className="card-elevated p-6 hover:shadow-elegant transition">
          <div className="text-3xl">{e.icon}</div>
          <p className="mt-3 font-semibold">{e.nome}</p>
        </Link>
      ))}
    </div>
  </PageShell>
);

export const Medicos = () => (
  <PageShell title="Nossos médicos" subtitle="Todos com CRM ativo e perfil verificado.">
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {medicos.map((m) => (
        <div key={m.slug} className="card-elevated p-6">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-primary text-primary-foreground font-bold">
              {m.nome.split(" ").map(s => s[0]).slice(0,2).join("")}
            </div>
            <div className="flex-1">
              <p className="font-semibold">{m.nome}</p>
              <p className="text-xs text-muted-foreground">{m.especialidade} · {m.crm}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-warning">
                <Star className="h-3.5 w-3.5 fill-current" /> {m.rating}
              </p>
            </div>
            {m.online && <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">Online</span>}
          </div>
          <div className="mt-5 flex items-center justify-between">
            <span className="font-semibold">R$ {m.valor}</span>
            <Button asChild size="sm" className="bg-gradient-primary hover:opacity-90">
              <Link to={`/medicos/${m.slug}`}>Ver perfil</Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  </PageShell>
);

export const MedicoDetalhe = () => {
  const { slug } = useParams();
  const m = medicos.find((x) => x.slug === slug) ?? medicos[0];
  return (
    <PageShell title={m.nome} subtitle={`${m.especialidade} · ${m.crm}`}>
      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="card-elevated p-6 space-y-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <GraduationCap className="h-4 w-4 text-primary" /> Graduação UFMG · Residência InCor
          </div>
          <p className="text-foreground/90">
            Médico com mais de 12 anos de experiência clínica em {m.especialidade.toLowerCase()},
            atendendo casos preventivos, acompanhamento de pacientes crônicos e telemedicina.
          </p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><p className="text-muted-foreground">Avaliação</p><p className="font-semibold">{m.rating} / 5</p></div>
            <div><p className="text-muted-foreground">Modalidade</p><p className="font-semibold">Online</p></div>
            <div><p className="text-muted-foreground">Idiomas</p><p className="font-semibold">PT, EN</p></div>
          </div>
        </div>
        <div className="card-elevated p-6 h-fit">
          <p className="text-sm text-muted-foreground">Consulta a partir de</p>
          <p className="font-display text-3xl font-bold">R$ {m.valor}</p>
          <Button asChild className="mt-4 w-full bg-gradient-primary hover:opacity-90">
            <Link to="/agendar"><Video className="mr-2 h-4 w-4" /> Agendar telemedicina</Link>
          </Button>
          <Button asChild variant="outline" className="mt-2 w-full">
            <Link to="/agendar"><Calendar className="mr-2 h-4 w-4" /> Ver horários</Link>
          </Button>
          <p className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> Atende em todo Brasil
          </p>
        </div>
      </div>
    </PageShell>
  );
};

export const Agendar = () => (
  <PageShell title="Agendar consulta" subtitle="Escolha especialidade, médico e horário.">
    <div className="card-elevated p-6 grid gap-4 md:grid-cols-3">
      <Selector label="Especialidade" options={especialidades.map(e => e.nome)} />
      <Selector label="Médico" options={medicos.map(m => m.nome)} />
      <Selector label="Modalidade" options={["Telemedicina", "Pronto atendimento", "Retorno", "Empresarial"]} />
    </div>
    <div className="mt-6 grid gap-3 md:grid-cols-4">
      {["08:00", "09:30", "11:00", "14:30", "15:00", "16:30", "17:00", "19:00"].map(h => (
        <button key={h} className="card-elevated p-4 text-center hover:bg-primary hover:text-primary-foreground transition">
          {h}
        </button>
      ))}
    </div>
    <div className="mt-6">
      <Button className="bg-gradient-primary hover:opacity-90">Confirmar agendamento</Button>
    </div>
  </PageShell>
);

const Selector = ({ label, options }: { label: string; options: string[] }) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
    <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  </label>
);

export const Planos = () => {
  const planos = [
    { nome: "Essencial", preco: "R$ 49", desc: "Ideal para uso pontual", feats: ["Telemedicina sob demanda", "Receita digital", "Suporte em horário comercial"], featured: false },
    { nome: "Saúde+", preco: "R$ 119", desc: "O mais escolhido", feats: ["Consultas ilimitadas", "Pronto atendimento 24h", "Histórico digital", "Suporte prioritário"], featured: true },
    { nome: "Família", preco: "R$ 219", desc: "Até 4 pessoas", feats: ["Tudo do Saúde+", "Multi-usuário", "Pediatria incluída", "Relatórios mensais"], featured: false },
  ];
  return (
    <PageShell title="Planos" subtitle="Escolha o plano que melhor se encaixa na sua rotina.">
      <div className="grid gap-5 md:grid-cols-3">
        {planos.map(p => (
          <div key={p.nome} className={`card-elevated p-7 ${p.featured ? "ring-2 ring-primary shadow-elegant" : ""}`}>
            {p.featured && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground">Popular</span>}
            <p className="mt-3 font-display text-xl font-bold">{p.nome}</p>
            <p className="text-sm text-muted-foreground">{p.desc}</p>
            <p className="mt-4 font-display text-4xl font-extrabold">{p.preco}<span className="text-base font-medium text-muted-foreground">/mês</span></p>
            <ul className="mt-5 space-y-2 text-sm">
              {p.feats.map(f => <li key={f} className="flex gap-2"><span className="text-success">✓</span>{f}</li>)}
            </ul>
            <Button className={`mt-6 w-full ${p.featured ? "bg-gradient-primary hover:opacity-90" : ""}`} variant={p.featured ? "default" : "outline"}>
              Assinar {p.nome}
            </Button>
          </div>
        ))}
      </div>
    </PageShell>
  );
};

export const Empresas = () => (
  <PageShell title="Lasmar para empresas" subtitle="Saúde corporativa para sua equipe, com relatórios e gestão de uso.">
    <div className="grid gap-5 md:grid-cols-3">
      {[
        { t: "Funcionários ilimitados", d: "Adicione e remova pela área RH." },
        { t: "Relatórios liberados", d: "A empresa só vê o que foi autorizado." },
        { t: "Atendimento no trabalho", d: "Pronto atendimento online em obras e escritórios." },
      ].map(b => (
        <div key={b.t} className="card-elevated p-6"><p className="font-semibold">{b.t}</p><p className="mt-1 text-sm text-muted-foreground">{b.d}</p></div>
      ))}
    </div>
    <div className="mt-8"><Button className="bg-gradient-primary hover:opacity-90">Falar com especialista</Button></div>
  </PageShell>
);

export const ParaMedicos = () => (
  <PageShell title="Lasmar para médicos" subtitle="Atenda online com agenda integrada, prontuário e pagamentos.">
    <div className="grid gap-5 md:grid-cols-3">
      {[
        { t: "Agenda inteligente", d: "Sincronize Google Agenda e Meet." },
        { t: "Prontuário integrado", d: "Conexão futura com Feegow." },
        { t: "Pagamento automático", d: "Receba por consulta ou recorrência." },
      ].map(b => (
        <div key={b.t} className="card-elevated p-6"><p className="font-semibold">{b.t}</p><p className="mt-1 text-sm text-muted-foreground">{b.d}</p></div>
      ))}
    </div>
    <div className="mt-8 flex flex-wrap gap-3">
      <Button asChild className="bg-gradient-primary hover:opacity-90">
        <Link to="/cadastro/medico">Quero me cadastrar</Link>
      </Button>
      <Button asChild variant="outline">
        <Link to="/login">Já tenho conta</Link>
      </Button>
    </div>
  </PageShell>
);

export const Faq = () => {
  const itens = [
    { q: "Como funciona a telemedicina?", a: "Você agenda, recebe um link de vídeo seguro e atende pelo navegador ou app." },
    { q: "As receitas têm validade legal?", a: "Sim, com assinatura digital ICP-Brasil válida em todo território nacional." },
    { q: "Empresas têm acesso ao prontuário?", a: "Não. Empresas só visualizam relatórios e documentos liberados pelo paciente." },
    { q: "Posso cancelar uma consulta?", a: "Sim, com até 4h de antecedência sem custo." },
  ];
  return (
    <PageShell title="Perguntas frequentes">
      <div className="space-y-3 max-w-3xl">
        {itens.map(i => (
          <details key={i.q} className="card-elevated p-5">
            <summary className="cursor-pointer font-semibold">{i.q}</summary>
            <p className="mt-2 text-sm text-muted-foreground">{i.a}</p>
          </details>
        ))}
      </div>
    </PageShell>
  );
};

export const Login = () => {
  const { setProfileKey } = useAuth();
  const navigate = useNavigate();
  const isDev = import.meta.env.DEV;

  // Em produção, /login redireciona para a página real de auth.
  React.useEffect(() => {
    if (!isDev) navigate("/auth", { replace: true });
  }, [isDev, navigate]);

  if (!isDev) return null;

  const enter = (k: Parameters<typeof setProfileKey>[0], to: string) => {
    setProfileKey(k);
    navigate(to);
  };
  const demos: { k: Parameters<typeof setProfileKey>[0]; label: string; to: string }[] = [
    { k: "paciente", label: "Paciente", to: "/app/paciente/dashboard" },
    { k: "medico", label: "Médico", to: "/app/medico/dashboard" },
    { k: "secretaria", label: "Secretaria", to: "/app/secretaria/dashboard" },
    { k: "admin", label: "Admin", to: "/app/admin/dashboard" },
    { k: "empresa", label: "Empresa", to: "/app/empresa/dashboard" },
  ];
  return (
    <section className="container grid min-h-[80vh] place-items-center py-16">
      <div className="card-elevated w-full max-w-md p-8">
        <h1 className="font-display text-2xl font-bold">Acesso de demonstração</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Disponível apenas em desenvolvimento. Para entrar de verdade, use{" "}
          <Link to="/auth" className="text-primary hover:underline">/auth</Link>.
        </p>
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acesso rápido (demo)</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            {demos.map(d => (
              <button key={d.k} onClick={() => enter(d.k, d.to)} className="rounded-lg border border-border px-3 py-2 text-left hover:bg-muted">
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          É médico e ainda não tem cadastro?{" "}
          <Link to="/cadastro/medico" className="font-semibold text-primary hover:underline">Cadastre-se</Link>
        </p>
      </div>
    </section>
  );
};
