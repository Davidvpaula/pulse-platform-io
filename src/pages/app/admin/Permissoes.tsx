import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLoading, AdminError, AdminEmpty } from "@/components/admin/AdminStates";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, ShieldCheck, BadgeCheck, MessageSquare, Wallet, Activity, Search, ChevronRight, History } from "lucide-react";
import { ColaboradorPermissoesDrawer } from "@/components/permissions/ColaboradorPermissoesDrawer";
import { MatrizPermissoes } from "@/components/permissions/MatrizPermissoes";
import { FUNCOES, ROLES, STATUS_BADGE } from "@/lib/permissions/constants";

interface KPIs {
  colaboradores_ativos: number;
  pendentes_convite: number;
  suspensos: number;
  bloqueados: number;
  com_supervisor: number;
  com_financeiro: number;
  com_whatsapp: number;
  alteracoes_24h: number;
  total_permissoes: number;
}

interface Colab {
  id: string; user_id: string; nome_completo: string; email: string;
  funcao_interna: string; status_conta: string; ultimo_acesso_em: string | null;
}

function usePermissoesData() {
  return useQuery({
    queryKey: ["admin", "permissoes-page"],
    queryFn: async () => {
      const [kpiRes, colabRes, audRes] = await Promise.all([
        supabase.rpc("permissoes_dashboard" as never),
        supabase.from("colaboradores")
          .select("id,user_id,nome_completo,email,funcao_interna,status_conta,ultimo_acesso_em")
          .neq("status_conta", "removido")
          .order("nome_completo"),
        supabase.from("permission_audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      return {
        kpis: kpiRes.data as KPIs | null,
        colabs: (colabRes.data as Colab[]) || [],
        auditoria: audRes.data || [],
      };
    },
    staleTime: 60_000,
  });
}

export default function Permissoes() {
  const { data, isLoading, error, refetch } = usePermissoesData();
  const [busca, setBusca] = useState("");
  const [filtroFuncao, setFiltroFuncao] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [perfilSel, setPerfilSel] = useState<string>("medico");
  const [funcaoSel, setFuncaoSel] = useState<string>("secretaria");
  const [drawerColab, setDrawerColab] = useState<Colab | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (isLoading) return <AdminLoading cards={5} rows={6} />;
  if (error) return <AdminError message={(error as Error).message} onRetry={() => refetch()} />;

  const kpis = data?.kpis;
  const colabs = data?.colabs ?? [];
  const auditoria = data?.auditoria ?? [];

  const colabsFiltrados = colabs.filter(c => {
    if (busca && !`${c.nome_completo} ${c.email}`.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtroFuncao !== "todos" && c.funcao_interna !== filtroFuncao) return false;
    if (filtroStatus !== "todos" && c.status_conta !== filtroStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Permissões"
          description="Gerencie acessos por perfil, função interna ou colaborador específico — sem precisar criar dashboards separados."
        />
        <Button asChild variant="outline">
          <Link to="/app/admin/impersonar">
            <ShieldCheck className="mr-2 h-4 w-4" /> Visualizar como…
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
        <KpiMini icon={Users} label="Colaboradores ativos" value={kpis?.colaboradores_ativos ?? "—"} />
        <KpiMini icon={BadgeCheck} label="Com supervisão" value={kpis?.com_supervisor ?? "—"} />
        <KpiMini icon={Wallet} label="Acesso financeiro" value={kpis?.com_financeiro ?? "—"} />
        <KpiMini icon={MessageSquare} label="Acesso WhatsApp" value={kpis?.com_whatsapp ?? "—"} />
        <KpiMini icon={Activity} label="Alterações 24h" value={kpis?.alteracoes_24h ?? "—"} />
      </div>

      <Tabs defaultValue="colaboradores">
        <TabsList>
          <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
          <TabsTrigger value="funcao">Por função interna</TabsTrigger>
          <TabsTrigger value="perfil">Por perfil</TabsTrigger>
          <TabsTrigger value="auditoria">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="colaboradores" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="w-72 pl-8" placeholder="Buscar por nome ou e-mail..." value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            <Select value={filtroFuncao} onValueChange={setFiltroFuncao}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Função" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as funções</SelectItem>
                {FUNCOES.map(f => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="pendente_convite">Pendente convite</SelectItem>
                <SelectItem value="suspenso">Suspenso</SelectItem>
                <SelectItem value="bloqueado">Bloqueado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="card-elevated overflow-hidden">
            {colabsFiltrados.length === 0 ? (
              <AdminEmpty title="Nenhum colaborador encontrado" />
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="p-3 text-left font-semibold">Nome</th>
                    <th className="p-3 text-left font-semibold">E-mail</th>
                    <th className="p-3 text-left font-semibold">Função</th>
                    <th className="p-3 text-left font-semibold">Status</th>
                    <th className="p-3 text-left font-semibold">Último acesso</th>
                    <th className="p-3 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {colabsFiltrados.map(c => (
                    <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-3 font-medium">{c.nome_completo}</td>
                      <td className="p-3 text-muted-foreground">{c.email}</td>
                      <td className="p-3 capitalize">{c.funcao_interna.replace("_", " ")}</td>
                      <td className="p-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[c.status_conta] || ""}`}>
                          {c.status_conta.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {c.ultimo_acesso_em ? new Date(c.ultimo_acesso_em).toLocaleString("pt-BR") : "—"}
                      </td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => { setDrawerColab(c); setDrawerOpen(true); }}>
                          Permissões <ChevronRight className="ml-1 h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="funcao" className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Função:</span>
            <Select value={funcaoSel} onValueChange={setFuncaoSel}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FUNCOES.map(f => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Estas permissões valem para <strong>todos</strong> os colaboradores com esta função.
            </p>
          </div>
          <MatrizPermissoes scope="funcao" scopeValue={funcaoSel} />
        </TabsContent>

        <TabsContent value="perfil" className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Perfil:</span>
            <Select value={perfilSel} onValueChange={setPerfilSel}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map(r => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Define o padrão para todos os usuários deste perfil base.
            </p>
          </div>
          <MatrizPermissoes scope="perfil" scopeValue={perfilSel} />
        </TabsContent>

        <TabsContent value="auditoria" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Mostrando as 30 alterações mais recentes.</p>
            <Button asChild size="sm" variant="outline">
              <Link to="/app/admin/permissoes/log">
                <History className="mr-1 h-4 w-4" /> Ver histórico completo
              </Link>
            </Button>
          </div>
          <div className="card-elevated overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="p-3 text-left font-semibold">Quando</th>
                  <th className="p-3 text-left font-semibold">Escopo</th>
                  <th className="p-3 text-left font-semibold">Alvo</th>
                  <th className="p-3 text-left font-semibold">Permissão</th>
                  <th className="p-3 text-left font-semibold">Ação</th>
                  <th className="p-3 text-left font-semibold">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {auditoria.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Sem alterações registradas</td></tr>
                ) : auditoria.map((a: Record<string, unknown>) => (
                  <tr key={a.id as string} className="border-t border-border">
                    <td className="p-3 text-xs text-muted-foreground">{new Date(a.created_at as string).toLocaleString("pt-BR")}</td>
                    <td className="p-3 capitalize">{a.scope as string}</td>
                    <td className="p-3 text-xs">{(a.target_role || a.target_funcao || (a.target_user_id as string)?.slice(0, 8)) as string}</td>
                    <td className="p-3 font-mono text-xs">{a.permission_key as string}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        a.acao === "concedida" ? "bg-success/15 text-success"
                        : a.acao === "revogada" ? "bg-destructive/15 text-destructive"
                        : "bg-muted text-muted-foreground"
                      }`}>{a.acao as string}</span>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{(a.motivo as string) || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <ColaboradorPermissoesDrawer
        colaborador={drawerColab}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}

function KpiMini({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number }) {
  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}
