import { ReactNode } from "react";
import { Sparkles } from "lucide-react";

export default function PageShell({
  title,
  subtitle,
  eyebrow = "Nova Saúde",
  children,
}: {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  children?: ReactNode;
}) {
  const hasHeader = !!title || !!subtitle;

  if (!hasHeader) {
    return <section className="container py-8 md:py-10">{children}</section>;
  }

  return (
    <>
      {/* ─── HERO BAND petrol/azul ─── */}
      <section className="relative overflow-hidden bg-gradient-deep text-deep-foreground">
        {/* textura sutil */}
        <div className="pointer-events-none absolute inset-0 bg-grid-soft opacity-40" aria-hidden />
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary-soft/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-primary/30 blur-3xl" aria-hidden />

        <div className="container relative z-10 max-w-3xl py-14 md:py-20">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white ring-1 ring-white/20 backdrop-blur">
            <Sparkles className="h-3 w-3" /> {eyebrow}
          </span>
          {title && (
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/85 md:text-lg">
              {subtitle}
            </p>
          )}
        </div>

        {/* divisor curvo p/ off-white */}
        <svg
          className="absolute bottom-[-1px] left-0 h-8 w-full text-background md:h-12"
          viewBox="0 0 1440 60"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path fill="currentColor" d="M0,60 L0,30 Q720,0 1440,30 L1440,60 Z" />
        </svg>
      </section>

      <section className="container py-12 md:py-16">{children}</section>
    </>
  );
}
