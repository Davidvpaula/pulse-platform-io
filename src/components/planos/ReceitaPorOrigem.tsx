import { useEffect, useState } from "react";
import { Loader2, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const LABELS: Record<string, string> = {
  consulta: "Consultas",
  servico: "Serviços da plataforma",
  plano_admin: "Planos da plataforma",
  plano_medico: "Planos de médicos",
  plano_paciente: "Planos personalizados",
};

interface Props {
  periodo: string;
  /** When provided, filters by medico_id for MedicoFinanceiro */
  medicoId?: string;
}

export function ReceitaPorOrigem({ periodo, medicoId }: Props) {
  const [data, setData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // NOTE: coluna `origem_receita` não existe em `consultas_financeiro`.
    // Componente desabilitado até que o schema seja atualizado com a coluna correta.
    // Dados futuros devem vir de `receitas_assinatura.origem` ou nova coluna em consultas_financeiro.
    setData({});
    setLoading(false);
  }, [periodo, medicoId]);

  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  if (loading) {
    return (
      <div className="card-elevated p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando receita por origem…
      </div>
    );
  }

  if (entries.length === 0) return null;

  return (
    <div className="card-elevated p-6">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="h-4 w-4 text-primary" />
        <h3 className="font-display text-lg font-semibold">Receita por origem</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {entries.map(([key, val]) => (
          <div key={key} className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">{LABELS[key] ?? key}</p>
            <p className="mt-1 text-xl font-semibold">{brl(val)}</p>
            <p className="text-xs text-muted-foreground">
              {total > 0 ? `${((val / total) * 100).toFixed(1)}%` : "0%"} do total
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
