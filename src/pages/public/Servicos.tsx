import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Clock, ArrowRight, Activity } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

type Servico = {
  id: string;
  slug: string | null;
  nome: string;
  tipo: string;
  descricao_publica: string | null;
  duracao_min: number;
  valor_paciente_centavos: number;
  prioridade: number;
};

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Servicos() {
  const [loading, setLoading] = useState(true);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [paServicoId, setPaServicoId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data }, { data: paCfg }] = await Promise.all([
        (supabase as any)
          .from("servicos_publicos")
          .select("id,slug,nome,tipo,descricao_publica,duracao_min,valor_paciente_centavos,prioridade")
          .order("prioridade")
          .order("nome"),
        supabase
          .from("app_settings")
          .select("value")
          .eq("key", "atendimento_imediato.servico_id")
          .maybeSingle(),
      ]);
      setServicos((data ?? []) as Servico[]);
      setPaServicoId((paCfg?.value as string | null) ?? null);
      setLoading(false);
    })();
  }, []);

  function linkParaServico(s: Servico) {
    // PA service goes to the dedicated page
    if (paServicoId && s.id === paServicoId) return "/atendimento-imediato";
    return s.slug ? `/servicos/${s.slug}` : "#";
  }

  return (
    <PageShell title="Serviços" subtitle="Conheça os serviços disponíveis na plataforma.">
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : servicos.length === 0 ? (
        <div className="card-elevated p-10 text-center text-muted-foreground">
          Nenhum serviço disponível no momento.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {servicos.map((s) => {
            const isPA = paServicoId === s.id;
            return (
              <Link
                key={s.id}
                to={linkParaServico(s)}
                className="card-elevated p-5 hover:shadow-elegant transition group"
              >
                <div className="flex items-center gap-2 mb-3">
                  {isPA ? (
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      <Activity className="mr-1 h-3 w-3" /> Atendimento Imediato
                    </Badge>
                  ) : (
                    <Badge variant="outline">{s.tipo}</Badge>
                  )}
                </div>
                <h3 className="font-display text-lg font-semibold">{s.nome}</h3>
                {s.descricao_publica && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{s.descricao_publica}</p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">A partir de</p>
                    <p className="font-bold">{brl(s.valor_paciente_centavos)}</p>
                  </div>
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {s.duracao_min} min
                  </span>
                </div>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline">
                  {isPA ? "Acessar calendário" : "Ver detalhes"} <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
