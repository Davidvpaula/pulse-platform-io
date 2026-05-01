import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/saques";
import { Loader2 } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  solicitado: { label: "Solicitado", cls: "border-warning/40 text-warning" },
  em_analise: { label: "Em análise", cls: "border-info/40 text-info" },
  correcao_solicitada: { label: "Correção solicitada", cls: "border-warning/40 text-warning" },
  aprovado: { label: "Aprovado", cls: "border-success/40 text-success" },
  pago: { label: "Pago", cls: "border-success/40 text-success" },
  recusado: { label: "Recusado", cls: "border-destructive/40 text-destructive" },
  cancelado: { label: "Cancelado", cls: "border-muted text-muted-foreground" },
};

export function SaqueHistorico({ medicoId }: { medicoId: string }) {
  const [saques, setSaques] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [medicoId]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("saques_medicos")
      .select("*")
      .eq("medico_id", medicoId)
      .order("solicitado_em", { ascending: false })
      .limit(50);
    setSaques(data ?? []);
    setLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-4 w-4 animate-spin" /></div>;
  if (!saques.length) return <p className="text-sm text-muted-foreground p-4 text-center">Nenhum saque solicitado.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-2 text-left">Data</th>
            <th className="px-4 py-2 text-right">Valor</th>
            <th className="px-4 py-2 text-left">Método</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-left">Obs</th>
          </tr>
        </thead>
        <tbody>
          {saques.map(s => {
            const st = STATUS_MAP[s.status] ?? { label: s.status, cls: "" };
            return (
              <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-4 py-2.5 text-muted-foreground">
                  {new Date(s.solicitado_em).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold">{brl(s.valor_centavos)}</td>
                <td className="px-4 py-2.5 uppercase text-xs">{s.metodo}</td>
                <td className="px-4 py-2.5">
                  <Badge variant="outline" className={st.cls}>{st.label}</Badge>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[200px]">
                  {s.status === "correcao_solicitada" && s.motivo_recusa && (
                    <span className="block text-warning font-medium mb-0.5">⚠ {s.motivo_recusa}</span>
                  )}
                  <span className="truncate block">{s.motivo_recusa && s.status !== "correcao_solicitada" ? s.motivo_recusa : (s.observacao ?? "—")}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
