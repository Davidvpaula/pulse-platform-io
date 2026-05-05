import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  Menu, LogOut, ChevronsUpDown, Check, ShieldCheck, ChevronDown,
  Building2, Heart,
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
import TermosPendentesBanner from "@/components/shared/TermosPendentesBanner";
import { usePermissionsBatch } from "@/lib/permissions/usePermissionsBatch";
import { colaboradorMenu, collectMenuKeys, type MenuNode } from "@/lib/menu/menuCatalog";
import { validateMenuKeys } from "@/lib/menu/validateMenuKeys";

/* ─── Flow context detection ─── */
type FlowContext = { cls: string; label: string; icon: typeof Building2; description: string };

function getFlowContext(profileKey: ProfileKey, pathname: string): FlowContext {
  // B2B contexts
  if (profileKey === "empresa") {
    return { cls: "flow-b2b", label: "B2B", icon: Building2, description: "Corporativo" };
  }
  if (profileKey === "admin" && (
    pathname.includes("/empresas") || pathname.includes("/gestao-b2b") ||
    pathname.includes("/faturamento-b2b") || pathname.includes("/relatorios-b2b") ||
    pathname.includes("/planos-empresariais") || pathname.includes("/contrato-b2b")
  )) {
    return { cls: "flow-b2b", label: "B2B", icon: Building2, description: "Gestão corporativa" };
  }
  // B2C
  if (profileKey === "paciente") {
    return { cls: "flow-b2c", label: "B2C", icon: Heart, description: "Paciente" };
  }
  // Other profiles
  if (profileKey === "medico") {
    return { cls: "flow-medico", label: "Médico", icon: ShieldCheck, description: "Profissional" };
  }
  if (profileKey === "secretaria" || profileKey === "colaborador") {
    return { cls: "flow-secretaria", label: "Operação", icon: ShieldCheck, description: "Equipe" };
  }
  return { cls: "flow-admin", label: "Admin", icon: ShieldCheck, description: "Plataforma" };
}

export default function AppLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profileKey, setProfileKey, user } = useAuth();
  const { session, signOut } = useSession();
  const profile = profiles[profileKey];
  const flow = getFlowContext(profileKey, pathname);

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
    <div className={cn("flex min-h-screen w-full flex-col bg-muted/40", flow.cls)}>
      <ImpersonationBanner />
      <div className="flex flex-1 w-full">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flow-stripe w-full" />
        <SidebarBody profileKey={profileKey} flow={flow} onNavigate={() => {}} switchProfile={switchProfile} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-sidebar border-r border-sidebar-border flex flex-col">
            <div className="flow-stripe w-full" />
            <SidebarBody profileKey={profileKey} flow={flow} onNavigate={() => setMobileOpen(false)} switchProfile={switchProfile} />
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>

          {/* Flow context badge */}
          <span className="flow-badge hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider">
            <flow.icon className="h-3 w-3" />
            {flow.label}
          </span>

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

        <TermosPendentesBanner />
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

/**
 * Forma normalizada usada para renderizar uma linha do menu, vinda
 * tanto do nav fixo de profiles.ts quanto do colaboradorMenu dinâmico.
 */
type RenderItem = {
  label: string;
  icon: MenuNode["icon"];
  to?: string;
  children?: { label: string; to: string }[];
};

