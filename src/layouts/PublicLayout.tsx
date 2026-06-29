import { Outlet, NavLink, Link } from "react-router-dom";
import { useState } from "react";
import { Menu, X, Mail, Phone, MapPin } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { to: "/medicos", label: "Médicos" },
  { to: "/servicos", label: "Serviços" },
  { to: "/planos", label: "Planos" },
  { to: "/empresas", label: "Empresas" },
  { to: "/sobre", label: "Sobre" },
  { to: "/faq", label: "FAQ" },
];

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* faixa fina decorativa Nova Saúde */}
      <div className="h-1 w-full bg-gradient-deep-vibrant" aria-hidden />
      {/* ─── HEADER SÓLIDO FULL-WIDTH ─── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 shadow-[0_1px_0_0_rgba(0,0,0,0.02),0_8px_24px_-12px_rgba(15,42,68,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="container flex h-16 items-center justify-between gap-4">
          {/* Logo — alinhado à esquerda, tamanho legível */}
          <Link to="/" aria-label="Nova Saúde — início" className="flex shrink-0 items-center">
            <Logo size="md" asImage />
          </Link>

          {/* Navegação principal */}
          <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
            {links.map((l, i) => (
              <NavLink
                key={`${l.to}-${i}`}
                to={l.to}
                end={l.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "relative rounded-full px-3 py-2 text-[13.5px] tracking-tight transition-colors whitespace-nowrap",
                    "after:absolute after:left-1/2 after:bottom-0.5 after:h-[2px] after:-translate-x-1/2 after:rounded-full after:bg-primary after:transition-all",
                    isActive
                      ? "font-semibold text-foreground after:w-5"
                      : "font-medium text-foreground/70 hover:text-foreground after:w-0 hover:after:w-3",
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          {/* CTAs */}
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <Button asChild variant="ghost" className="h-10 rounded-[10px] px-4 text-sm font-medium text-foreground/80 hover:text-foreground">
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button
              asChild
              className="h-10 rounded-[10px] bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
            >
              <Link to="/auth?mode=signup">Cadastre-se</Link>
            </Button>
          </div>

          {/* Hamburguer mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-[10px] md:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Abrir menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {open && (
            <nav className="absolute left-0 right-0 top-full flex flex-col gap-1 border-b border-border bg-background p-4 shadow-lg md:hidden">
              {links.map((l, i) => (
                <Link
                  key={`m-${l.to}-${i}`}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-3 text-sm font-medium text-foreground hover:bg-muted"
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-3 flex gap-2">
                <Button asChild variant="outline" className="flex-1 rounded-[10px]" onClick={() => setOpen(false)}>
                  <Link to="/auth">Entrar</Link>
                </Button>
                <Button
                  asChild
                  className="flex-1 rounded-[10px] bg-primary font-semibold hover:bg-primary/90"
                  onClick={() => setOpen(false)}
                >
                  <Link to="/auth?mode=signup">Cadastre-se</Link>
                </Button>
              </div>
            </nav>
          )}
        </div>
      </header>

      <main className="flex-1"><Outlet /></main>

      {/* ─── FOOTER ─── */}
      <footer className="relative border-t border-black/30 text-deep-foreground/90" style={{ background: "linear-gradient(180deg, hsl(200 85% 10%) 0%, hsl(200 90% 6%) 100%)" }}>
        <div
          className="pointer-events-none absolute inset-0 bg-grid-soft"
          style={{
            WebkitMaskImage: "linear-gradient(to bottom, hsl(0 0% 0% / 0.55) 0%, hsl(0 0% 0% / 0.25) 40%, transparent 85%)",
            maskImage: "linear-gradient(to bottom, hsl(0 0% 0% / 0.55) 0%, hsl(0 0% 0% / 0.25) 40%, transparent 85%)",
          }}
          aria-hidden
        />
        <div className="container relative grid gap-10 py-16 md:grid-cols-12">
          {/* Brand */}
          <div className="md:col-span-4">
            <Logo variant="white" size="md" />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-background/70">
              Plataforma de telemedicina premium. Tecnologia, agilidade e cuidado humano em uma única experiência clínica.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-background/70">
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-primary-glow" />
                contato@novasaude.com.br
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
              <FooterLink to="/sobre">Sobre nós</FooterLink>
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
            <p>© {new Date().getFullYear()} Nova Saúde · Todos os direitos reservados</p>
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
