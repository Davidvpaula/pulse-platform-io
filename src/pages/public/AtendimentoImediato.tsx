import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Users, Info, Loader2 } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import CalendarioFila from "@/components/atendimento-imediato/CalendarioFila";
import type { SlotEstado } from "@/components/atendimento-imediato/SlotCelula";
import type { PASlot } from "@/lib/pa-types";
import { brl } from "@/lib/format";
import {
  getServicoAtendimentoImediato,
  ATENDIMENTO_IMEDIATO_CONFIG_CHANNEL,
  type AtendimentoImediatoConfig,
} from "@/lib/clinico";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";

export default function AtendimentoImediato() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [cfg, setCfg] = useState<AtendimentoImediatoConfig | null>(null);
  const [cfgLoaded, setCfgLoaded] = useState(false);
  const [slots, setSlots] = useState<PASlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [agora, setAgora] = useState(() => Date.now());

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
    const interval = setInterval(carregarSlots, 15_000);
    return () => clearInterval(interval);
  }, []);

  // Tick para atualizar estado visual (passado/livre)
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  // Estado visual dos slots
  const estadoPorSlot = useMemo(() => {
    const map = new Map<string, { estado: SlotEstado; vagas: number; capacidade: number }>();
    for (const s of slots) {
      const fimMs = s.fim.getTime();
      let estado: SlotEstado;
      if (fimMs < agora) estado = "passado";
      else if ((s.total_vagas ?? 0) === 0) estado = "lotado";
      else estado = "livre";

      map.set(s.key, { estado, vagas: s.total_vagas ?? 0, capacidade: s.total_vagas ?? 0 });
    }
    return map;
  }, [slots, agora]);

  /**
   * Ao clicar num slot, navega direto para a rota unificada de confirmação.
   * A reserva real (15 min) acontece quando o paciente submete o formulário.
   * Isso é idêntico ao fluxo dos Serviços da Plataforma.
   */
  function selecionarSlot(slot: PASlot) {
    if (!cfg?.servico_id) {
      toast.error("Atendimento Imediato não está configurado.");
      return;
    }
    if (!session) {
      toast.error("Faça login para agendar um horário.");
      navigate("/auth");
      return;
    }
    navigate(`/app/agendamento/confirmar/${slot.slot_id}?tipo=pa&ref=${cfg.servico_id}`);
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
              <Legenda cor="bg-destructive/10 border border-destructive/40" texto="Lotado" />
            </div>
          </div>
        </div>

        {/* aviso */}
        <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            Ao selecionar um horário, você será levado ao formulário de confirmação.
            O sistema atribui automaticamente o melhor médico disponível pelo <strong>ranking</strong>.
            A reserva é garantida por <strong>15 minutos</strong> para você concluir o pagamento.
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
            destacar={null}
            onPick={selecionarSlot}
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