function SidebarBody({
  profileKey, flow, onNavigate, switchProfile,
}: {
  profileKey: ProfileKey;
  flow: FlowContext;
  onNavigate: () => void;
  switchProfile: (k: ProfileKey) => void;
}) {
  const profile = profiles[profileKey];
  const { pathname } = useLocation();

  // Coleta todas as permission keys que ESTE menu pode precisar.
  const keysNeeded = useMemo(() => {
    if (profileKey === "colaborador" || profileKey === "secretaria") return collectMenuKeys(colaboradorMenu);
    const set = new Set<string>();
    for (const item of profile.nav) {
      if (item.requiresCapability) set.add(item.requiresCapability);
      for (const c of item.children ?? []) {
        if (c.requiresCapability) set.add(c.requiresCapability);
      }
    }
    return [...set];
  }, [profileKey, profile.nav]);

  const { loading, has } = usePermissionsBatch(keysNeeded);

  const allow = (key?: string) => !key || has(key);

  useEffect(() => {
    void validateMenuKeys();
  }, []);

  // Monta a lista visível conforme o perfil.
  const visibleNav: RenderItem[] = useMemo(() => {
    if (profileKey === "colaborador" || profileKey === "secretaria") {
      const out: RenderItem[] = [];
      for (const node of colaboradorMenu) {
        if (node.children?.length) {
          const visibleChildren = node.children
            .filter(c => allow(c.key))
            .map(c => ({ label: c.label, to: c.to }));
          if (visibleChildren.length === 0) continue;
          out.push({ label: node.label, icon: node.icon, children: visibleChildren });
        } else {
          if (!allow(node.key)) continue;
          out.push({ label: node.label, icon: node.icon, to: node.to });
        }
      }
      return out;
    }

    // Demais perfis: usa profile.nav fixo, filtrando por has_permission do banco.
    const out: RenderItem[] = [];
    for (const item of profile.nav) {
      if (item.children?.length) {
        if (item.requiresCapability && !allow(item.requiresCapability)) continue;
        const visibleChildren = item.children
          .filter(c => allow(c.requiresCapability))
          .map(c => ({ label: c.label, to: c.to }));
        if (visibleChildren.length === 0) continue;
        out.push({ label: item.label, icon: item.icon, children: visibleChildren });
      } else {
        if (!allow(item.requiresCapability)) continue;
        out.push({ label: item.label, icon: item.icon, to: item.to });
      }
    }
    return out;
  }, [profileKey, profile.nav, loading, has]);

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

      <div className="mx-3 mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 flow-sidebar-card">
        <flow.icon className="h-4 w-4 flow-icon shrink-0" />
        <span className="flex-1">
          <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">{flow.description}</span>
          <span className="block text-sm font-semibold text-sidebar-foreground">{profile.label}</span>
        </span>
        <span className="flow-badge rounded px-1.5 py-0.5 text-[10px] font-bold">{flow.label}</span>
      </div>

      <AccordionNav visibleNav={visibleNav} loading={loading} profileKey={profileKey} pathname={pathname} onNavigate={onNavigate} linkClass={linkClass} />

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

/* ─── Accordion Nav: only one group open at a time ─── */
function AccordionNav({
  visibleNav, loading, profileKey, pathname, onNavigate, linkClass,
}: {
  visibleNav: RenderItem[];
  loading: boolean;
  profileKey: ProfileKey;
  pathname: string;
  onNavigate: () => void;
  linkClass: (p: { isActive: boolean }) => string;
}) {
  // Derive active group from pathname
  const activeGroupLabel = useMemo(() => {
    return visibleNav.find(
      (item) => item.children?.some((c) => pathname.startsWith(c.to))
    )?.label ?? null;
  }, [visibleNav, pathname]);

  const [openGroup, setOpenGroup] = useState<string | null>(activeGroupLabel);

  // Sync when route changes (e.g. navigating from outside the sidebar)
  useEffect(() => {
    if (activeGroupLabel) setOpenGroup(activeGroupLabel);
  }, [activeGroupLabel]);

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {loading ? (
        <ul className="space-y-1.5 px-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="h-8 rounded-lg bg-sidebar-accent/40 animate-pulse" />
          ))}
        </ul>
      ) : (
        <ul className="space-y-0.5">
          {visibleNav.map((item) => {
            if (item.children?.length) {
              const isOpen = openGroup === item.label;
              return (
                <li key={item.label}>
                  <Collapsible
                    open={isOpen}
                    onOpenChange={(val) => setOpenGroup(val ? item.label : null)}
                  >
                    <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform duration-200", !isOpen && "-rotate-90")} />
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
              <li key={item.to ?? item.label}>
                <NavLink to={item.to!} onClick={onNavigate} className={linkClass}>
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
          {visibleNav.length === 0 && profileKey === "colaborador" && (
            <li className="px-3 py-4 text-xs text-muted-foreground">
              Nenhum módulo liberado para o seu usuário ainda. Fale com um administrador.
            </li>
          )}
        </ul>
      )}
    </nav>
  );
}
