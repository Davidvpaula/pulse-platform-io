import { useState, type ReactNode } from "react";
import * as Lucide from "lucide-react";
import { Activity, Clock, ArrowDown, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  nome: string;
  subtitulo?: string | null;
  descricao?: string | null;
  imagemUrl?: string | null;
  icone?: string | null;
  tipo?: string | null;
  valorCentavos: number;
  duracaoMin: number;
  footerNota?: ReactNode;
}

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function getIcon(name?: string | null) {
  if (!name) return Activity;
  const Lib = Lucide as unknown as Record<string, React.ComponentType<any>>;
  return Lib[name] ?? Activity;
}

export function ServicoHeroSkeleton() {
  return (
    <div className="card-elevated overflow-hidden">
      <div className="grid gap-6 p-6 md:grid-cols-12 md:p-8">
        <div className="md:col-span-5">
          <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
        </div>
        <div className="space-y-4 md:col-span-7">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-11/12" />
            <Skeleton className="h-3 w-10/12" />
          </div>
          <div className="flex gap-3 pt-3">
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ServicoHero({
  nome,
  subtitulo,
  descricao,
  imagemUrl,
  icone,
  tipo,
  valorCentavos,
  duracaoMin,
  footerNota,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const Icon = getIcon(icone);
  const descLong = (descricao?.length ?? 0) > 280;

  return (
    <section className="card-elevated overflow-hidden">
      <div className="gradient-soft grid gap-6 p-6 md:grid-cols-12 md:p-8">
        {/* Imagem */}
        <div className="md:col-span-5">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl ring-1 ring-black/5 bg-muted">
            {imagemUrl ? (
              <img
                src={imagemUrl}
                alt={nome}
                className="h-full w-full object-cover"
                fetchPriority="high"
                decoding="async"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
                <Icon className="h-16 w-16 text-primary/60" strokeWidth={1.4} />
              </div>
            )}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex flex-col gap-4 md:col-span-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Nova Saúde
            </span>
            {tipo && (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                {tipo.replace(/_/g, " ")}
              </Badge>
            )}
          </div>

          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight md:text-4xl">
            {nome}
          </h1>

          {subtitulo && (
            <p className="text-lg text-muted-foreground line-clamp-2">{subtitulo}</p>
          )}

          {descricao && (
            <div className="max-w-prose">
              <p
                className={`text-sm leading-relaxed text-muted-foreground ${
                  !expanded && descLong ? "line-clamp-6" : ""
                }`}
              >
                {descricao}
              </p>
              {descLong && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-1 text-xs font-semibold text-primary hover:underline"
                >
                  {expanded ? "Ler menos" : "Ler mais"}
                </button>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                A partir de
              </span>
              <span className="font-display text-xl font-extrabold tabular-nums text-primary">
                {brl(valorCentavos)}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" /> {duracaoMin} min
            </span>
          </div>

          <div className="pt-2">
            <Button asChild className="rounded-[10px]">
              <a href="#calendario">
                Ver horários <ArrowDown className="ml-1.5 h-4 w-4" />
              </a>
            </Button>
          </div>

          {footerNota && (
            <div className="mt-2 flex items-start gap-2 border-t border-border/60 pt-4 text-xs text-muted-foreground">
              <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
              <span>{footerNota}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
