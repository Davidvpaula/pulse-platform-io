import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import * as Lucide from "lucide-react";
import { Clock, Activity } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { useServicosPublicos, type ServicoPublico } from "@/hooks/useServicosPublicos";
import prontoAtendimentoImg from "@/assets/home/pronto-atendimento.jpg";

const TARGET_SLUGS = [
  "atendimento-imediato",
  "saude-mental-acolhimento",
  "pediatria-online",
] as const;

const brl = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function getIcon(name: string | null) {
  if (!name) return Activity;
  const Lib = Lucide as unknown as Record<string, React.ComponentType<any>>;
  return Lib[name] ?? Activity;
}

export default function HeroServicoCarousel() {
  const { servicos, paServicoId, loading } = useServicosPublicos();
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);

  const slides = useMemo(() => {
    if (!servicos.length) return [];
    return TARGET_SLUGS
      .map((slug) => servicos.find((s) => s.slug === slug))
      .filter(Boolean) as ServicoPublico[];
  }, [servicos]);

  useEffect(() => {
    if (!api) return;
    const onSel = () => setSelected(api.selectedScrollSnap());
    onSel();
    api.on("select", onSel);
    api.on("reInit", onSel);
    return () => {
      api.off("select", onSel);
    };
  }, [api]);

  // Skeleton enquanto carrega — mantém dimensão
  if (loading || slides.length === 0) {
    return (
      <div className="relative z-10 flex min-w-0 items-end md:justify-end">
        <CardShell>
          <div className="aspect-[4/3] w-full animate-pulse bg-muted" />
          <div className="space-y-3 p-5">
            <div className="h-5 w-24 animate-pulse rounded bg-muted" />
            <div className="h-7 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="flex items-end justify-between pt-3">
              <div className="h-10 w-28 animate-pulse rounded bg-muted" />
              <div className="h-10 w-32 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </CardShell>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex min-w-0 items-end md:justify-end">
      <CardShell>
        <Carousel
          setApi={setApi}
          opts={{ align: "start", loop: true, containScroll: "trimSnaps" }}
          className="relative"
        >
          <CarouselContent>
            {slides.map((s, i) => (
              <CarouselItem key={s.id} className="basis-full">
                <Slide servico={s} priority={i === 0} isPA={paServicoId === s.id} />
              </CarouselItem>
            ))}
          </CarouselContent>

          {/* Setas internas — sobre a base da imagem */}
          {slides.length > 1 && (
            <>
              <CarouselPrevious
                className="absolute left-3 top-[calc(75%/2)] -translate-y-1/2 h-9 w-9 border-0 bg-white/90 text-foreground shadow-md hover:bg-white"
                aria-label="Serviço anterior"
              />
              <CarouselNext
                className="absolute right-3 top-[calc(75%/2)] -translate-y-1/2 h-9 w-9 border-0 bg-white/90 text-foreground shadow-md hover:bg-white"
                aria-label="Próximo serviço"
              />
            </>
          )}
        </Carousel>

        {/* Dots internos — rodapé do card */}
        {slides.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 pb-4">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => api?.scrollTo(i)}
                aria-label={`Ir para serviço ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === selected
                    ? "w-6 bg-primary"
                    : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>
        )}
      </CardShell>
    </div>
  );
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md min-w-0 overflow-hidden rounded-[22px] bg-white shadow-elegant ring-1 ring-black/5 sm:rounded-3xl">
      {children}
    </div>
  );
}

function Slide({
  servico,
  priority,
  isPA,
}: {
  servico: ServicoPublico;
  priority: boolean;
  isPA: boolean;
}) {
  const Icon = getIcon(servico.icone);
  const href = isPA ? "/atendimento-imediato" : `/servicos/${servico.slug}`;
  const ctaLabel = isPA ? "Agende agora" : "Ver detalhes";
  const imgSrc = servico.imagem_url ?? (isPA ? prontoAtendimentoImg : null);

  return (
    <div>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={servico.nome}
            className="h-full w-full object-cover"
            loading={priority ? "eager" : "lazy"}
            // @ts-expect-error fetchpriority is valid HTML attribute
            fetchpriority={priority ? "high" : undefined}
            decoding="async"
            width={800}
            height={600}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
            <Icon className="h-16 w-16 text-primary/60" strokeWidth={1.4} />
          </div>
        )}
      </div>

      <div className="flex min-h-[184px] flex-col p-4 sm:min-h-[210px] sm:p-5">
        <div className="flex items-center gap-2">
          {isPA ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-600">
              <Activity className="h-3 w-3" /> Disponível agora
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
              <Clock className="h-3 w-3" /> {servico.duracao_min} min
            </span>
          )}
        </div>
        <h3 className="mt-2 line-clamp-2 font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {servico.nome}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {servico.subtitulo ??
            servico.descricao_publica ??
            "Cuidado clínico humanizado, no seu tempo."}
        </p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-4 sm:gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              A partir de
            </p>
            <p className="font-display text-2xl font-extrabold leading-none text-primary tabular-nums sm:text-3xl">
              {brl(servico.valor_paciente_centavos)}
            </p>
          </div>
          <Button
            asChild
            className="shrink-0 rounded-[10px] bg-primary px-3 font-semibold text-primary-foreground hover:bg-primary/90 sm:px-4"
          >
            <Link to={href}>{ctaLabel}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
