import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link2 } from "lucide-react";
import { FinanceiroStatusBadge } from "./FinanceiroStatusBadge";

const brl = (v: number) => (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export interface LinkRow {
  id: string;
  descricao?: string;
  valor_centavos: number;
  vencimento?: string | null;
  status: string;
  created_at?: string;
  paciente?: { nome_completo?: string; nome?: string } | null;
}

interface CobrancasLinksTableProps {
  links: LinkRow[];
  lkBusca: string;
  setLkBusca: (v: string) => void;
  lkStatus: string;
  setLkStatus: (v: string) => void;
  lkPage: number;
  setLkPage: React.Dispatch<React.SetStateAction<number>>;
  onNovaCobranca: () => void;
}

export function CobrancasLinksTable({
  links, lkBusca, setLkBusca, lkStatus, setLkStatus, lkPage, setLkPage, onNovaCobranca,
}: CobrancasLinksTableProps) {
  const PAGE_SIZE = 20;
  const nomePaciente = (l: LinkRow) => l?.paciente?.nome_completo || l?.paciente?.nome || "";
  const matchBusca = (q: string, ...campos: string[]) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return campos.some(c => (c || "").toLowerCase().includes(t));
  };

  const filtrados = links.filter(l =>
    (lkStatus === "todos" || l.status === lkStatus) &&
    matchBusca(lkBusca, nomePaciente(l), l.descricao || "", l.id)
  );
  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const pageSafe = Math.min(lkPage, totalPages);
  const pagina = filtrados.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[220px]">
          <Label>Buscar</Label>
          <Input placeholder="Paciente, descrição ou ID" value={lkBusca} onChange={e => { setLkBusca(e.target.value); setLkPage(1); }} />
        </div>
        <div className="min-w-[180px]">
          <Label>Status</Label>
          <Select value={lkStatus} onValueChange={v => { setLkStatus(v); setLkPage(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
              <SelectItem value="expirado">Expirado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={onNovaCobranca}><Link2 className="h-4 w-4 mr-2" />Nova cobrança</Button>
      </div>
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left p-2">Descrição</th>
              <th className="text-left p-2">Paciente</th>
              <th className="text-left p-2">Valor</th>
              <th className="text-left p-2">Vencimento</th>
              <th className="text-left p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {pagina.map(l => (
              <tr key={l.id} className="border-t">
                <td className="p-2">{l.descricao}</td>
                <td className="p-2">{nomePaciente(l) || <span className="text-muted-foreground">—</span>}</td>
                <td className="p-2">{brl(l.valor_centavos)}</td>
                <td className="p-2">{l.vencimento || "—"}</td>
                <td className="p-2"><FinanceiroStatusBadge s={l.status} /></td>
              </tr>
            ))}
            {!filtrados.length && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Nenhum link de cobrança ainda</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{filtrados.length} resultado(s) · página {pageSafe}/{totalPages}</span>
        <div className="space-x-2">
          <Button size="sm" variant="outline" disabled={pageSafe <= 1} onClick={() => setLkPage(p => Math.max(1, p - 1))}>Anterior</Button>
          <Button size="sm" variant="outline" disabled={pageSafe >= totalPages} onClick={() => setLkPage(p => p + 1)}>Próxima</Button>
        </div>
      </div>
    </div>
  );
}
