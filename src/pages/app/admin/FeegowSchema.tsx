import { PageHeader } from "@/components/PageHeader";
import { feegowSchema } from "@/lib/feegow";
import { Database, KeyRound, Link2 } from "lucide-react";

export default function FeegowSchema() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Schema lógico · Feegow"
        description="Tabelas internas e campos preparados para armazenar IDs externos e estado de sincronização."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {feegowSchema.map(t => (
          <div key={t.nome} className="card-elevated overflow-hidden">
            <div className="border-b border-border bg-muted/30 p-4">
              <p className="flex items-center gap-2 font-mono text-sm font-semibold">
                <Database className="h-4 w-4 text-primary" /> {t.nome}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t.descricao}</p>
            </div>
            <div className="divide-y divide-border">
              {t.campos.map(c => (
                <div key={c.nome} className="grid grid-cols-[1fr_auto] items-center gap-2 px-4 py-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-mono truncate flex items-center gap-1">
                      {c.nome === "id" && <KeyRound className="h-3 w-3 text-primary" />}
                      {c.tipo === "fk" && <Link2 className="h-3 w-3 text-info" />}
                      {c.nome}
                      {c.obrigatorio && <span className="text-destructive">*</span>}
                    </p>
                    {c.descricao && (
                      <p className="text-muted-foreground truncate">{c.descricao}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {c.feegow && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">feegow</span>
                    )}
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                      {c.tipo}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
