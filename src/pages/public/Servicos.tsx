import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as Lucide from "lucide-react";
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
  subtitulo: string | null;
  imagem_url: string | null;
  icone: string | null;
  duracao_min: number;
  valor_paciente_centavos: number;
  prioridade: number;
};

function getIcon(name: string | null) {
  if (!name) return Activity;
  const Lib = Lucide as unknown as Record<string, React.ComponentType<any>>;
  return Lib[name] ?? Activity;
}

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
          .select("id,slug,nome,tipo,descricao_publica,subtitulo,imagem_url,icone,duracao_min,valor_paciente_centavos,prioridade")
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
            const Icon = getIcon(s.icone);
            const subtitulo = s.subtitulo || s.descricao_publica;
            return (
              <Link
                key={s.id}
                to={linkParaServico(s)}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:-translate-y-0.5 hover:shadow-elegant"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                  {s.imagem_url ? (
                    <img
                      src={s.imagem_url}
                      alt={s.nome}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
                      <Icon className="h-12 w-12 text-primary/60" strokeWidth={1.4} />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center gap-2 mb-2">
                    {isPA ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        <Activity className="mr-1 h-3 w-3" /> Atendimento Imediato
                      </Badge>
                    ) : (
                      <Badge variant="outline">{s.tipo}</Badge>
                    )}
                  </div>
                  <h3 className="font-display text-lg font-semibold line-clamp-2 min-h-[3.25rem]">{s.nome}</h3>
                  {subtitulo && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{subtitulo}</p>
                  )}
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">A partir de</p>
                      <p className="font-bold tabular-nums">{brl(s.valor_paciente_centavos)}</p>
                    </div>
                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {s.duracao_min} min
                    </span>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline">
                    {isPA ? "Acessar calendário" : "Ver detalhes"} <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

