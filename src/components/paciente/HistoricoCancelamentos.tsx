import { useEffect, useState } from "react";
import { Clock, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { formatDataBR } from "@/lib/clinico";

type ReembolsoStatus = "solicitado" | "em_analise" | "aprovado" | "recusado" | "concluido";

interface ReembolsoItem {
  id: string;
  status: ReembolsoStatus;
  valor_centavos: number;
  motivo: string;
  created_at: string;
  decidido_em: string | null;
  medico_nome: string;
  consulta_data: string;
}

const statusConfig: Record<ReembolsoStatus, { label: string; icon: React.ElementType; cls: string }> = {
  solicitado:  { label: "Solicitado",   icon: Clock,          cls: "text-yellow-600 bg-yellow-50" },
  em_analise:  { label: "Em análise",   icon: Loader2,        cls: "text-blue-600 bg-blue-50" },
  aprovado:    { label: "Aprovado",     icon: CheckCircle2,   cls: "text-green-600 bg-green-50" },
  concluido:   { label: "Concluído",    icon: CheckCircle2,   cls: "text-green-700 bg-green-100" },
  recusado:    { label: "Recusado",     icon: XCircle,        cls: "text-destructive bg-red-50" },
};

export default function HistoricoCancelamentos() {
  const [items, setItems] = useState<ReembolsoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("reembolsos")
          .select("id, status, valor_centavos, motivo, created_at, decidido_em, consultas!inner(inicio, medicos!inner(nome))")
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) {
          console.error("[HistoricoCancelamentos]", error);
          setItems([]);
          return;
        }

        const mapped: ReembolsoItem[] = (data ?? []).map((r: any) => ({
          id: r.id,
          status: r.status as ReembolsoStatus,
          valor_centavos: r.valor_centavos,
          motivo: r.motivo,
          created_at: r.created_at,
          decidido_em: r.decidido_em,
          medico_nome: r.consultas?.medicos?.nome ?? "Médico",
          consulta_data: r.consultas?.inicio ?? r.created_at,
        }));
        setItems(mapped);
      } catch (e) {
        console.error("[HistoricoCancelamentos]", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="card-elevated p-6">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" /> Cancelamentos e Reembolsos
        </h3>
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="card-elevated p-6">
      <h3 className="font-display text-lg font-semibold flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-warning" /> Cancelamentos e Reembolsos
      </h3>

      <div className="mt-4 divide-y divide-border">
        {items.map((item) => {
          const cfg = statusConfig[item.status];
          const Icon = cfg.icon;
          return (
            <div key={item.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${cfg.cls}`}>
                <Icon className={`h-4 w-4 ${item.status === "em_analise" ? "animate-spin" : ""}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-sm">{item.medico_nome}</p>
                <p className="text-xs text-muted-foreground truncate">
                  Consulta de {formatDataBR(item.consulta_data)} · {item.motivo}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm">{brl(item.valor_centavos)}</p>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.cls}`}>
                  {cfg.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
