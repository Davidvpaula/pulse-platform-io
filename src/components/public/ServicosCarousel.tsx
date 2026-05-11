import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as Lucide from "lucide-react";
import { Clock, ArrowRight, Activity, Sparkles } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useServicosPublicos, type ServicoPublico } from "@/hooks/useServicosPublicos";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function getIcon(name: string | null) {
  if (!name) return Activity;
  const Lib = Lucide as unknown as Record<string, React.ComponentType<any>>;
  return Lib[name] ?? Activity;
}

export default function ServicosCarousel() {
  const { servicos, paServicoId, loading } = useServicosPublicos({ destacarNaHomeOnly: true });
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [snaps, setSnaps] = useState<number[]>([]);

  useEffect(() => {
    if (!api) return;
    const onSel = () => setSelected(api.selectedScrollSnap());
    setSnaps(api.scrollSnapList());
    onSel();
    api.on("select", onSel);
    api.on("reInit", () => { setSnaps(api.scrollSnapList()); onSel(); });
    return () => { api.off("select", onSel); };
  }, [api]);

  return (
    <section className="bg-background">
      <div className="container px-4 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Nossos serviços
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
              Cuidado sob medida para cada momento
            </h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Conheça os serviços disponíveis e agende em poucos cliques.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-[10px]">
            <Link to="/servicos">Ver todos os serviços</Link>
          </Button>
        </div>

        <div className="mt-10">
          {loading ? (
            <CarouselSkeleton />
          ) : servicos.length === 0 ? (
            <div className="card-elevated p-10 text-center text-muted-foreground">
              Nenhum serviço disponível no momento.
            </div>
          ) : (
            <Carousel
              setApi={setApi}
              opts={{ align: "start", containScroll: "trimSnaps", dragFree: false }}
              className="relative"
            >
              <CarouselContent className="-ml-4">
                {servicos.map((s, i) => (
                  <CarouselItem key={s.id} className="pl-4 basis-full md:basis-1/2 lg:basis-1/3">
                    <ServicoCard servico={s} priority={i === 0} isPA={paServicoId === s.id} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex -left-4" />
              <CarouselNext className="hidden md:flex -right-4" />

              {snaps.length > 1 && (
                <div className="mt-6 flex items-center justify-center gap-1.5">
                  {snaps.map((_, i) => (
                    <button
                      key={i}
                      aria-label={`Ir para slide ${i + 1}`}
                      onClick={() => api?.scrollTo(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        i === selected ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                      }`}
                    />
                  ))}
                </div>
              )}
            </Carousel>
          )}
        </div>
      </div>
    </section>
  );
}

function ServicoCard({
  servico,
  priority,
  isPA,
}: {
  servico: ServicoPublico;
  priority: boolean;
  isPA: boolean;
}) {
  const href = isPA
    ? "/atendimento-imediato"
    : servico.slug
      ? `/servicos/${servico.slug}`
      : "#";
  const Icon = getIcon(servico.icone);

  return (
    <Link
      to={href}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:-translate-y-0.5 hover:shadow-elegant"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {servico.imagem_url ? (
          <img
            src={servico.imagem_url}
            alt={servico.nome}
            loading={priority ? "eager" : "lazy"}
            // @ts-expect-error fetchpriority is valid HTML attribute
            fetchpriority={priority ? "high" : undefined}
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
            <Icon className="h-14 w-14 text-primary/60" strokeWidth={1.4} />
          </div>
        )}
        {isPA && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/95 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-sm">
            <Activity className="h-3 w-3" /> Disponível agora
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="font-display text-lg font-semibold leading-snug tracking-tight line-clamp-2 min-h-[3.25rem]">
            {servico.nome}
          </h3>
          {servico.subtitulo && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{servico.subtitulo}</p>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              A partir de
            </p>
            <p className="font-display text-xl font-extrabold leading-none text-primary tabular-nums">
              {brl(servico.valor_paciente_centavos)}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" /> {servico.duracao_min} min
          </span>
        </div>

        <div className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline">
          {isPA ? "Acessar atendimento" : "Ver detalhes"} <ArrowRight className="h-3 w-3" />
        </div>
      </div>
    </Link>
  );
}

function CarouselSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
          <Skeleton className="aspect-[16/10] w-full rounded-none" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
            <div className="flex justify-between pt-3">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
