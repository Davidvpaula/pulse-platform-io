import { useCallback, useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, Calendar, Clock, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type SlotRow = {
  id: string;
  inicio: string;
  fim: string;
  modalidade: string;
  medico_id: string;
  medico_nome: string;
  especialidade_nome: string;
};

type PacienteRow = {
  id: string;
  nome_completo: string;
  cpf: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCriado: () => void;
};

export default function NovoAgendamentoDialog({ open, onOpenChange, onCriado }: Props) {
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [pacientes, setPacientes] = useState<PacienteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [slotId, setSlotId] = useState("");
  const [pacienteId, setPacienteId] = useState("");
  const [buscaPac, setBuscaPac] = useState("");
  const [motivo, setMotivo] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    // Slots disponíveis nos próximos 30 dias
    const agora = new Date();
    const limite = new Date();
    limite.setDate(limite.getDate() + 30);

    const { data: slotsData } = await supabase
      .from("agenda_slots")
      .select(`
        id, inicio, fim, modalidade, medico_id,
        medicos:medico_id ( nome, especialidade )
      `)
      .eq("status", "disponivel")
      .gte("inicio", agora.toISOString())
      .lte("inicio", limite.toISOString())
      .order("inicio")
      .limit(100);

    setSlots(
      (slotsData ?? []).map((s: any) => ({
        id: s.id,
        inicio: s.inicio,
        fim: s.fim,
        modalidade: s.modalidade,
        medico_id: s.medico_id,
        medico_nome: s.medicos?.nome ?? "Médico",
        especialidade_nome: s.medicos?.especialidade ?? "—",
      })),
    );

    // Pacientes cadastrados
    const { data: pacs } = await supabase
      .from("pacientes")
      .select("id, nome_completo, cpf")
      .order("nome_completo")
      .limit(500);

    setPacientes(pacs ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      setSlotId("");
      setPacienteId("");
      setBuscaPac("");
      setMotivo("");
      carregar();
    }
  }, [open, carregar]);

  const pacientesFiltrados = buscaPac.trim()
    ? pacientes.filter(
        (p) =>
          p.nome_completo?.toLowerCase().includes(buscaPac.toLowerCase()) ||
          p.cpf?.includes(buscaPac.replace(/\D/g, "")),
      )
    : pacientes;

  const slotSel = slots.find((s) => s.id === slotId);

  async function criar() {
    if (!slotId || !pacienteId) {
      toast.error("Selecione o horário e o paciente.");
      return;
    }
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;

    setSubmitting(true);
    try {
      // Buscar especialidade_id do médico
      const { data: medEsp } = await supabase
        .from("medico_especialidades")
        .select("especialidade_id")
        .eq("medico_id", slot.medico_id)
        .limit(1)
        .maybeSingle();

      const { error: errSlot } = await supabase
        .from("agenda_slots")
        .update({ status: "reservado" })
        .eq("id", slotId)
        .eq("status", "disponivel");

      if (errSlot) throw errSlot;

      const { error: errConsulta } = await supabase.from("consultas").insert({
        slot_id: slotId,
        medico_id: slot.medico_id,
        paciente_id: pacienteId,
        especialidade_id: medEsp?.especialidade_id ?? null,
        inicio: slot.inicio,
        fim: slot.fim,
        modalidade: slot.modalidade,
        status: "agendada",
        motivo: motivo.trim() || null,
        canal_origem: "manual_secretaria",
      });

      if (errConsulta) throw errConsulta;

      toast.success("Consulta agendada com sucesso!");
      onOpenChange(false);
      onCriado();
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível agendar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo agendamento manual</DialogTitle>
          <DialogDescription>
            Selecione um horário disponível e o paciente para criar a consulta.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando dados…
          </div>
        ) : (
          <div className="space-y-4">
            {/* Slot */}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Horário disponível
              </Label>
              <Select value={slotId} onValueChange={setSlotId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione um horário" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {slots.length === 0 && (
                    <div className="p-3 text-xs text-muted-foreground text-center">
                      Nenhum horário disponível nos próximos 30 dias.
                    </div>
                  )}
                  {slots.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {format(new Date(s.inicio), "dd/MM · HH:mm", { locale: ptBR })}
                      {" — "}
                      {s.medico_nome} · {s.especialidade_nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {slotSel && (
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(slotSel.inicio), "EEEE, dd 'de' MMM", { locale: ptBR })}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(slotSel.inicio), "HH:mm")} – {format(new Date(slotSel.fim), "HH:mm")}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Stethoscope className="h-3 w-3" />
                    {slotSel.medico_nome}
                  </span>
                </div>
              )}
            </div>

            {/* Paciente */}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Paciente
              </Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou CPF…"
                  value={buscaPac}
                  onChange={(e) => setBuscaPac(e.target.value)}
                  className="pl-9 mb-1.5"
                />
              </div>
              <Select value={pacienteId} onValueChange={setPacienteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent className="max-h-52">
                  {pacientesFiltrados.length === 0 && (
                    <div className="p-3 text-xs text-muted-foreground text-center">
                      Nenhum paciente encontrado.
                    </div>
                  )}
                  {pacientesFiltrados.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome_completo}{p.cpf ? ` · ${p.cpf}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Motivo */}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Motivo (opcional)
              </Label>
              <Textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Motivo da consulta…"
                rows={2}
                maxLength={500}
                className="mt-1"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={criar}
            disabled={submitting || !slotId || !pacienteId}
            className="bg-gradient-primary hover:opacity-90"
          >
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Agendando…</>
            ) : (
              "Agendar consulta"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
