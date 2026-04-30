import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Users, Info } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import CalendarioFila from "@/components/atendimento-imediato/CalendarioFila";
import RodapeReserva from "@/components/atendimento-imediato/RodapeReserva";
import type { SlotEstado } from "@/components/atendimento-imediato/SlotCelula";
import {
  MOCK_TTL_RESERVA_MS,
  criarCanalReservas,
  escolherMedico,
  fmtHora,
  mockMedicos,
  mockSlotsDoDia,
  obterPacienteId,
  slotMaisProximoComVaga,
  vagasRestantes,
  type MockSlot,
  type Reserva,
} from "@/lib/mocks/atendimentoImediatoMock";

export default function AtendimentoImediato() {
  const hoje = useMemo(() => new Date(), []);
  const slots = useMemo(() => mockSlotsDoDia(hoje), [hoje]);
  const pacienteId = useMemo(() => obterPacienteId(), []);
  const canalRef = useRef(criarCanalReservas());

  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [agora, setAgora] = useState(() => Date.now());
  const [destacar, setDestacar] = useState<string | null>(null);

  // tick + expiração
  useEffect(() => {
    const t = setInterval(() => {
      setAgora(Date.now());
      setReservas((prev) => {
        const ativas = prev.filter((r) => r.expiresAt > Date.now());
        if (ativas.length !== prev.length) {
          const minhas = prev.filter(
            (r) => r.pacienteId === pacienteId && r.expiresAt <= Date.now(),
          );
          if (minhas.length) {
            toast.message("Reserva expirou", {
              description: `O horário ${fmtHora(new Date(minhas[0].slotKey))} foi liberado.`,
            });
          }
        }
        return ativas;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [pacienteId]);

  // sincroniza reservas entre abas (simula concorrência multi-paciente)
  useEffect(() => {
    const unsub = canalRef.current.subscribe((remotas) => {
      setReservas((prev) => {
        // mantém minhas reservas locais + reservas vindas de outras abas
        const minhas = prev.filter((r) => r.pacienteId === pacienteId);
        const outras = remotas.filter((r) => r.pacienteId !== pacienteId);
        return [...minhas, ...outras];
      });
    });
    return unsub;
  }, [pacienteId]);

  function publicar(novas: Reserva[]) {
    canalRef.current.publish(novas);
  }

  const minhaReserva = useMemo(
    () => reservas.find((r) => r.pacienteId === pacienteId && r.expiresAt > agora),
    [reservas, pacienteId, agora],
  );

  const slotMinhaReserva = minhaReserva
    ? slots.find((s) => s.key === minhaReserva.slotKey)
    : null;
  const medicoMinhaReserva = minhaReserva
    ? mockMedicos.find((m) => m.id === minhaReserva.medicoId)
    : null;

  const estadoPorSlot = useMemo(() => {
    const map = new Map<string, { estado: SlotEstado; vagas: number; capacidade: number }>();
    for (const s of slots) {
      const cap = s.medicosDisponiveis.length;
      const vagas = vagasRestantes(s, reservas, agora);
      const fimMs = s.fim.getTime();
      const inicioMs = s.inicio.getTime();
      const minhaAqui = reservas.some(
        (r) => r.pacienteId === pacienteId && r.slotKey === s.key && r.expiresAt > agora,
      );
      const outraAqui = reservas.some(
        (r) => r.pacienteId !== pacienteId && r.slotKey === s.key && r.expiresAt > agora,
      );

      let estado: SlotEstado;
      if (fimMs < agora) estado = "passado";
      else if (cap === 0) estado = "lotado";
      else if (minhaAqui) estado = "reservado_por_mim";
      else if (vagas === 0) estado = "lotado";
      else if (inicioMs <= agora && agora < fimMs) estado = "em_atendimento";
      else if (outraAqui) estado = "reservado_por_outro";
      else estado = "livre";

      map.set(s.key, { estado, vagas, capacidade: cap });
    }
    return map;
  }, [slots, reservas, agora, pacienteId]);

  function reservar(slotAlvo: MockSlot) {
    // libera reserva anterior do mesmo paciente
    const semMinha = reservas.filter((r) => r.pacienteId !== pacienteId);

    let alvo: MockSlot = slotAlvo;
    let medico = escolherMedico(alvo, semMinha, agora);
    let transferido = false;

    if (!medico) {
      const fallback = slotMaisProximoComVaga(slots, slotAlvo, semMinha, agora);
      if (!fallback) {
        toast.error("Nenhum horário livre por enquanto. Tente em alguns segundos.");
        return;
      }
      alvo = fallback.slot;
      medico = fallback.medico;
      transferido = true;
    }

    const novaReserva: Reserva = {
      pacienteId,
      slotKey: alvo.key,
      medicoId: medico.id,
      expiresAt: Date.now() + MOCK_TTL_RESERVA_MS,
    };
    const proximas = [...semMinha, novaReserva];
    setReservas(proximas);
    publicar(proximas);
    setDestacar(alvo.key);
    setTimeout(() => setDestacar(null), 3000);

    if (transferido) {
      toast.warning("Horário trocado automaticamente", {
        description: `O ${fmtHora(slotAlvo.inicio)} foi pego por outro paciente. Alocamos ${fmtHora(alvo.inicio)} com Dr(a). ${medico.nome}.`,
      });
    } else {
      toast.success(`Reservado ${fmtHora(alvo.inicio)} com Dr(a). ${medico.nome}`, {
        description: "Você tem 1m30s para confirmar.",
      });
    }
  }

  function cancelar() {
    if (!minhaReserva) return;
    const proximas = reservas.filter((r) => !(r.pacienteId === pacienteId));
    setReservas(proximas);
    publicar(proximas);
    toast.message("Reserva liberada");
  }

  function confirmar() {
    if (!minhaReserva || !slotMinhaReserva || !medicoMinhaReserva) return;
    toast.success("Confirmado!", {
      description: `Atendimento agendado para ${fmtHora(slotMinhaReserva.inicio)} com Dr(a). ${medicoMinhaReserva.nome}.`,
    });
  }

  const totalLivres = Array.from(estadoPorSlot.values()).filter((v) => v.estado === "livre").length;
  const medicosNoPlantao = mockMedicos.length;

  return (
    <PageShell
      title="Atendimento imediato"
      subtitle="Calendário compartilhado — escolha o horário, o sistema escolhe o médico."
    >
      <div className="space-y-6">
        {/* header de status */}
        <div className="card-elevated overflow-hidden">
          <div className="gradient-soft flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <Badge className="mb-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                <Activity className="mr-1 h-3 w-3" /> Pronto Atendimento
              </Badge>
              <p className="text-sm text-muted-foreground">
                <Users className="mr-1 inline h-3.5 w-3.5" />
                {medicosNoPlantao} médicos no plantão · <strong>{totalLivres}</strong> horários livres hoje
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Sessão: <code className="rounded bg-muted px-1 py-0.5">{pacienteId}</code> ·
                Abra outra aba anônima ou use{" "}
                <code className="rounded bg-muted px-1 py-0.5">?paciente=B</code> para simular concorrência.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Legenda cor="bg-card border border-primary/30" texto="Livre" />
              <Legenda cor="bg-accent ring-2 ring-primary" texto="Você reservou" />
              <Legenda cor="bg-muted/60" texto="Parcial" />
              <Legenda cor="bg-destructive/10 border border-destructive/40" texto="Lotado" />
            </div>
          </div>
        </div>

        {/* aviso */}
        <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            Se outro paciente reservar o mesmo horário antes de você, o sistema move você
            automaticamente para o horário <strong>mais próximo</strong> com vaga e atribui
            o melhor médico disponível pela regra de <strong>tempo de casa</strong>.
          </span>
        </div>

        <CalendarioFila
          slots={slots}
          estadoPorSlot={estadoPorSlot}
          destacar={destacar}
          onPick={reservar}
        />

        {minhaReserva && slotMinhaReserva && medicoMinhaReserva && (
          <RodapeReserva
            slot={slotMinhaReserva}
            medico={medicoMinhaReserva}
            msRestantes={minhaReserva.expiresAt - agora}
            onCancelar={cancelar}
            onConfirmar={confirmar}
          />
        )}
      </div>
    </PageShell>
  );
}

function Legenda({ cor, texto }: { cor: string; texto: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className={`inline-block h-3 w-3 rounded ${cor}`} />
      {texto}
    </span>
  );
}
