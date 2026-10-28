import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/lib/session';
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Building2, User, Plus, Calendar, Eye, Filter, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isValidCpf, maskCpf } from "@/lib/validation/cpf";
import { usePermission } from "@/lib/permissions/usePermission";
import { supabase } from "@/integrations/supabase/client";

type StatusFilter = "todos" | "ativo" | "pendente" | "suspenso" | "bloqueado" | "banido";

type PacRow = {
  id: string;
  nome_completo: string | null;
  cpf: string | null;
  empresa_id: string | null;
  status_conta: string;
  created_at: string;
  consultas_count: number | null;
  tem_pgto_pendente: boolean | null;
};

export default function SecretariaPacientes() {
  const { session } = useSession();
  const { has, allowed, loading: permissionsLoading } = usePermission(["pacientes.ver","pacientes.criar","agenda.ver_todas","agenda.criar","financeiro.ver"]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [open, setOpen] = useState(false);
  const [novo, setNovo] = useState({ nome: "", cpf: "", telefone: "", email: "", vinculo: "particular" as "particular" | "empresarial" });
  const [criando, setCriando] = useState(false);
  const [page, setPage] = useState(0);
  const [busca, setBusca] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => { setBusca(q.trim()); setPage(0); }, 300);
    return () => clearTimeout(timer);
  }, [q]);
  const query = useQuery({
    queryKey: ['colaborador-pacientes', session?.user.id, busca, statusFilter, page, allowed],
    enabled: !!session && !permissionsLoading && has('pacientes.ver'),
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.rpc('colaborador_listar_pacientes', { _busca: busca, _status: statusFilter, _offset: page * 50 }).abortSignal(signal);
      if (error) throw error;
      return data as unknown as { total: number; pacientes: PacRow[] };
    }, retry: false,
  });
  const loading = query.isPending;
  const lista = has('pacientes.ver') ? query.data?.pacientes ?? [] : [];
  const carregar = () => query.refetch();

  async function create() {
    if (criando || !has("pacientes.criar")) return;
    if (!novo.nome.trim() || !novo.email.trim()) {
      toast.error("Preencha nome e e-mail.");
      return;
    }
    if (novo.cpf && !isValidCpf(novo.cpf)) {
      toast.error("CPF inválido", { description: "Verifique os dígitos informados." });
      return;
    }
    setCriando(true);
    try {
    const { data, error } = await supabase.functions.invoke("admin-criar-paciente", {
      body: {
        email: novo.email.trim(),
        nome_completo: novo.nome.trim(),
        cpf: novo.cpf ? novo.cpf.replace(/\D/g, "") : null,
        telefone: novo.telefone.trim() || null,
        vinculo: novo.vinculo,
      },
    });
    if (error || data?.error) {
      toast.error(data?.error ?? error?.message ?? "Falha ao criar paciente");
      return;
    }
    toast.success(`Paciente ${novo.nome} criado com sucesso`);
    setNovo({ nome: "", cpf: "", telefone: "", email: "", vinculo: "particular" });
    setOpen(false);
    setPage(0);
    await carregar();
    } catch { toast.error("Não foi possível criar o paciente. Tente novamente."); }
    finally { setCriando(false); }
  }

  const statusBadge: Record<StatusFilter, string> = {
    todos: "",
    bloqueado: "bg-destructive/10 text-destructive",
    banido: "bg-destructive/10 text-destructive",
    ativo: "bg-success/10 text-success border-success/20",
    pendente: "bg-warning/10 text-warning border-warning/30",
    suspenso: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pacientes"
        description="Busca global, status operacional e ações rápidas."
        actions={
          <Button className="bg-gradient-primary hover:opacity-90" disabled={!has("pacientes.criar")} onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Cadastrar paciente
          </Button>
        }
      />

      <div className="card-elevated flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            maxLength={200} aria-label="Buscar pacientes" placeholder="Nome, CPF ou ID exato…"
            className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {(["todos", "ativo", "pendente", "suspenso", "bloqueado", "banido"] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(0); }}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium border transition capitalize",
                statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground hover:border-primary/40",
              )}
            >{s}</button>
          ))}
        </div>
      </div>

      <div className="card-elevated overflow-hidden">
        {query.isError ? <div role="alert" className="p-6">Não foi possível carregar os pacientes. <Button onClick={() => void carregar()}>Tentar novamente</Button></div> : loading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : (
          <div className="divide-y divide-border">
            {lista.length === 0 && (
              <p className="p-10 text-center text-sm text-muted-foreground">Nenhum paciente encontrado.</p>
            )}
            {lista.map(p => {
              const empresarial = !!p.empresa_id;
              return (
                <div key={p.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-4 hover:bg-muted/30">
                  <div className={`grid h-10 w-10 place-items-center rounded-lg ${empresarial ? "bg-accent/15 text-accent" : "bg-primary/10 text-primary"}`}>
                    {empresarial ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      <Link to={`/app/colaborador/pacientes/${p.id}`} className="hover:text-primary">{p.nome_completo ?? "—"}</Link>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {empresarial ? "Empresarial" : "Particular"}{has("agenda.ver_todas") && p.consultas_count != null ? ` · ${p.consultas_count} consulta(s) como paciente atendido` : ""}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize", statusBadge[p.status_conta])}>
                        {p.status_conta}
                      </span>
                      {has("financeiro.ver") && p.tem_pgto_pendente && <Badge variant="outline">Pagamento em aberto</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" title="Ver detalhes" asChild>
                      <Link to={`/app/colaborador/pacientes/${p.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                    </Button>
                    {has("agenda.ver_todas") && <Button size="sm" variant="outline" title="Abrir agenda" asChild>
                      <Link to={`/app/colaborador/agenda`}><Calendar className="mr-1.5 h-3.5 w-3.5" /> Agenda</Link>
                    </Button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" disabled={page === 0 || loading} onClick={() => setPage(p => p - 1)}>Anterior</Button>
        <span>{query.data?.total ?? 0} pacientes · Página {page + 1}</span>
        <Button variant="outline" disabled={loading || (page + 1) * 50 >= (query.data?.total ?? 0)} onClick={() => setPage(p => p + 1)}>Próxima</Button>
      </div>
      {/* Dialog novo paciente */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo paciente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome completo *" value={novo.nome} onChange={e => setNovo(n => ({ ...n, nome: e.target.value }))} />
            <Input placeholder="CPF" value={novo.cpf} maxLength={14} onChange={e => setNovo(n => ({ ...n, cpf: maskCpf(e.target.value) }))} />
            <Input placeholder="Telefone" value={novo.telefone} onChange={e => setNovo(n => ({ ...n, telefone: e.target.value }))} />
            <Input placeholder="E-mail *" value={novo.email} onChange={e => setNovo(n => ({ ...n, email: e.target.value }))} />
            <div className="flex gap-2">
              {(["particular", "empresarial"] as const).map(v => (
                <Button key={v} type="button"
                  variant={novo.vinculo === v ? "default" : "outline"}
                  onClick={() => setNovo(n => ({ ...n, vinculo: v }))}
                  className="flex-1 capitalize">{v}</Button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Após criar, o paciente fica disponível na plataforma e pode ser agendado normalmente.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={criando}>Cancelar</Button>
            <Button onClick={create} disabled={criando || !has("pacientes.criar")}>
              {criando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar paciente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
