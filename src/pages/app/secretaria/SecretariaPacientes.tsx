import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Building2, User, Plus, Calendar, ExternalLink, Pencil, Filter } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { pacientes, agendamentos } from "@/lib/mock";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type StatusFilter = "todos" | "ativo" | "aguardando" | "inadimplente";

export default function SecretariaPacientes() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [open, setOpen] = useState(false);
  const [novo, setNovo] = useState({ nome: "", cpf: "", telefone: "", email: "", vinculo: "particular" as "particular" | "empresarial" });

  const lista = useMemo(() => {
    const term = q.trim().toLowerCase();
    return pacientes
      .map(p => {
        const ags = agendamentos.filter(a => a.pacienteId === p.id);
        const inadimplente = ags.some(a => a.status === "aguardando");
        const aguardando = p.status === "paciente_criado" || p.status === "feegow_enviado";
        const statusLabel: StatusFilter = inadimplente ? "inadimplente" : aguardando ? "aguardando" : "ativo";
        return { ...p, ags: ags.length, statusLabel };
      })
      .filter(p => {
        if (statusFilter !== "todos" && p.statusLabel !== statusFilter) return false;
        if (!term) return true;
        return (
          p.nome.toLowerCase().includes(term) ||
          p.id.toLowerCase().includes(term) ||
          (p.empresa ?? "").toLowerCase().includes(term)
        );
      });
  }, [q, statusFilter]);

  const create = () => {
    if (!novo.nome || !novo.cpf || !novo.telefone || !novo.email) {
      toast.error("Preencha nome, CPF, telefone e e-mail.");
      return;
    }
    toast.success(`Paciente ${novo.nome} criado`, {
      description: "Status: aguardando sincronização com Feegow (mock).",
    });
    setNovo({ nome: "", cpf: "", telefone: "", email: "", vinculo: "particular" });
    setOpen(false);
  };

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
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90">
                <Plus className="mr-2 h-4 w-4" /> Cadastrar paciente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo paciente</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Nome completo *" value={novo.nome} onChange={e => setNovo(n => ({ ...n, nome: e.target.value }))} />
                <Input placeholder="CPF *" value={novo.cpf} onChange={e => setNovo(n => ({ ...n, cpf: e.target.value }))} />
                <Input placeholder="Telefone *" value={novo.telefone} onChange={e => setNovo(n => ({ ...n, telefone: e.target.value }))} />
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
                  Após criar, o paciente entra na fila de envio para Feegow automaticamente.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={create}>Criar paciente</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
        <div className="divide-y divide-border">
          {lista.length === 0 && (
            <p className="p-10 text-center text-sm text-muted-foreground">Nenhum paciente encontrado.</p>
          )}
          {lista.map(p => {
            const empresarial = p.vinculo === "empresarial";
            return (
              <div key={p.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-4 hover:bg-muted/30">
                <div className={`grid h-10 w-10 place-items-center rounded-lg ${empresarial ? "bg-accent/15 text-accent" : "bg-primary-soft text-primary"}`}>
                  {empresarial ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    <Link to={`/app/secretaria/pacientes/${p.id}`} className="hover:text-primary">{p.nome}</Link>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">{p.id}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {empresarial ? `Empresarial · ${p.empresa}` : "Particular"} · {p.ags} consulta(s)
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize", statusBadge[p.statusLabel])}>
                      {p.statusLabel}
                    </span>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" title="Editar"><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="outline" title="Agendar"><Calendar className="mr-1.5 h-3.5 w-3.5" /> Agendar</Button>
                  <Button size="sm" variant="outline" title="Enviar para Feegow"><ExternalLink className="mr-1.5 h-3.5 w-3.5 text-primary" /> Feegow</Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
