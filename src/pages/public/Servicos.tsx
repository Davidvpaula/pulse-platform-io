import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as Lucide from "lucide-react";
import { Loader2, Clock, ArrowRight, Activity, Volume2, Wifi, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const boasPraticas = [
  {
    icon: Volume2,
    title: "Ambiente Tranquilo",
    desc: "Escolha um local silencioso e privado para assegurar uma comunicação clara e sem distrações. Garanta uma boa iluminação para o médico te ver claramente.",
  },
  {
    icon: Wifi,
    title: "Conexão Internet",
    desc: "Dê preferência à conexão via Wi-Fi, mas se não for possível, garanta um bom nível de sinal para sua conexão de dados móveis. Teste a conexão antes da chamada e feche apps em segundo plano que consomem internet para evitar travamentos.",
  },
  {
    icon: Video,
    title: "Dispositivo Adequado",
    desc: "Garanta que seu dispositivo (smartphone, tablet ou computador) esteja carregado, teste a câmera e o microfone. Se possível, posicione o dispositivo em superfície firme na altura dos olhos.",
  },
];

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
    if (paServicoId && s.id === paServicoId) return "/atendimento-imediato";
    return s.slug ? `/servicos/${s.slug}` : "#";
  }

  return (
    <div className="bg-gradient-deep text-deep-foreground">
      <section className="container relative py-16 md:py-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-dot-soft opacity-50" aria-hidden />
        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white ring-1 ring-white/20 backdrop-blur">
            Nova Saúde
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Serviços
          </h1>
          <p className="mt-4 text-lg text-white/85">
            Conheça os serviços disponíveis na plataforma — telemedicina ágil, com médicos verificados.
          </p>
        </div>

        {loading ? (
          <div className="mt-12 flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary-foreground" />
          </div>
        ) : servicos.length === 0 ? (
          <div className="mt-12 rounded-2xl bg-card p-10 text-center text-muted-foreground">
            Nenhum serviço disponível no momento.
          </div>
        ) : (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 md:grid-cols-3">
            {servicos.map((s) => {
              const isPA = paServicoId === s.id;
              const Icon = getIcon(s.icone);
              const subtitulo = s.subtitulo || s.descricao_publica;
              return (
                <Link
                  key={s.id}
                  to={linkParaServico(s)}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border/30 bg-card text-card-foreground shadow-card transition hover:-translate-y-0.5 hover:shadow-elegant"
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
                    <div className="mb-2 flex items-center gap-2">
                      {isPA ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                          <Activity className="mr-1 h-3 w-3" /> Atendimento Imediato
                        </Badge>
                      ) : (
                        <Badge variant="outline">{s.tipo}</Badge>
                      )}
                    </div>
                    <h3 className="font-display text-lg font-semibold line-clamp-2 min-h-[3.25rem]">
                      {s.nome}
                    </h3>
                    {subtitulo && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{subtitulo}</p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-4">
                      <div>
                        <p className="text-xs text-muted-foreground">A partir de</p>
                        <p className="font-bold tabular-nums">{brl(s.valor_paciente_centavos)}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
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

        {/* Boas Práticas para Teleconsultas */}
        <div className="mt-20">
          <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            Boas Práticas para Teleconsultas
          </h2>
          <p className="mt-3 text-sm text-primary-foreground/80 md:text-base">
            Tem alguma dúvida?{" "}
            <Link to="/faq" className="underline underline-offset-4 hover:text-primary-foreground">
              Acesse nossa página de ajuda
            </Link>
            !
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {boasPraticas.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-border/30 bg-card p-6 text-card-foreground shadow-card"
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-lg font-extrabold leading-tight tracking-tight">
                    {title}
                  </h3>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
