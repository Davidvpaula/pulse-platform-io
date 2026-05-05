import { Building2 } from "lucide-react";
import PlanoCard from "./PlanoCard";

interface Props {
  assinaturas: any[];
  beneficiosMap: Record<string, any[]>;
  onReload: () => void;
}

export default function PlanoEmpresaTab({ assinaturas, beneficiosMap, onReload }: Props) {
  if (assinaturas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-10 text-center">
        <Building2 className="mb-4 h-14 w-14 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold">Planos empresariais</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Em breve você poderá acessar planos corporativos vinculados à sua empresa.
        </p>
        <span className="mt-4 inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          Em breve
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {assinaturas.map((ass) => (
        <PlanoCard
          key={ass.id}
          assinatura={ass}
          plano={ass.planos}
          beneficios={beneficiosMap[ass.plano_id] || []}
          onCancelado={onReload}
        />
      ))}
    </div>
  );
}
