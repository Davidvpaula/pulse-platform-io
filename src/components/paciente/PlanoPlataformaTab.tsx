import { Link } from "react-router-dom";
import { ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import PlanoCard from "./PlanoCard";
import { PlanosDisponiveisSection } from "./plano-helpers";

interface Props {
  assinaturas: any[];
  beneficiosMap: Record<string, any[]>;
  planosDisponiveis: any[];
  onReload: () => void;
}

export default function PlanoPlataformaTab({ assinaturas, beneficiosMap, planosDisponiveis, onReload }: Props) {
  const planoIds = assinaturas.map(a => a.plano_id);

  if (assinaturas.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-10 text-center">
          <ShieldCheck className="mb-4 h-14 w-14 text-muted-foreground/40" />
          <h2 className="text-lg font-semibold">Nenhum plano da plataforma ativo</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Conheça nossos planos de saúde com cobertura e benefícios exclusivos.
          </p>
          <Button className="mt-5" asChild>
            <Link to="/planos">Ver planos disponíveis</Link>
          </Button>
        </div>

        {planosDisponiveis.length > 0 && (
          <PlanosDisponiveisSection
            planos={planosDisponiveis}
            planoAtualIds={planoIds}
            onSelecionar={() => {}}
          />
        )}
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

      {planosDisponiveis.length > 0 && (
        <PlanosDisponiveisSection
          planos={planosDisponiveis}
          planoAtualIds={planoIds}
          onSelecionar={() => {}}
        />
      )}
    </div>
  );
}
