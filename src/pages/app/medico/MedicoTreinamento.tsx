import { useEffect, useState } from "react";
import { Play, CheckCircle2, BookOpen, Clock, ExternalLink, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  listModulosComAulas, listMinhasConclusoes,
  marcarAulaConcluida, desmarcarAulaConcluida,
  youtubeEmbedUrl, youtubeThumbnail,
  type ModuloComAulas,
} from "@/lib/treinamentos";

export default function MedicoTreinamento() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [modulos, setModulos] = useState<ModuloComAulas[]>([]);
  const [concluidas, setConcluidas] = useState<Set<string>>(new Set());
  const [playing, setPlaying] = useState<{ url: string; titulo: string } | null>(null);

  async function carregar() {
    setLoading(true);
    const [m, c] = await Promise.all([listModulosComAulas(), listMinhasConclusoes()]);
    setModulos(m);
    setConcluidas(c);
    setLoading(false);
  }

  useEffect(() => { void carregar(); }, []);

  async function toggle(id: string) {
    const has = concluidas.has(id);
    // Otimista
    setConcluidas(prev => {
      const next = new Set(prev);
      if (has) next.delete(id); else next.add(id);
      return next;
    });
    const ok = has ? await desmarcarAulaConcluida(id) : await marcarAulaConcluida(id);
    if (!ok) {
      toast({ title: "Não foi possível salvar", variant: "destructive" });
      void carregar();
    }
  }

  const totalAulas = modulos.reduce((s, m) => s + m.aulas.length, 0);
  const progresso = totalAulas ? Math.round((concluidas.size / totalAulas) * 100) : 0;

  // Mandatory training check
  const obrigatorios = modulos.filter(m => m.obrigatorio);
  const aulasObrigatorias = obrigatorios.flatMap(m => m.aulas);
  const obrigFaltando = aulasObrigatorias.filter(a => !concluidas.has(a.id)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Treinamento"
        description="Vídeos, aulas e boas práticas para uso da plataforma."
      />

      {/* Aviso de treinamento obrigatório pendente */}
      {obrigFaltando > 0 && (
        <div className="card-elevated border-l-4 border-l-destructive p-4 flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-destructive shrink-0" />
          <div>
            <p className="font-semibold text-sm">Você precisa concluir o treinamento para aparecer para pacientes</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {obrigFaltando} aula{obrigFaltando > 1 ? "s" : ""} obrigatória{obrigFaltando > 1 ? "s" : ""} pendente{obrigFaltando > 1 ? "s" : ""}. Assista e confirme cada uma.
            </p>
          </div>
        </div>
      )}

      {/* Progresso geral */}
      <div className="card-elevated p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">Seu progresso</p>
              <p className="text-xs text-muted-foreground">
                {concluidas.size} de {totalAulas} aulas concluídas
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-bold">{progresso}%</p>
            <p className="text-[11px] text-muted-foreground">trilha completa</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-gradient-primary transition-all" style={{ width: `${progresso}%` }} />
        </div>
      </div>

      {loading ? (
        <div className="card-elevated flex items-center justify-center p-12 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando treinamento…
        </div>
      ) : modulos.length === 0 ? (
        <div className="card-elevated flex flex-col items-center gap-2 p-12 text-center text-muted-foreground">
          <AlertCircle className="h-8 w-8 opacity-40" />
          <p className="text-sm">Nenhum módulo de treinamento disponível ainda.</p>
          <p className="text-xs">O administrador adicionará conteúdo em breve.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {modulos.map(m => {
            const aulasDoModulo = m.aulas.length;
            const feitas = m.aulas.filter(a => concluidas.has(a.id)).length;
            return (
              <div key={m.id} className="card-elevated overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg font-semibold">{m.titulo}</h3>
                      {m.obrigatorio && (
                        <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">
                          <ShieldCheck className="mr-1 h-3 w-3" /> Obrigatório
                        </Badge>
                      )}
                    </div>
                    {m.descricao && <p className="text-sm text-muted-foreground">{m.descricao}</p>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {feitas} / {aulasDoModulo} concluídas
                  </div>
                </div>
                {aulasDoModulo === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">Nenhuma aula neste módulo.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {m.aulas.map(a => {
                      const done = concluidas.has(a.id);
                      const thumb = youtubeThumbnail(a.video_url);
                      return (
                        <div key={a.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 p-4">
                          <button
                            onClick={() => setPlaying({ url: a.video_url, titulo: a.titulo })}
                            className={cn(
                              "relative grid h-12 w-20 place-items-center overflow-hidden rounded-lg bg-muted",
                              "hover:opacity-90 transition",
                            )}
                            aria-label={`Assistir ${a.titulo}`}
                          >
                            {thumb ? (
                              <img src={thumb} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Play className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="absolute inset-0 grid place-items-center bg-black/30">
                              <Play className="h-4 w-4 text-white" fill="white" />
                            </span>
                          </button>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{a.titulo}</p>
                            {a.descricao && (
                              <p className="truncate text-xs text-muted-foreground">{a.descricao}</p>
                            )}
                          </div>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" /> {a.duracao_min ? `${a.duracao_min} min` : "—"}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              size="sm" variant="outline"
                              onClick={() => setPlaying({ url: a.video_url, titulo: a.titulo })}
                            >
                              Assistir
                            </Button>
                            <Button
                              size="sm"
                              variant={done ? "ghost" : "default"}
                              className={done ? "" : "bg-gradient-primary hover:opacity-90"}
                              onClick={() => toggle(a.id)}
                            >
                              {done ? (
                                <><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Concluída</>
                              ) : "Marcar concluída"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Conteúdo gerenciado pelo Admin — novos módulos aparecem automaticamente.
      </p>

      {/* Player */}
      <Dialog open={!!playing} onOpenChange={(o) => !o && setPlaying(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{playing?.titulo}</DialogTitle>
          </DialogHeader>
          {playing && (() => {
            const embed = youtubeEmbedUrl(playing.url);
            if (embed) {
              return (
                <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
                  <iframe
                    src={embed}
                    title={playing.titulo}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              );
            }
            return (
              <div className="space-y-3 p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Não foi possível incorporar este vídeo. Abra em uma nova aba:
                </p>
                <Button asChild>
                  <a href={playing.url} target="_blank" rel="noreferrer">
                    Abrir vídeo <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
