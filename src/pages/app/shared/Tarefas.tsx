import { useState } from "react";
import {
  Plus, CheckCircle2, Clock, AlertCircle, UserPlus, Filter, Calendar,
  Building2, User, AlarmClock,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type TaskStatus = "pendente" | "andamento" | "concluida";
type Priority = "baixa" | "media" | "alta" | "auto";

type LinkRef = { tipo: "paciente" | "consulta" | "empresa"; id: string; label: string };

type Task = {
  id: string;
  titulo: string;
  responsavel: string;
  prioridade: Priority;
  prazo: string;
  prazoHoras: number; // mock — horas restantes
  status: TaskStatus;
  vinculo?: LinkRef;
  origem?: "manual" | "cadastro_paciente" | "automacao";
};

const initial: Task[] = [
  { id: "T-101", titulo: "Confirmar 14 consultas de quinta", responsavel: "Juliana Reis", prioridade: "alta", prazo: "Hoje 18:00", prazoHoras: 4, status: "andamento" },
  { id: "T-102", titulo: "Cobrar pagamento do paciente", responsavel: "Ana Lima", prioridade: "auto", prazo: "Hoje 16:00", prazoHoras: 2, status: "pendente",
    vinculo: { tipo: "paciente", id: "P-1006", label: "João Almeida" } },
  { id: "T-103", titulo: "Revisar agendamento empresarial", responsavel: "Carlos Mendes", prioridade: "alta", prazo: "Hoje 12:00", prazoHoras: -1, status: "pendente",
    vinculo: { tipo: "empresa", id: "E-001", label: "Construtora Horizonte" } },
  { id: "T-104", titulo: "Reenviar consulta para Feegow", responsavel: "Renata Albuquerque", prioridade: "media", prazo: "Amanhã", prazoHoras: 18, status: "andamento",
    vinculo: { tipo: "consulta", id: "C-1110", label: "Patrícia Nunes · 10:30" } },
  { id: "T-105", titulo: "Treinar equipe no novo bot", responsavel: "Fernanda Nova Saúde", prioridade: "baixa", prazo: "02/Mai", prazoHoras: 96, status: "concluida" },
];

const statusMeta: Record<TaskStatus, { label: string; tone: string; icon: typeof Clock }> = {
  pendente: { label: "Pendente", tone: "bg-warning/10 text-warning border-warning/20", icon: AlertCircle },
  andamento: { label: "Em andamento", tone: "bg-info/10 text-info border-info/20", icon: Clock },
  concluida: { label: "Concluída", tone: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
};

const prioMeta: Record<Priority, string> = {
  alta: "bg-destructive/10 text-destructive",
  media: "bg-warning/10 text-warning",
  baixa: "bg-muted text-muted-foreground",
  auto: "bg-primary/10 text-primary",
};

const linkIcon = { paciente: User, consulta: Calendar, empresa: Building2 } as const;

const prazoTone = (h: number) =>
  h < 0 ? "bg-destructive/10 text-destructive" :
  h < 4 ? "bg-warning/10 text-warning" :
  "bg-muted text-muted-foreground";
const prazoLabel = (h: number) =>
  h < 0 ? "atrasada" : h < 4 ? "vence em breve" : "no prazo";

export default function Tarefas() {
  const [tasks, setTasks] = useState<Task[]>(initial);
  const [filter, setFilter] = useState<TaskStatus | "all">("all");
  const [open, setOpen] = useState(false);
  const [pacOpen, setPacOpen] = useState(false);
  const [novo, setNovo] = useState({ titulo: "", responsavel: "", prazo: "", prioridade: "media" as Priority });
  const [pac, setPac] = useState({ nome: "", cpf: "", telefone: "", email: "" });

  const filtered = tasks.filter(t => filter === "all" || t.status === filter);

  const advance = (t: Task) => {
    const next: TaskStatus = t.status === "pendente" ? "andamento" : t.status === "andamento" ? "concluida" : "pendente";
    setTasks(ts => ts.map(x => x.id === t.id ? { ...x, status: next } : x));
  };

  const create = () => {
    if (!novo.titulo) return;
    setTasks(ts => [
      { id: `T-${100 + ts.length + 1}`, ...novo, prazoHoras: 8, status: "pendente", origem: "manual" },
      ...ts,
    ]);
    setNovo({ titulo: "", responsavel: "", prazo: "", prioridade: "media" });
    setOpen(false);
  };

  const cadastrarPaciente = () => {
    if (!pac.nome || !pac.cpf) {
      toast.error("Nome e CPF são obrigatórios.");
      return;
    }
    setTasks(ts => [
      {
        id: `T-${100 + ts.length + 1}`,
        titulo: `Concluir cadastro de ${pac.nome}`,
        responsavel: "Juliana Reis",
        prioridade: "auto",
        prazo: "Hoje",
        prazoHoras: 6,
        status: "andamento",
        vinculo: { tipo: "paciente", id: `P-NEW`, label: pac.nome },
        origem: "cadastro_paciente",
      },
      ...ts,
    ]);
    toast.success(`Paciente ${pac.nome} criado`, {
      description: "Tarefa gerada e fila Feegow atualizada (mock).",
    });
    setPac({ nome: "", cpf: "", telefone: "", email: "" });
    setPacOpen(false);
  };

  const counts = {
    pendente: tasks.filter(t => t.status === "pendente").length,
    andamento: tasks.filter(t => t.status === "andamento").length,
    concluida: tasks.filter(t => t.status === "concluida").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tarefas internas"
        description="Atribua, monitore e conclua atividades operacionais — prioridade e prazo automáticos."
        actions={
          <>
            {/* Cadastro rápido de paciente */}
            <Dialog open={pacOpen} onOpenChange={setPacOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><UserPlus className="mr-2 h-4 w-4" />Cadastrar paciente</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Cadastro rápido de paciente</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Nome completo *" value={pac.nome} onChange={e => setPac(p => ({ ...p, nome: e.target.value }))} />
                  <Input placeholder="CPF *" value={pac.cpf} onChange={e => setPac(p => ({ ...p, cpf: e.target.value }))} />
                  <Input placeholder="Telefone" value={pac.telefone} onChange={e => setPac(p => ({ ...p, telefone: e.target.value }))} />
                  <Input placeholder="E-mail" value={pac.email} onChange={e => setPac(p => ({ ...p, email: e.target.value }))} />
                  <p className="text-[11px] text-muted-foreground">
                    Ao salvar, é gerada uma tarefa de acompanhamento e o paciente entra na fila Feegow.
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPacOpen(false)}>Cancelar</Button>
                  <Button onClick={cadastrarPaciente}>Cadastrar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Nova tarefa */}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Nova tarefa</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Criar tarefa</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Título" value={novo.titulo} onChange={e => setNovo(n => ({ ...n, titulo: e.target.value }))} />
                  <Input placeholder="Responsável" value={novo.responsavel} onChange={e => setNovo(n => ({ ...n, responsavel: e.target.value }))} />
                  <Input placeholder="Prazo (ex: Amanhã 18:00)" value={novo.prazo} onChange={e => setNovo(n => ({ ...n, prazo: e.target.value }))} />
                  <div className="flex gap-2">
                    {(["baixa","media","alta","auto"] as Priority[]).map(p => (
                      <Button key={p} type="button"
                        variant={novo.prioridade === p ? "default" : "outline"}
                        onClick={() => setNovo(n => ({ ...n, prioridade: p }))}
                        className="capitalize flex-1">{p}</Button>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button onClick={create}>Criar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {(["pendente","andamento","concluida"] as TaskStatus[]).map(s => {
          const M = statusMeta[s];
          return (
            <button
              key={s}
              onClick={() => setFilter(filter === s ? "all" : s)}
              className={cn(
                "card-elevated flex items-center gap-3 p-4 text-left transition-all",
                filter === s && "ring-2 ring-primary",
              )}
            >
              <div className={cn("grid h-10 w-10 place-items-center rounded-lg", M.tone)}>
                <M.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{M.label}</p>
                <p className="font-display text-2xl font-bold">{counts[s]}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="card-elevated overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            Mostrando {filtered.length} de {tasks.length}
            {filter !== "all" && (
              <button onClick={() => setFilter("all")} className="ml-2 text-primary hover:underline">limpar filtro</button>
            )}
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Tarefa</th>
              <th className="p-3 text-left">Responsável</th>
              <th className="p-3 text-left">Prioridade</th>
              <th className="p-3 text-left">Prazo</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => {
              const M = statusMeta[t.status];
              const Vico = t.vinculo ? linkIcon[t.vinculo.tipo] : null;
              return (
                <tr key={t.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3">
                    <p className="font-medium">{t.titulo}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">{t.id}</span>
                      {t.vinculo && Vico && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] capitalize">
                          <Vico className="h-3 w-3" /> {t.vinculo.tipo} · {t.vinculo.label}
                        </span>
                      )}
                      {t.origem === "cadastro_paciente" && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">cadastro automático</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">{t.responsavel}</td>
                  <td className="p-3">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize", prioMeta[t.prioridade])}>
                      {t.prioridade === "auto" ? "auto" : t.prioridade}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">{t.prazo}</span>
                      <span className={cn("inline-flex w-fit items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", prazoTone(t.prazoHoras))}>
                        <AlarmClock className="h-3 w-3" /> {prazoLabel(t.prazoHoras)}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", M.tone)}>
                      <M.icon className="h-3 w-3" /> {M.label}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => advance(t)}>Avançar</Button>
                    <Button size="sm" variant="ghost"><UserPlus className="h-4 w-4" /></Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
