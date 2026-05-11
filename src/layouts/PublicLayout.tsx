import { Outlet, NavLink, Link } from "react-router-dom";
import { useState } from "react";
import { Menu, X, Mail, Phone, MapPin } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { to: "/atendimento-imediato", label: "Atendimento imediato" },
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
      {/* ─── HEADER FLUTUANTE (cápsula estilo Figma) ─── */}
      <header className="sticky top-4 z-50 w-full px-4">
        <div className="relative mx-auto flex h-[68px] max-w-[1180px] items-center justify-between gap-4 rounded-[28px] border border-white/60 bg-[#f5efe4]/95 px-5 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.18)] backdrop-blur-md">
          <Logo size="md" />

          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l, i) => (
              <NavLink
                key={`${l.to}-${i}`}
                to={l.to}
                end={l.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "rounded-full px-2.5 py-2 text-[13px] tracking-tight transition-colors whitespace-nowrap",
                    isActive
                      ? "font-bold text-foreground"
                      : "font-medium text-foreground/70 hover:text-foreground",
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Button
              asChild
              className="h-[42px] rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Link to="/auth?mode=signup">Cadastre-se</Link>
            </Button>
            <Button asChild variant="ghost" className="h-[42px] rounded-full px-3 text-sm font-medium">
              <Link to="/auth">Login</Link>
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-full md:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Abrir menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {open && (
            <nav className="absolute left-0 right-0 top-[calc(100%+8px)] flex flex-col gap-1 rounded-2xl border border-white/60 bg-[#f5efe4]/98 p-3 shadow-lg backdrop-blur-md md:hidden">
              {links.map((l, i) => (
                <Link
                  key={`m-${l.to}-${i}`}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-4 py-2.5 text-sm font-medium text-foreground hover:bg-black/5"
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-2 flex gap-2 px-1">
                <Button
                  asChild
                  className="flex-1 rounded-full bg-primary font-semibold hover:bg-primary/90"
                  onClick={() => setOpen(false)}
                >
                  <Link to="/auth?mode=signup">Cadastre-se</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="flex-1 rounded-full"
                  onClick={() => setOpen(false)}
                >
                  <Link to="/auth">Login</Link>
                </Button>
              </div>
            </nav>
          )}
        </div>
      </header>

      <main className="-mt-[76px] flex-1 pt-[76px]"><Outlet /></main>

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
