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
    let active = true;
    setLoading(true);

    (async () => {
      // Build date filter
      const now = new Date();
      let cutoff: string | null = null;
      if (periodo === "hoje") cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      else if (periodo === "semana") { const d = new Date(); d.setDate(d.getDate() - 7); cutoff = d.toISOString(); }
      else if (periodo === "mes" || periodo === "30d") { const d = new Date(); d.setDate(d.getDate() - 30); cutoff = d.toISOString(); }
      else if (periodo === "90d") { const d = new Date(); d.setDate(d.getDate() - 90); cutoff = d.toISOString(); }
      else if (periodo === "ano") cutoff = new Date(now.getFullYear(), 0, 1).toISOString();

      // Query consultas_financeiro grouped by origem_receita
      let q = supabase
        .from("consultas_financeiro")
        .select("origem_receita,valor_bruto_centavos");

      if (cutoff) q = q.gte("data_consulta", cutoff);
      if (medicoId) q = q.eq("medico_id", medicoId);

      const { data: rows } = await q;
      if (!active) return;

      const grouped: Record<string, number> = {};
      for (const r of (rows ?? []) as any[]) {
        const key = r.origem_receita ?? "consulta";
        grouped[key] = (grouped[key] ?? 0) + (r.valor_bruto_centavos ?? 0);
      }
      setData(grouped);
      setLoading(false);
    })();

    return () => { active = false; };
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
