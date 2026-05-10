import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Building2, User, Plus, Calendar, ExternalLink, Pencil, Filter, Loader2 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";

type StatusFilter = "todos" | "ativo" | "aguardando" | "inadimplente";

type PacRow = {
  id: string;
  nome_completo: string | null;
  cpf: string | null;
  telefone: string | null;
  empresa_id: string | null;
  status_conta: string;
  feegow_status: string;
  created_at: string;
  consultas_count: number;
  tem_pgto_pendente: boolean;
};

export default function SecretariaPacientes() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [open, setOpen] = useState(false);
  const [novo, setNovo] = useState({ nome: "", cpf: "", telefone: "", email: "", vinculo: "particular" as "particular" | "empresarial" });
  const [criando, setCriando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PacRow[]>([]);

  async function carregar() {
    setLoading(true);
    const { data: pacientes } = await supabase
      .from("pacientes")
      .select("id,nome_completo,cpf,telefone,empresa_id,status_conta,feegow_status,created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (!pacientes?.length) { setRows([]); setLoading(false); return; }

    const ids = pacientes.map(p => p.id);

    // Count consultas per paciente
    const { data: cons } = await supabase
      .from("consultas")
      .select("paciente_id")
      .in("paciente_id", ids);
    const countMap: Record<string, number> = {};
    cons?.forEach(c => { countMap[c.paciente_id] = (countMap[c.paciente_id] ?? 0) + 1; });

    // Pagamentos pendentes
    const { data: pagPend } = await supabase
      .from("pagamentos")
      .select("consulta_id, status, consultas:consulta_id(paciente_id)")
      .in("status", ["pendente", "processando"]);
    const pendSet = new Set<string>();
    pagPend?.forEach((p: any) => { if (p.consultas?.paciente_id) pendSet.add(p.consultas.paciente_id); });

    setRows(pacientes.map(p => ({
      id: p.id,
      nome_completo: p.nome_completo,
      cpf: p.cpf,
      telefone: p.telefone,
      empresa_id: p.empresa_id,
      status_conta: p.status_conta ?? "ativo",
      feegow_status: p.feegow_status ?? "nao_enviado",
      created_at: p.created_at,
      consultas_count: countMap[p.id] ?? 0,
      tem_pgto_pendente: pendSet.has(p.id),
    })));
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  const lista = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter(p => {
      const aguardando = p.feegow_status === "pendente" || p.feegow_status === "nao_enviado";
      const statusLabel: StatusFilter = p.tem_pgto_pendente ? "inadimplente" : aguardando ? "aguardando" : "ativo";
      if (statusFilter !== "todos" && statusLabel !== statusFilter) return false;
      if (!term) return true;
      return (
        (p.nome_completo ?? "").toLowerCase().includes(term) ||
        (p.cpf ?? "").includes(term)
      );
    }).map(p => {
      const aguardando = p.feegow_status === "pendente" || p.feegow_status === "nao_enviado";
      const statusLabel: StatusFilter = p.tem_pgto_pendente ? "inadimplente" : aguardando ? "aguardando" : "ativo";
      return { ...p, statusLabel };
    });
  }, [rows, q, statusFilter]);

  async function create() {
    if (!novo.nome || !novo.email) {
      toast.error("Preencha nome e e-mail.");
      return;
    }
    if (novo.cpf && !isValidCpf(novo.cpf)) {
      toast.error("CPF inválido", { description: "Verifique os dígitos informados." });
      return;
    }
    setCriando(true);
    const { data, error } = await supabase.functions.invoke("admin-criar-paciente", {
      body: {
        email: novo.email.trim(),
        nome_completo: novo.nome.trim(),
        cpf: novo.cpf ? novo.cpf.replace(/\D/g, "") : null,
        telefone: novo.telefone.trim() || null,
        vinculo: novo.vinculo,
      },
    });
    setCriando(false);
    if (error || data?.error) {
      toast.error(data?.error ?? error?.message ?? "Falha ao criar paciente");
      return;
    }
    toast.success(`Paciente ${novo.nome} criado com sucesso`);
    setNovo({ nome: "", cpf: "", telefone: "", email: "", vinculo: "particular" });
    setOpen(false);
    carregar();
  }

  const statusBadge: Record<StatusFilter, string> = {
    todos: "",
    ativo: "bg-success/10 text-success border-success/20",
    aguardando: "bg-warning/10 text-warning border-warning/30",
    inadimplente: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pacientes"
        description="Busca global, status operacional e ações rápidas."
        actions={
          <Button className="bg-gradient-primary hover:opacity-90" onClick={() => setOpen(true)}>
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
            placeholder="Nome, CPF, ID ou empresa…"
            className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {(["todos", "ativo", "aguardando", "inadimplente"] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium border transition capitalize",
                statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground hover:border-primary/40",
              )}
            >{s}</button>
          ))}
        </div>
      </div>

      <div className="card-elevated overflow-hidden">
        {loading ? (
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
                      <Link to={`/app/secretaria/pacientes/${p.id}`} className="hover:text-primary">{p.nome_completo ?? "—"}</Link>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {empresarial ? "Empresarial" : "Particular"} · {p.consultas_count} consulta(s)
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize", statusBadge[p.statusLabel])}>
                        {p.statusLabel}
                      </span>
                      <Badge variant="outline" className={cn("text-[10px]",
                        p.feegow_status === "liberado" ? "border-success/40 text-success" : "border-muted-foreground/30 text-muted-foreground"
                      )}>
                        Feegow: {p.feegow_status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" title="Editar" asChild>
                      <Link to={`/app/secretaria/pacientes/${p.id}`}><Pencil className="h-3.5 w-3.5" /></Link>
                    </Button>
                    <Button size="sm" variant="outline" title="Agendar" asChild>
                      <Link to={`/app/secretaria/agenda?paciente=${p.id}`}><Calendar className="mr-1.5 h-3.5 w-3.5" /> Agendar</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
            <Button onClick={create} disabled={criando}>
              {criando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar paciente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
