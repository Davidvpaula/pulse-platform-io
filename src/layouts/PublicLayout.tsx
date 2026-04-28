import { Outlet, NavLink, Link } from "react-router-dom";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { to: "/especialidades", label: "Especialidades" },
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
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-6">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            <Button asChild variant="ghost"><Link to="/login">Entrar</Link></Button>
            <Button asChild className="bg-gradient-primary hover:opacity-90">
              <Link to="/agendar">Agendar consulta</Link>
            </Button>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
        {open && (
          <div className="border-t border-border bg-background lg:hidden">
            <nav className="container flex flex-col gap-1 py-3">
              {links.map((l) => (
                <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
                      className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
                  {l.label}
                </Link>
              ))}
              <div className="mt-2 flex gap-2">
                <Button asChild variant="outline" className="flex-1"><Link to="/login">Entrar</Link></Button>
                <Button asChild className="flex-1 bg-gradient-primary"><Link to="/agendar">Agendar</Link></Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="border-t border-border bg-muted/30">
        <div className="container grid gap-8 py-12 md:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-muted-foreground max-w-xs">
              Plataforma de saúde digital integrada para pacientes, médicos e empresas.
            </p>
          </div>
          <div>
            <h4 className="font-display text-sm font-semibold">Plataforma</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/especialidades" className="hover:text-foreground">Especialidades</Link></li>
              <li><Link to="/medicos" className="hover:text-foreground">Médicos</Link></li>
              <li><Link to="/planos" className="hover:text-foreground">Planos</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display text-sm font-semibold">Para você</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/empresas" className="hover:text-foreground">Empresas</Link></li>
              <li><Link to="/para-medicos" className="hover:text-foreground">Médicos</Link></li>
              <li><Link to="/faq" className="hover:text-foreground">Perguntas frequentes</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display text-sm font-semibold">Acesso</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/login" className="hover:text-foreground">Entrar</Link></li>
              <li><Link to="/agendar" className="hover:text-foreground">Agendar consulta</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
          © 2026 Lasmar Telemed · Todos os direitos reservados
        </div>
      </footer>
    </div>
  );
}
