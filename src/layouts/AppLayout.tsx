import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Menu, LogOut, ChevronsUpDown, Check, ShieldCheck, ChevronDown,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { profiles, type ProfileKey } from "@/lib/profiles";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { NotificationsBell } from "@/components/NotificationsBell";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useSession } from "@/lib/session";
import { ImpersonationBanner } from "@/components/impersonation/ImpersonationBanner";

export default function AppLayout() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profileKey, setProfileKey, user } = useAuth();
  const { session, signOut } = useSession();
  const profile = profiles[profileKey];
  const isDev = import.meta.env.DEV;
  const showDemoSwitcher = isDev && !session;

  const handleLogout = async () => {
    if (session) {
      await signOut();
    }
    navigate("/");
  };

  const switchProfile = (k: ProfileKey) => {
    setProfileKey(k);
    setMobileOpen(false);
    const first = profiles[k].nav.find(n => n.to)?.to ?? "/app";
    navigate(first);
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <ImpersonationBanner />
      <div className="flex flex-1 w-full">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <SidebarBody profileKey={profileKey} onNavigate={() => {}} switchProfile={switchProfile} showDemoSwitcher={showDemoSwitcher} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-sidebar border-r border-sidebar-border flex flex-col">
            <SidebarBody profileKey={profileKey} onNavigate={() => setMobileOpen(false)} switchProfile={switchProfile} showDemoSwitcher={showDemoSwitcher} />
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1" />

          <NotificationsBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full border border-border bg-card px-2 py-1 pr-3 hover:bg-muted">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">
                  {user.avatarInitials}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-sm font-medium leading-tight">{user.name}</span>
                  <span className="block text-[11px] text-muted-foreground leading-tight">{user.role}</span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              {showDemoSwitcher && (
                <>
                  <DropdownMenuLabel>Trocar perfil (demo)</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(Object.keys(profiles) as ProfileKey[]).map((k) => (
                    <DropdownMenuItem key={k} onClick={() => switchProfile(k)} className="gap-2">
                      {profileKey === k ? <Check className="h-4 w-4 text-primary" /> : <span className="w-4" />}
                      {profiles[k].label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              {session && (
                <>
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground truncate">
                    {session.user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 p-4 md:p-8">
          <ProtectedRoute>
            <Outlet />
          </ProtectedRoute>
        </main>
      </div>
      </div>
    </div>
  );
}

function SidebarBody({
  profileKey, onNavigate, switchProfile, showDemoSwitcher,
}: {
  profileKey: ProfileKey;
  onNavigate: () => void;
  switchProfile: (k: ProfileKey) => void;
  showDemoSwitcher: boolean;
}) {
  const profile = profiles[profileKey];
  const { pathname } = useLocation();
  const { hasCapability } = useAuth();
  const { roles } = useSession();

  // Admin sempre vê o menu completo (mesmo bypass aplicado pelo guard de rota).
  // O perfil ativo no UI também serve como bypass quando = "admin" (modo demo).
  const isAdmin = roles.includes("admin") || profileKey === "admin";
  const allow = (cap?: string) => !cap || isAdmin || hasCapability(cap as any);

  const visibleNav = profile.nav.filter(item => allow(item.requiresCapability)).map(item => ({
    ...item,
    children: item.children?.filter(c => allow(c.requiresCapability)),
  }));

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      isActive
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    );

  return (
    <>
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Logo />
      </div>

      {showDemoSwitcher ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="mx-3 mt-3 flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-3 py-2 text-left hover:bg-sidebar-accent">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="flex-1">
                <span className="block text-xs uppercase tracking-wider text-muted-foreground">Perfil (demo)</span>
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
                onClick={() => switchProfile(k)}
                className="gap-2"
              >
                {profileKey === k ? <Check className="h-4 w-4 text-primary" /> : <span className="w-4" />}
                {profiles[k].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="mx-3 mt-3 flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-3 py-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="flex-1">
            <span className="block text-xs uppercase tracking-wider text-muted-foreground">Perfil</span>
            <span className="block text-sm font-semibold text-sidebar-foreground">{profile.label}</span>
          </span>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {visibleNav.map((item) => {
            if (item.children?.length) {
              const open = item.children.some(c => pathname.startsWith(c.to));
              return (
                <li key={item.label}>
                  <Collapsible defaultOpen={open}>
                    <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform data-[state=closed]:-rotate-90" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-0.5 space-y-0.5 pl-7">
                      {item.children.map(c => (
                        <NavLink
                          key={c.to}
                          to={c.to}
                          onClick={onNavigate}
                          className={({ isActive }) =>
                            cn(
                              "block rounded-md px-3 py-1.5 text-sm transition-colors",
                              isActive
                                ? "bg-primary-soft text-primary font-semibold"
                                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                            )
                          }
                        >
                          {c.label}
                        </NavLink>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </li>
              );
            }
            return (
              <li key={item.to}>
                <NavLink to={item.to!} onClick={onNavigate} className={linkClass}>
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
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
