import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2, Database, Clock, Video, MapPin } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSession } from "@/lib/session";
import {
  listSlotsDoMedico,
  criarSlot,
  excluirSlot,
  type AgendaSlot,
} from "@/lib/clinico";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Modalidade = "online" | "presencial";

function statusLabel(s: AgendaSlot["status"]) {
  const m: Record<AgendaSlot["status"], { label: string; cls: string }> = {
    disponivel: { label: "Disponível", cls: "bg-success/10 text-success" },
    reservado: { label: "Reservado", cls: "bg-warning/10 text-warning" },
    bloqueado: { label: "Bloqueado", cls: "bg-muted text-muted-foreground" },
  };
  return m[s];
}

function fmtDataHora(iso: string) {
  return format(new Date(iso), "EEE, dd 'de' MMM · HH:mm", { locale: ptBR });
}

export default function MedicoHorarios() {
  const { session } = useSession();
  const [slots, setSlots] = useState<AgendaSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AgendaSlot | null>(null);

  // Form state
  const [data, setData] = useState<Date | undefined>();
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFim, setHoraFim] = useState("09:30");
  const [modalidade, setModalidade] = useState<Modalidade>("online");
  const [observacoes, setObservacoes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    setLoading(true);
    const list = await listSlotsDoMedico();
    setSlots(list);
    setLoading(false);
  }

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  function resetForm() {
    setData(undefined);
    setHoraInicio("09:00");
    setHoraFim("09:30");
    setModalidade("online");
    setObservacoes("");
  }

  async function onSubmit() {
    if (!data) {
      toast.error("Selecione uma data.");
      return;
    }
    const [hi, mi] = horaInicio.split(":").map(Number);
    const [hf, mf] = horaFim.split(":").map(Number);
    const inicio = new Date(data);
    inicio.setHours(hi, mi, 0, 0);
    const fim = new Date(data);
    fim.setHours(hf, mf, 0, 0);

    setSubmitting(true);
    const res = await criarSlot({ inicio, fim, modalidade, observacoes: observacoes || undefined });
    setSubmitting(false);

    if (!res.ok) {
      toast.error(res.error ?? "Não foi possível criar o horário.");
      return;
    }
    toast.success("Horário cadastrado.");
    setOpenCreate(false);
    resetForm();
    refresh();
  }

  async function onDelete() {
    if (!confirmDelete) return;
    const res = await excluirSlot(confirmDelete.id);
    setConfirmDelete(null);
    if (!res.ok) {
      toast.error(res.error ?? "Não foi possível excluir.");
      return;
    }
    toast.success("Horário removido.");
    refresh();
  }

  if (!session) {
    return (
      <div className="space-y-6">
        <PageHeader title="Meus horários" description="Cadastre os horários disponíveis para os pacientes agendarem." />
        <div className="card-elevated p-10 text-center text-sm text-muted-foreground">
          Faça login como médico para gerenciar seus horários.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meus horários"
        description="Cadastre os horários disponíveis para os pacientes agendarem online."
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
              <Database className="h-3 w-3" /> Dados em tempo real
            </span>
            <Button onClick={() => setOpenCreate(true)} className="bg-gradient-primary hover:opacity-90">
              <Plus className="mr-1.5 h-4 w-4" /> Adicionar horário
            </Button>
          </div>
        }
      />

      <div className="card-elevated overflow-hidden">
        <div className="divide-y divide-border">
          {loading && (
            <p className="p-10 text-center text-sm text-muted-foreground">Carregando…</p>
          )}
          {!loading && slots.length === 0 && (
            <div className="p-10 text-center">
              <Clock className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-medium">Nenhum horário cadastrado</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Adicione horários para que pacientes possam agendar com você.
              </p>
            </div>
          )}
          {!loading &&
            slots.map((s) => {
              const st = statusLabel(s.status);
              return (
                <div key={s.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 p-4 hover:bg-muted/30">
                  <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary-soft text-primary">
                    {s.modalidade === "online" ? <Video className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold capitalize">{fmtDataHora(s.inicio)}</p>
                    <p className="text-xs text-muted-foreground">
                      até {format(new Date(s.fim), "HH:mm")} · {s.modalidade}
                      {s.observacoes ? ` · ${s.observacoes}` : ""}
                    </p>
                    <span className={cn("mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium", st.cls)}>
                      {st.label}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={s.status !== "disponivel"}
                    onClick={() => setConfirmDelete(s)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
        </div>
      </div>

      {/* Modal criar */}
      <Dialog open={openCreate} onOpenChange={(o) => { setOpenCreate(o); if (!o) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo horário disponível</DialogTitle>
            <DialogDescription>
              Pacientes verão esse horário ao agendar consulta com você.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !data && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {data ? format(data, "PPP", { locale: ptBR }) : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={data}
                    onSelect={setData}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    locale={ptBR}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="hi">Início</Label>
                <Input id="hi" type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hf">Fim</Label>
                <Input id="hf" type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Modalidade</Label>
              <Select value={modalidade} onValueChange={(v) => setModalidade(v as Modalidade)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online (telemedicina)</SelectItem>
                  <SelectItem value="presencial">Presencial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="obs">Observações (opcional)</Label>
              <Textarea
                id="obs"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: atendimento prioritário para retorno"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
            <Button onClick={onSubmit} disabled={submitting} className="bg-gradient-primary hover:opacity-90">
              {submitting ? "Salvando…" : "Salvar horário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir horário?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O horário deixará de aparecer para os pacientes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
