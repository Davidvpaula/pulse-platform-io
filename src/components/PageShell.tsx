import { ReactNode } from "react";

export default function PageShell({
  title,
  subtitle,
  children,
}: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <section className="container py-16 md:py-20">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Lasmar Telemed</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="mt-12">{children}</div>
    </section>
  );
}
