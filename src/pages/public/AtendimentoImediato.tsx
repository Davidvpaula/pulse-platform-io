import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Loader2 } from "lucide-react";
import PageShell from "@/components/PageShell";
import { toast } from "sonner";
import CalendarioFila from "@/components/atendimento-imediato/CalendarioFila";
import type { SlotEstado } from "@/components/atendimento-imediato/SlotCelula";
import type { PASlot } from "@/lib/pa-types";
import {
  getServicoAtendimentoImediato,
  ATENDIMENTO_IMEDIATO_CONFIG_CHANNEL,
  type AtendimentoImediatoConfig,
} from "@/lib/clinico";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import ServicoHero, { ServicoHeroSkeleton } from "@/components/public/ServicoHero";

type ServicoRow = {
  id: string;
  nome: string;
  tipo: string | null;
  subtitulo: string | null;
  descricao_publica: string | null;
  duracao_min: number;
  valor_paciente_centavos: number;
  imagem_url: string | null;
  icone: string | null;
};

export default function AtendimentoImediato() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [cfg, setCfg] = useState<AtendimentoImediatoConfig | null>(null);
  const [cfgLoaded, setCfgLoaded] = useState(false);
  const [servico, setServico] = useState<ServicoRow | null>(null);
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

  // Carregar row pública do serviço PA (para compor o card)
  useEffect(() => {
    if (!cfg?.servico_id) {
      setServico(null);
      return;
    }
    let alive = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("servicos_publicos")
        .select("id,nome,tipo,subtitulo,descricao_publica,duracao_min,valor_paciente_centavos,imagem_url,icone")
        .eq("id", cfg.servico_id)
        .maybeSingle();
      if (alive) setServico((data as ServicoRow) ?? null);
    })();
    return () => { alive = false; };
  }, [cfg?.servico_id]);

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

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

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
      <PageShell>
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </PageShell>
    );
  }

  // Porta pública desativada
  if (cfgLoaded && !cfg) {
    return (
      <PageShell title="Atendimento imediato">
        <div className="card-elevated p-10 text-center text-muted-foreground">
          Porta pública desativada pelo admin — nenhum serviço de Pronto Atendimento configurado.
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="space-y-6">
        {servico ? (
          <ServicoHero
            nome={servico.nome}
            subtitulo={servico.subtitulo}
            descricao={servico.descricao_publica}
            imagemUrl={servico.imagem_url}
            icone={servico.icone}
            tipo={servico.tipo ?? "Pronto Atendimento"}
            valorCentavos={servico.valor_paciente_centavos ?? cfg?.preco_centavos ?? 0}
            duracaoMin={servico.duracao_min ?? cfg?.duracao_min ?? 15}
            footerNota="Calendário compartilhado — escolha o horário, o sistema escolhe o médico."
          />
        ) : (
          <ServicoHeroSkeleton />
        )}

        {/* Strip de status compacto */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3 text-sm">
          <div className="inline-flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              <strong className="tabular-nums">{totalLivres}</strong>{" "}
              <span className="text-muted-foreground">horários livres hoje</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Legenda cor="bg-card border border-primary/30" texto="Livre" />
            <Legenda cor="bg-destructive/10 border border-destructive/40" texto="Lotado" />
          </div>
        </div>

        <div id="calendario" className="scroll-mt-24">
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
