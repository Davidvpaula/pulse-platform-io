import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2, Clock, Stethoscope, ArrowRight } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Servico = {
  id: string;
  nome: string;
  descricao_publica: string | null;
  duracao_min: number;
  valor_paciente_centavos: number;
};

type MedicoItem = {
  medico_id: string;
  nome: string;
  especialidade: string | null;
  proximo_slot_id: string | null;
  proximo_slot_iso: string | null;
};

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ServicoDetalhe() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [servico, setServico] = useState<Servico | null>(null);
  const [medicos, setMedicos] = useState<MedicoItem[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: s } = await supabase
        .from("servicos_financeiros")
        .select("id,nome,descricao_publica,duracao_min,valor_paciente_centavos,ativo")
        .eq("slug", slug)
        .maybeSingle();
      if (!s || !s.ativo) {
        setLoading(false);
        return;
      }
      setServico(s as Servico);

      // Médicos com adesão ativa (com ranking via RPC se possível)
      let ids: string[] = [];
      try {
        const { data: rk } = await supabase.rpc("fn_ranking_medico_servico" as any, {
          _servico_id: s.id,
          _modalidade: "online",
          _limit: 50,
        });
        ids = (rk ?? []).map((r: any) => r.medico_id);
      } catch {
        const { data: vinc } = await supabase
          .from("medico_servicos")
          .select("medico_id")
          .eq("servico_id", s.id)
          .eq("status", "ativo")
          .eq("ativo", true);
        ids = (vinc ?? []).map((v: any) => v.medico_id);
      }
      if (ids.length === 0) {
        setMedicos([]);
        setLoading(false);
        return;
      }
      const { data: meds } = await supabase
        .from("medicos")
        .select("id,nome,especialidade_principal_nome")
        .in("id", ids);

      const cards: MedicoItem[] = [];
      for (const id of ids) {
        const m = (meds ?? []).find((x: any) => x.id === id);
        if (!m) continue;
        const { data: slot } = await supabase
          .from("agenda_slots")
          .select("id,inicio")
          .eq("medico_id", id)
          .eq("status", "disponivel")
          .gte("inicio", new Date().toISOString())
          .order("inicio", { ascending: true })
          .limit(1)
          .maybeSingle();
        cards.push({
          medico_id: id,
          nome: (m as any).nome,
          especialidade: (m as any).especialidade_principal_nome ?? null,
          proximo_slot_id: slot?.id ?? null,
          proximo_slot_iso: slot?.inicio ?? null,
        });
      }
      setMedicos(cards);
      setLoading(false);
    })();
  }, [slug]);

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
      subtitle={servico.descricao_publica ?? "Escolha um profissional para agendar."}
    >
      <div className="space-y-6">
        <div className="card-elevated p-6 flex flex-wrap items-center gap-6">
          <div>
            <p className="text-xs text-muted-foreground">Valor</p>
            <p className="text-2xl font-bold">{brl(servico.valor_paciente_centavos)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Duração</p>
            <p className="font-semibold inline-flex items-center gap-1">
              <Clock className="h-4 w-4" /> {servico.duracao_min} min
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Profissionais disponíveis</h2>
          {medicos.length === 0 ? (
            <div className="card-elevated p-8 text-center text-muted-foreground">
              Nenhum profissional vinculado a este serviço no momento.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {medicos.map((m) => (
                <div key={m.medico_id} className="card-elevated p-4 flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-primary text-primary-foreground font-bold">
                    {m.nome.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">Dr(a). {m.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      <Stethoscope className="h-3 w-3 inline mr-1" />
                      {m.especialidade ?? "Clínica"}
                    </p>
                    {m.proximo_slot_iso && (
                      <p className="text-xs text-emerald-600 mt-1">
                        Próximo: {new Date(m.proximo_slot_iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                  {m.proximo_slot_id ? (
                    <Button size="sm" asChild>
                      <Link to={`/app/paciente/agendar/confirmar/${m.proximo_slot_id}?servico=${servico.id}`}>
                        Agendar <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  ) : (
                    <Badge variant="outline">Sem horários</Badge>
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
