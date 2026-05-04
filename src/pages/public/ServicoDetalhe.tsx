import { useEffect, useMemo, useState } from "react";
import { brl, fmtHora } from "@/lib/format";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Clock, Users, Info, Activity } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import CalendarioFila from "@/components/atendimento-imediato/CalendarioFila";
import RodapeReserva from "@/components/atendimento-imediato/RodapeReserva";
import type { SlotEstado } from "@/components/atendimento-imediato/SlotCelula";
import type { PASlot, PAReserva } from "@/lib/pa-types";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

type Servico = {
  id: string;
  nome: string;
  descricao_publica: string | null;
  duracao_min: number;
  valor_paciente_centavos: number;
};

const TTL_MS = 90_000;

export default function ServicoDetalhe() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [servico, setServico] = useState<Servico | null>(null);
  const [slots, setSlots] = useState<PASlot[]>([]);
  const [reserva, setReserva] = useState<PAReserva | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  const [destacar, setDestacar] = useState<string | null>(null);

  // Load service
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: s } = await (supabase as any)
        .from("servicos_publicos")
        .select("id,nome,descricao_publica,duracao_min,valor_paciente_centavos,ativo")
        .eq("slug", slug)
        .maybeSingle();
      if (!s || !(s as any).ativo) {
        setLoading(false);
        return;
      }

      // Check if this is the PA service — redirect to dedicated page
      const { data: paCfg } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "atendimento_imediato.servico_id")
        .maybeSingle();
      const paId = (paCfg?.value as string | null) ?? null;
      if (paId === s.id) {
        navigate("/atendimento-imediato", { replace: true });
        return;
      }

      setServico(s as Servico);
      setLoading(false);
    })();
  }, [slug, navigate]);

  // Load slots when service is loaded
  async function carregarSlots() {
    if (!servico) return;
    const { data, error } = await supabase.rpc("fn_servico_slots_disponiveis" as any, {
      _servico_id: servico.id,
      _data: new Date().toISOString().slice(0, 10),
    });
    if (error) {
      console.error("Erro ao carregar slots:", error);
      setSlots([]);
    } else {
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
  }

  useEffect(() => {
    if (!servico) return;
    carregarSlots();
    const interval = setInterval(carregarSlots, 15_000);
    return () => clearInterval(interval);
  }, [servico]);

  // Expiration tick
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

  // Slot visual state
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
    if (!servico) return;

    const { data, error } = await supabase.rpc("fn_servico_reservar_slot" as any, {
      _slot_inicio: slot.key,
      _servico_id: servico.id,
    });

    if (error || !(data as any)?.ok) {
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
      expiresAt: Date.now() + TTL_MS,
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

  async function confirmar() {
    if (!reserva || !servico) return;

    const { data, error } = await supabase.rpc("fn_servico_confirmar_reserva" as any, {
      _slot_id: reserva.slot_id,
      _servico_id: servico.id,
    });

    if (error || !(data as any)?.ok) {
      toast.error((data as any)?.erro || "Erro ao confirmar. Reserva pode ter expirado.");
      setReserva(null);
      carregarSlots();
      return;
    }

    toast.success("Confirmado!", {
      description: `Atendimento agendado com Dr(a). ${reserva.medico_nome}. Redirecionando…`,
    });
    setReserva(null);
    navigate(`/app/paciente/consultas`);
  }

  const totalLivres = Array.from(estadoPorSlot.values()).filter((v) => v.estado === "livre").length;

  if (loading) {
    return (
      <PageShell title="Carregando…">
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </PageShell>
    );
  }

  if (!servico) {
    return (
      <PageShell title="Serviço não encontrado">
        <div className="card-elevated p-10 text-center">
          <Button asChild>
            <Link to="/servicos">Voltar aos serviços</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={servico.nome}
      subtitle="Calendário compartilhado — escolha o horário, o sistema escolhe o profissional."
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="card-elevated overflow-hidden">
          <div className="gradient-soft flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <Badge className="mb-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                <Activity className="mr-1 h-3 w-3" /> Serviço da Plataforma
              </Badge>
              {servico.descricao_publica && (
                <p className="text-sm text-muted-foreground mb-2">{servico.descricao_publica}</p>
              )}
              <p className="text-sm font-medium">
                Valor: <span className="tabular-nums">{brl(servico.valor_paciente_centavos)}</span>{" "}
                · Duração: <span className="tabular-nums">{servico.duracao_min} min</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                <Users className="mr-1 inline h-3.5 w-3.5" />
                <strong>{totalLivres}</strong> horários livres hoje
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Legenda cor="bg-card border border-primary/30" texto="Livre" />
              <Legenda cor="bg-accent ring-2 ring-primary" texto="Você reservou" />
              <Legenda cor="bg-destructive/10 border border-destructive/40" texto="Lotado" />
            </div>
          </div>
        </div>

        {/* Aviso */}
        <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            Se outro paciente reservar o mesmo horário antes de você, o sistema move você
            automaticamente para o horário <strong>mais próximo</strong> com vaga e atribui
            o melhor profissional disponível pelo <strong>ranking</strong>.
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
            precoCentavos={servico.valor_paciente_centavos}
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
