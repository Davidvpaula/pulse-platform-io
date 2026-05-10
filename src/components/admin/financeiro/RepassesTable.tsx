import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import { FinanceiroStatusBadge } from "./FinanceiroStatusBadge";

const brl = (v: number) => (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export interface RepasseRow {
  id: string;
  medico_id?: string;
  medico?: { nome?: string } | null;
  competencia_mes: number;
  competencia_ano: number;
  valor_bruto_centavos: number;
  valor_medico_centavos: number;
  status: string;
}

interface RepassesTableProps {
  repasses: RepasseRow[];
  onMarcarPago: (id: string) => void;
  onBloquear: (id: string) => void;
}

export function RepassesTable({ repasses, onMarcarPago, onBloquear }: RepassesTableProps) {
  return (
    <div className="rounded-lg border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="text-left p-2">Médico</th>
            <th className="text-left p-2">Competência</th>
            <th className="text-left p-2">Bruto</th>
            <th className="text-left p-2">Médico</th>
            <th className="text-left p-2">Status</th>
            <th className="text-right p-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {repasses.map(f => (
            <tr key={f.id} className="border-t">
              <td className="p-2">{f.medico?.nome || f.medico_id?.slice(0, 8)}</td>
              <td className="p-2">{String(f.competencia_mes).padStart(2, "0")}/{f.competencia_ano}</td>
              <td className="p-2">{brl(f.valor_bruto_centavos)}</td>
              <td className="p-2">{brl(f.valor_medico_centavos)}</td>
              <td className="p-2"><FinanceiroStatusBadge s={f.status} /></td>
              <td className="p-2 text-right space-x-1">
                {f.status === "em_aberto" && <>
                  <Button size="sm" variant="outline" onClick={() => onMarcarPago(f.id)}><CheckCircle2 className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" onClick={() => onBloquear(f.id)}><XCircle className="h-3 w-3" /></Button>
                </>}
              </td>
            </tr>
          ))}
          {!repasses.length && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Sem repasses</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
