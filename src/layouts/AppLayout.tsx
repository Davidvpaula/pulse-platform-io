import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Bell, Search, Menu, LogOut, ChevronsUpDown, Check, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { profiles, profileFromPath, type ProfileKey } from "@/lib/profiles";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AppLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const profileKey = (profileFromPath(pathname) ?? "paciente") as ProfileKey;
  const profile = profiles[profileKey];

  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <SidebarBody profileKey={profileKey} onNavigate={() => {}} />
      </aside>

      {/* Sidebar — mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-sidebar border-r border-sidebar-border flex flex-col">
            <SidebarBody profileKey={profileKey} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>

          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar pacientes, médicos, agendamentos…"
              className="pl-9 bg-muted/60 border-transparent focus-visible:bg-background"
            />
          </div>

          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full border border-border bg-card px-2 py-1 pr-3 hover:bg-muted">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">
                  {profile.user.avatarInitials}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-sm font-medium leading-tight">{profile.user.name}</span>
                  <span className="block text-[11px] text-muted-foreground leading-tight">{profile.user.role}</span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Trocar perfil (demo)</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(profiles) as ProfileKey[]).map((k) => (
                <DropdownMenuItem
                  key={k}
                  onClick={() => navigate(profiles[k].nav[0].to)}
                  className="gap-2"
                >
                  {profileKey === k ? <Check className="h-4 w-4 text-primary" /> : <span className="w-4" />}
                  {profiles[k].label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/")}>
                <LogOut className="mr-2 h-4 w-4" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarBody({ profileKey, onNavigate }: { profileKey: ProfileKey; onNavigate: () => void }) {
  const profile = profiles[profileKey];
  const navigate = useNavigate();

  return (
    <>
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Logo />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="mx-3 mt-3 flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-3 py-2 text-left hover:bg-sidebar-accent">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="flex-1">
              <span className="block text-xs uppercase tracking-wider text-muted-foreground">Perfil</span>
              <span className="block text-sm font-semibold text-sidebar-foreground">{profile.label}</span>
            </span>
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Mudar dashboard</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {(Object.keys(profiles) as ProfileKey[]).map((k) => (
            <DropdownMenuItem
              key={k}
              onClick={() => { onNavigate(); navigate(profiles[k].nav[0].to); }}
              className="gap-2"
            >
              {profileKey === k ? <Check className="h-4 w-4 text-primary" /> : <span className="w-4" />}
              {profiles[k].label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {profile.nav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="rounded-lg bg-gradient-primary p-3 text-primary-foreground">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{profile.accent}</p>
          <p className="mt-1 text-sm font-medium leading-snug">
            Plataforma integrada de saúde digital.
          </p>
        </div>
      </div>
    </>
  );
}
