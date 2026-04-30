import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Clock, Stethoscope, ArrowRight, Activity } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Servico = {
  id: string;
  nome: string;
  descricao_publica: string | null;
  duracao_min: number;
  valor_paciente_centavos: number;
};

type MedicoCard = {
  medico_id: string;
  nome: string;
  especialidade: string | null;
  disponivel_agora: boolean;
  proximo_slot_iso: string | null;
};

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function AtendimentoImediato() {
  const [loading, setLoading] = useState(true);
  const [servico, setServico] = useState<Servico | null>(null);
  const [medicos, setMedicos] = useState<MedicoCard[]>([]);
  const [iniciando, setIniciando] = useState(false);

  useEffect(() => {
    void carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    try {
      // 1. Pega o ID do serviço configurado em app_settings
      const { data: cfg } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "atendimento_imediato.servico_id")
        .maybeSingle();

      const servicoId = cfg?.value as string | null;
      if (!servicoId) {
        setLoading(false);
        return;
      }

      // 2. Busca o serviço
      const { data: s } = await supabase
        .from("servicos_financeiros")
        .select("id,nome,descricao_publica,duracao_min,valor_paciente_centavos,ativo")
        .eq("id", servicoId)
        .maybeSingle();

      if (!s || !s.ativo) {
        setLoading(false);
        return;
      }
      setServico(s as Servico);

      // 3. Lista médicos vinculados (sem ranking visível ao paciente)
      const { data: vinc } = await supabase
        .from("medico_servicos")
        .select("medico_id")
        .eq("servico_id", servicoId)
        .eq("status", "ativo")
        .eq("ativo", true);

      const ids = (vinc ?? []).map((v: any) => v.medico_id);
      if (ids.length === 0) {
        setMedicos([]);
        setLoading(false);
        return;
      }

      const { data: meds } = await supabase
        .from("medicos")
        .select("id,nome,especialidade")
        .in("id", ids);

      // 4. Para cada médico, próximo slot disponível
      const agora = new Date();
      const limiteAgora = new Date(agora.getTime() + 30 * 60 * 1000); // próximos 30 min = "agora"

      const cards: MedicoCard[] = [];
      for (const m of meds ?? []) {
        const { data: slot } = await supabase
          .from("agenda_slots")
          .select("inicio")
          .eq("medico_id", m.id)
          .eq("status", "disponivel")
          .gte("inicio", agora.toISOString())
          .order("inicio", { ascending: true })
          .limit(1)
          .maybeSingle();

        const proximoIso = slot?.inicio ?? null;
        const dispAgora = !!proximoIso && new Date(proximoIso) <= limiteAgora;
        cards.push({
          medico_id: m.id,
          nome: (m as any).nome,
          especialidade: (m as any).especialidade ?? null,
          disponivel_agora: dispAgora,
          proximo_slot_iso: proximoIso,
        });
      }
      // ordena: disponíveis agora primeiro, depois por slot mais próximo
      cards.sort((a, b) => {
        if (a.disponivel_agora !== b.disponivel_agora) return a.disponivel_agora ? -1 : 1;
        if (!a.proximo_slot_iso) return 1;
        if (!b.proximo_slot_iso) return -1;
        return a.proximo_slot_iso.localeCompare(b.proximo_slot_iso);
      });
      setMedicos(cards);
    } catch (e: any) {
      toast.error("Erro ao carregar atendimento imediato");
    } finally {
      setLoading(false);
    }
  }

  async function iniciarAtendimento() {
    if (!servico) return;
    setIniciando(true);
    try {
      // Pega o melhor disponível usando ranking interno (sem mostrar ao paciente)
      const { data, error } = await supabase.rpc("fn_ranking_medico_servico" as any, {
        _servico_id: servico.id,
        _modalidade: "online",
        _limit: 1,
      });
      if (error) throw error;
      const top: any = Array.isArray(data) ? data[0] : data;
      if (!top?.medico_id) {
        toast.error("Nenhum médico disponível agora. Tente novamente em instantes.");
        return;
      }
      // Vai pro fluxo de agendamento direto com o slot do médico escolhido
      const { data: slot } = await supabase
        .from("agenda_slots")
        .select("id")
        .eq("medico_id", top.medico_id)
        .eq("status", "disponivel")
        .gte("inicio", new Date().toISOString())
        .order("inicio", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!slot) {
        toast.error("Sem horário livre — tente novamente.");
        return;
      }
      window.location.href = `/app/paciente/agendar/confirmar/${slot.id}?servico=${servico.id}`;
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao iniciar atendimento");
    } finally {
      setIniciando(false);
    }
  }

  if (loading) {
    return (
      <PageShell title="Atendimento imediato">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageShell>
    );
  }

  if (!servico) {
    return (
      <PageShell title="Atendimento imediato" subtitle="No momento não há porta de atendimento imediato ativa.">
        <div className="card-elevated p-10 text-center">
          <p className="text-muted-foreground">Volte em instantes ou agende uma consulta normal.</p>
          <Button asChild className="mt-4">
            <Link to="/agendar">Agendar consulta</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const disponiveisAgora = medicos.filter((m) => m.disponivel_agora).length;

  return (
    <PageShell
      title={servico.nome}
      subtitle={servico.descricao_publica ?? "Conecte-se com o primeiro médico disponível."}
    >
      <div className="space-y-8">
        {/* HERO de chamada */}
        <div className="card-elevated overflow-hidden">
          <div className="gradient-soft p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <Badge className="mb-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  <Activity className="h-3 w-3 mr-1" /> Pronto Atendimento
                </Badge>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-extrabold">{brl(servico.valor_paciente_centavos)}</span>
                  <span className="text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 inline mr-1" /> {servico.duracao_min} min
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {disponiveisAgora > 0
                    ? `${disponiveisAgora} médico${disponiveisAgora > 1 ? "s" : ""} disponível${disponiveisAgora > 1 ? "is" : ""} agora`
                    : medicos.length === 0
                      ? "Nenhum médico vinculado a este serviço"
                      : "Nenhum disponível agora — veja o próximo horário abaixo"}
                </p>
              </div>
              <Button
                size="lg"
                disabled={iniciando || medicos.length === 0}
                onClick={iniciarAtendimento}
                className="bg-gradient-primary hover:opacity-90"
              >
                {iniciando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                Iniciar atendimento
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Você não escolhe o médico. O sistema conecta você ao primeiro disponível para agilizar o atendimento.
            </p>
          </div>
        </div>

        {/* Lista de médicos vinculados (visualização, sem botão de escolha) */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Médicos no plantão</h2>
          {medicos.length === 0 ? (
            <div className="card-elevated p-8 text-center text-muted-foreground">
              Nenhum médico está atendendo este serviço no momento.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {medicos.map((m) => (
                <div key={m.medico_id} className="card-elevated p-4 flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-primary text-primary-foreground font-bold">
                    {m.nome.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">Dr(a). {m.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      <Stethoscope className="h-3 w-3 inline mr-1" />
                      {m.especialidade ?? "Clínica"}
                    </p>
                  </div>
                  {m.disponivel_agora ? (
                    <Badge className="bg-emerald-100 text-emerald-700">Disponível</Badge>
                  ) : m.proximo_slot_iso ? (
                    <span className="text-xs text-muted-foreground">
                      Próx: {new Date(m.proximo_slot_iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sem horário</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
