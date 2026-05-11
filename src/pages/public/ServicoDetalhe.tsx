import { useEffect, useMemo, useState, useCallback } from "react";
import { fmtHora, dataLabel } from "@/lib/format";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Loader2, Info, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import PageShell from "@/components/PageShell";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import CalendarioFila from "@/components/atendimento-imediato/CalendarioFila";
import type { SlotEstado } from "@/components/atendimento-imediato/SlotCelula";
import type { PASlot } from "@/lib/pa-types";
import { Button } from "@/components/ui/button";
import ServicoHero, { ServicoHeroSkeleton } from "@/components/public/ServicoHero";

type Servico = {
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

function dataKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function ServicoDetalhe() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [servico, setServico] = useState<Servico | null>(null);
  const [slots, setSlots] = useState<PASlot[]>([]);
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);

  // Load service
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: s } = await (supabase as any)
        .from("servicos_publicos")
        .select("id,nome,tipo,subtitulo,descricao_publica,duracao_min,valor_paciente_centavos,imagem_url,icone,ativo")
        .eq("slug", slug)
        .maybeSingle();
      if (!s || !(s as any).ativo) {
        setLoading(false);
        return;
      }

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

  // Load slots
  const carregarSlots = useCallback(async () => {
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
      const sorted = Array.from(agrupado.values()).sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
      setSlots(sorted);
      if (sorted.length > 0 && !diaSelecionado) {
        setDiaSelecionado(dataKey(sorted[0].inicio));
      }
    }
  }, [servico, diaSelecionado]);

  useEffect(() => {
    if (!servico) return;
    carregarSlots();
    const interval = setInterval(carregarSlots, 15_000);
    return () => clearInterval(interval);
  }, [servico, carregarSlots]);

  // Group slots by date
  const diasComSlots = useMemo(() => {
    const map = new Map<string, PASlot[]>();
    for (const s of slots) {
      const dk = dataKey(s.inicio);
      if (!map.has(dk)) map.set(dk, []);
      map.get(dk)!.push(s);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [slots]);

  const slotsNoDia = useMemo(() => {
    if (!diaSelecionado) return [];
    return slots.filter((s) => dataKey(s.inicio) === diaSelecionado);
  }, [slots, diaSelecionado]);

  const estadoPorSlot = useMemo(() => {
    const now = Date.now();
    const map = new Map<string, { estado: SlotEstado; vagas: number; capacidade: number }>();
    for (const s of slotsNoDia) {
      const fimMs = s.fim.getTime();
      const inicioMs = s.inicio.getTime();

      let estado: SlotEstado;
      if (fimMs < now) estado = "passado";
      else if ((s.total_vagas ?? 0) === 0) estado = "lotado";
      else if (inicioMs <= now && now < fimMs) estado = "em_atendimento";
      else estado = "livre";

      map.set(s.key, { estado, vagas: s.total_vagas ?? 0, capacidade: s.total_vagas ?? 0 });
    }
    return map;
  }, [slotsNoDia]);

  /**
   * Ao clicar no slot, NÃO reservamos aqui.
   * Apenas redirecionamos para a rota unificada que cuida de:
   * Formulário → Reserva → Checkout → Pagamento → Consulta
   */
  function escolherSlot(slot: PASlot) {
    if (!session) {
      toast.error("Faça login para reservar um horário.");
      navigate("/auth");
      return;
    }
    if (!servico) return;
    navigate(`/app/agendamento/confirmar/${slot.slot_id}?tipo=servico&ref=${servico.id}`);
  }

  const totalLivres = Array.from(estadoPorSlot.values()).filter((v) => v.estado === "livre").length;

  if (loading) {
    return (
      <PageShell title="Carregando…">
        <ServicoHeroSkeleton />
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

  const idxDia = diasComSlots.findIndex(([dk]) => dk === diaSelecionado);

  return (
    <PageShell
      title={servico.nome}
      subtitle="Calendário compartilhado — escolha o horário, o sistema escolhe o profissional."
    >
      <div className="space-y-6">
        <ServicoHero
          nome={servico.nome}
          subtitulo={servico.subtitulo}
          descricao={servico.descricao_publica}
          imagemUrl={servico.imagem_url}
          icone={servico.icone}
          tipo={servico.tipo}
          valorCentavos={servico.valor_paciente_centavos}
          duracaoMin={servico.duracao_min}
        />

        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground tabular-nums">{totalLivres}</strong> horários livres{" "}
          {diaSelecionado ? dataLabel(diaSelecionado).toLowerCase() : ""}
        </p>

        {/* Aviso */}
        <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            Selecione o horário desejado. Na próxima etapa você preencherá seus dados
            e seguirá para o pagamento. O horário ficará reservado por 15 minutos.
          </span>
        </div>

        {/* Date navigation + calendário */}
        <div id="calendario" className="space-y-6 scroll-mt-24">
          {diasComSlots.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                disabled={idxDia <= 0}
                onClick={() => {
                  if (idxDia > 0) setDiaSelecionado(diasComSlots[idxDia - 1][0]);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex flex-1 gap-2 overflow-x-auto pb-1">
                {diasComSlots.map(([dk, daySlots]) => (
                  <button
                    key={dk}
                    onClick={() => setDiaSelecionado(dk)}
                    className={`flex flex-col items-center rounded-lg border px-4 py-2 text-xs transition-all shrink-0 ${
                      dk === diaSelecionado
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <Calendar className="mb-1 h-3.5 w-3.5" />
                    <span className="font-medium">{dataLabel(dk)}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {daySlots.length} horário{daySlots.length !== 1 ? "s" : ""}
                    </span>
                  </button>
                ))}
              </div>

              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                disabled={idxDia >= diasComSlots.length - 1}
                onClick={() => {
                  if (idxDia < diasComSlots.length - 1) setDiaSelecionado(diasComSlots[idxDia + 1][0]);
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {slots.length === 0 ? (
            <div className="card-elevated p-10 text-center text-muted-foreground">
              Nenhum horário disponível no momento. Tente novamente mais tarde.
            </div>
          ) : slotsNoDia.length === 0 ? (
            <div className="card-elevated p-10 text-center text-muted-foreground">
              Selecione um dia acima para ver os horários.
            </div>
          ) : (
            <CalendarioFila
              slots={slotsNoDia}
              estadoPorSlot={estadoPorSlot}
              destacar={null}
              onPick={escolherSlot}
            />
          )}
        </div>
      </div>
    </PageShell>
  );
}

