import { Outlet, NavLink, Link } from "react-router-dom";
import { useState } from "react";
import { Menu, X, Activity, Mail, Phone, MapPin } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { to: "/atendimento-imediato", label: "Atendimento imediato", highlight: true },
  { to: "/especialidades", label: "Especialidades" },
  { to: "/servicos", label: "Serviços" },
  { to: "/medicos", label: "Médicos" },
  { to: "/planos", label: "Planos" },
  { to: "/empresas", label: "Empresas" },
  { to: "/para-medicos", label: "Para médicos" },
  { to: "/faq", label: "FAQ" },
];

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="container flex h-[72px] items-center justify-between gap-8">
          <Logo size="md" />

          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((l) =>
              l.highlight ? (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
                >
                  <Activity className="h-3.5 w-3.5" />
                  {l.label}
                </NavLink>
              ) : (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    cn(
                      "rounded-md px-3 py-2 text-[13px] font-medium tracking-tight transition-colors",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )
                  }
                >
                  {l.label}
                </NavLink>
              ),
            )}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Button asChild variant="ghost" size="sm" className="font-medium">
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-sm">
              <Link to="/agendar">Agendar consulta</Link>
            </Button>
          </div>

          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {open && (
          <div className="border-t border-border bg-background lg:hidden">
            <nav className="container flex flex-col gap-1 py-4">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    l.highlight
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-3 flex gap-2">
                <Button asChild variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                  <Link to="/auth">Entrar</Link>
                </Button>
                <Button asChild className="flex-1 bg-primary hover:bg-primary/90" onClick={() => setOpen(false)}>
                  <Link to="/agendar">Agendar</Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1"><Outlet /></main>

      {/* ─── FOOTER ─── */}
      <footer className="relative mt-12 border-t border-border bg-foreground text-background/90">
        <div className="container grid gap-10 py-16 md:grid-cols-12">
          {/* Brand */}
          <div className="md:col-span-4">
            <Logo variant="white" size="md" />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-background/70">
              Plataforma de telemedicina premium. Tecnologia, agilidade e cuidado humano em uma única experiência clínica.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-background/70">
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-primary-glow" />
                contato@telemedlasmar.com.br
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-primary-glow" />
                Atendimento 24h via plataforma
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-primary-glow" />
                Brasil — atendimento nacional
              </li>
            </ul>
          </div>

          {/* Plataforma */}
          <div className="md:col-span-2">
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-background/50">
              Plataforma
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <FooterLink to="/especialidades">Especialidades</FooterLink>
              <FooterLink to="/medicos">Médicos</FooterLink>
              <FooterLink to="/servicos">Serviços</FooterLink>
              <FooterLink to="/planos">Planos</FooterLink>
            </ul>
          </div>

          {/* Para você */}
          <div className="md:col-span-2">
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-background/50">
              Para você
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <FooterLink to="/atendimento-imediato">Atendimento imediato</FooterLink>
              <FooterLink to="/agendar">Agendar consulta</FooterLink>
              <FooterLink to="/empresas">Empresas</FooterLink>
              <FooterLink to="/para-medicos">Sou médico</FooterLink>
            </ul>
          </div>

          {/* Suporte */}
          <div className="md:col-span-2">
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-background/50">
              Suporte
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <FooterLink to="/faq">Perguntas frequentes</FooterLink>
              <FooterLink to="/auth">Entrar</FooterLink>
              <FooterLink to="/cadastro-medico">Cadastrar-se</FooterLink>
            </ul>
          </div>

          {/* CTA */}
          <div className="md:col-span-2">
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-background/50">
              Agende agora
            </h4>
            <p className="mt-4 text-sm text-background/70">
              Sua próxima consulta está a poucos cliques.
            </p>
            <Button asChild size="sm" className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90">
              <Link to="/agendar">Agendar consulta</Link>
            </Button>
          </div>
        </div>

        <div className="border-t border-background/10">
          <div className="container flex flex-col items-center justify-between gap-2 py-6 text-xs text-background/50 md:flex-row">
            <p>© {new Date().getFullYear()} Lasmar Telemed · Todos os direitos reservados</p>
            <p className="flex items-center gap-4">
              <Link to="/termos" className="hover:text-background">Termos</Link>
              <Link to="/privacidade" className="hover:text-background">Privacidade</Link>
              <Link to="/lgpd" className="hover:text-background">LGPD</Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const FooterLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <li>
    <Link to={to} className="text-background/70 transition-colors hover:text-background">
      {children}
    </Link>
  </li>
);
