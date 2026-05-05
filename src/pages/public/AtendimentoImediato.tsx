import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Users, Info, Loader2 } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import CalendarioFila from "@/components/atendimento-imediato/CalendarioFila";
import RodapeReserva from "@/components/atendimento-imediato/RodapeReserva";
import type { SlotEstado } from "@/components/atendimento-imediato/SlotCelula";
import type { PASlot, PAReserva } from "@/lib/pa-types";
import { brl, fmtHora } from "@/lib/format";
import {
  getServicoAtendimentoImediato,
  ATENDIMENTO_IMEDIATO_CONFIG_CHANNEL,
  type AtendimentoImediatoConfig,
} from "@/lib/clinico";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";

const TTL_MS = 90_000;

export default function AtendimentoImediato() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [cfg, setCfg] = useState<AtendimentoImediatoConfig | null>(null);
  const [cfgLoaded, setCfgLoaded] = useState(false);
  const [slots, setSlots] = useState<PASlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserva, setReserva] = useState<PAReserva | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  const [destacar, setDestacar] = useState<string | null>(null);

  // Carregar config
  useEffect(() => {
    let alive = true;
    const refetch = () => {
      getServicoAtendimentoImediato().then((c) => {
        if (!alive) return;
        setCfg(c);
        setCfgLoaded(true);
      });
    };
    refetch();
    if (typeof BroadcastChannel !== "undefined") {
      const ch = new BroadcastChannel(ATENDIMENTO_IMEDIATO_CONFIG_CHANNEL);
      ch.onmessage = (ev) => {
        if (ev.data?.t === "changed") {
          toast.message("Configuração atualizada", {
            description: "Recarregando o calendário com os novos parâmetros…",
          });
          refetch();
          carregarSlots();
        }
      };
      return () => { alive = false; ch.close(); };
    }
    return () => { alive = false; };
  }, []);

  // Carregar slots reais
  async function carregarSlots() {
    const { data, error } = await supabase.rpc("fn_pa_slots_disponiveis" as any, {
      _data: new Date().toISOString().slice(0, 10),
    });
    if (error) {
      console.error("Erro ao carregar slots PA:", error);
      setSlots([]);
    } else {
      // Agregar por início (cada início pode ter múltiplos médicos = vagas)
      const agrupado = new Map<string, PASlot>();
      for (const row of (data ?? []) as any[]) {
        const key = row.inicio;
        if (!agrupado.has(key)) {
          agrupado.set(key, {
            key,
            slot_id: row.slot_id,
            inicio: new Date(row.inicio),
            fim: new Date(row.fim),
            medico_id: row.medico_id,
            total_vagas: Number(row.total_vagas),
          });
        }
      }
      setSlots(Array.from(agrupado.values()).sort((a, b) => a.inicio.getTime() - b.inicio.getTime()));
    }
    setLoading(false);
  }

  useEffect(() => {
    carregarSlots();
    const interval = setInterval(carregarSlots, 15_000); // refresh a cada 15s
    return () => clearInterval(interval);
  }, []);

  // Tick de expiração
  useEffect(() => {
    const t = setInterval(() => {
      setAgora(Date.now());
      setReserva((prev) => {
        if (prev && prev.expiresAt <= Date.now()) {
          toast.message("Reserva expirou", {
            description: `O horário ${fmtHora(prev.inicio)} foi liberado.`,
          });
          carregarSlots();
          return null;
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Estado visual dos slots
  const estadoPorSlot = useMemo(() => {
    const map = new Map<string, { estado: SlotEstado; vagas: number; capacidade: number }>();
    for (const s of slots) {
      const fimMs = s.fim.getTime();
      const inicioMs = s.inicio.getTime();
      const minhaAqui = reserva?.slot_key === s.key && reserva.expiresAt > agora;

      let estado: SlotEstado;
      if (fimMs < agora) estado = "passado";
      else if ((s.total_vagas ?? 0) === 0) estado = "lotado";
      else if (minhaAqui) estado = "reservado_por_mim";
      else if (inicioMs <= agora && agora < fimMs) estado = "em_atendimento";
      else estado = "livre";

      map.set(s.key, { estado, vagas: s.total_vagas ?? 0, capacidade: s.total_vagas ?? 0 });
    }
    return map;
  }, [slots, reserva, agora]);

  async function reservar(slot: PASlot) {
    if (!session) {
      toast.error("Faça login para reservar um horário.");
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase.rpc("fn_pa_reservar_slot" as any, {
      _slot_inicio: slot.key,
    });

    if (error) {
      toast.error("Erro de conexão ao reservar.", { description: error.message });
      carregarSlots();
      return;
    }
    if (!(data as any)?.ok) {
      toast.error((data as any)?.erro || "Erro ao reservar. Tente novamente.");
      carregarSlots();
      return;
    }

    const res = data as any;
    setReserva({
      slot_id: res.slot_id,
      slot_key: res.inicio,
      medico_id: res.medico_id,
      medico_nome: res.medico_nome,
      inicio: res.inicio,
      fim: res.fim,
      expiresAt: res.reserva_expira_em ? new Date(res.reserva_expira_em).getTime() : Date.now() + TTL_MS,
    });
    setDestacar(res.inicio);
    setTimeout(() => setDestacar(null), 3000);
    carregarSlots();

    if (res.transferido) {
      toast.warning("Horário trocado automaticamente", {
        description: `O horário pedido foi ocupado. Alocamos ${fmtHora(res.inicio)} com Dr(a). ${res.medico_nome}.`,
      });
    } else {
      toast.success(`Reservado ${fmtHora(res.inicio)} com Dr(a). ${res.medico_nome}`, {
        description: "Você tem 1m30s para confirmar.",
      });
    }
  }

  function cancelar() {
    setReserva(null);
    carregarSlots();
    toast.message("Reserva liberada");
  }

  function confirmar() {
    if (!reserva || !cfg?.servico_id) return;
    // Redireciona para a rota unificada de agendamento (formulário → reserva → checkout → pagamento)
    navigate(`/app/agendamento/confirmar/${reserva.slot_id}?tipo=pa&ref=${cfg.servico_id}`);
  }

  const totalLivres = Array.from(estadoPorSlot.values()).filter((v) => v.estado === "livre").length;

  if (loading) {
    return (
      <PageShell title="Atendimento imediato">
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </PageShell>
    );
  }

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
                <strong>{totalLivres}</strong> horários livres hoje
              </p>
              {cfgLoaded && cfg && (
                <p className="mt-1 text-sm font-medium">
                  Valor por atendimento: <span className="tabular-nums">{brl(cfg.preco_centavos)}</span>{" "}
                  · Duração: <span className="tabular-nums">{cfg.duracao_min} min</span>
                </p>
              )}
              {cfgLoaded && !cfg && (
                <p className="mt-1 text-xs text-warning">
                  Porta pública desativada pelo admin — nenhum serviço de PA configurado.
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Legenda cor="bg-card border border-primary/30" texto="Livre" />
              <Legenda cor="bg-accent ring-2 ring-primary" texto="Você reservou" />
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
            o melhor médico disponível pelo <strong>ranking</strong>.
          </span>
        </div>

        {slots.length === 0 ? (
          <div className="card-elevated p-10 text-center text-muted-foreground">
            Nenhum horário disponível no momento. Tente novamente mais tarde.
          </div>
        ) : (
          <CalendarioFila
            slots={slots}
            estadoPorSlot={estadoPorSlot}
            destacar={destacar}
            onPick={reservar}
          />
        )}

        {reserva && (
          <RodapeReserva
            medicoNome={reserva.medico_nome}
            inicio={reserva.inicio}
            msRestantes={reserva.expiresAt - agora}
            precoCentavos={cfg?.preco_centavos}
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
