import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Clock, ArrowRight } from "lucide-react";
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

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("servicos_publicos")
        .select("id,slug,nome,tipo,descricao_publica,duracao_min,valor_paciente_centavos,prioridade")
        .neq("tipo", "pronto_atendimento")
        .order("prioridade")
        .order("nome");
      setServicos((data ?? []) as Servico[]);
      setLoading(false);
    })();
  }, []);

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
          {servicos.map((s) => (
            <Link
              key={s.id}
              to={s.slug ? `/servicos/${s.slug}` : "#"}
              className="card-elevated p-5 hover:shadow-elegant transition group"
            >
              <Badge variant="outline" className="mb-3">{s.tipo}</Badge>
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
                Ver detalhes <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
