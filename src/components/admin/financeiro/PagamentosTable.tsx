import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { FinanceiroStatusBadge } from "./FinanceiroStatusBadge";

export interface PagamentoRow {
  id: string;
  status: string;
  valor_bruto_centavos?: number;
  valor_centavos?: number;
  metodo?: string;
  forma?: string;
  data_pagamento?: string | null;
  paid_at?: string | null;
  created_at?: string;
  consulta_id?: string | null;
  paciente?: { nome_completo?: string; nome?: string } | null;
  medico?: { nome?: string } | null;
  empresa?: { razao_social?: string; nome_fantasia?: string } | null;
}

const fmtData = (s?: string | null) => s ? new Date(s).toLocaleString("pt-BR") : "—";
const brl = (v: number) => (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const nomePaciente = (p: PagamentoRow) => p?.paciente?.nome_completo || p?.paciente?.nome || "";
const nomeMedico = (p: PagamentoRow) => p?.medico?.nome || "";
const nomeEmpresa = (p: PagamentoRow) => p?.empresa?.nome_fantasia || p?.empresa?.razao_social || "";

interface PagamentosTableProps {
  pagamentos: PagamentoRow[];
  pgBusca: string;
  setPgBusca: (v: string) => void;
  pgStatus: string;
  setPgStatus: (v: string) => void;
  pgPage: number;
  setPgPage: React.Dispatch<React.SetStateAction<number>>;
  selecionados: Set<string>;
  togglePagamento: (id: string) => void;
  todosPendentesSelecionados: boolean;
  toggleTodos: () => void;
  selecionadosPendentes: PagamentoRow[];
  loteRunning: boolean;
  onAprovarLote: () => void;
  onCancelLoteOpen: () => void;
  onLimparSelecao: () => void;
  onConfirmar: (id: string) => void;
  onCancelar: (id: string) => void;
  onDetalhe: (p: PagamentoRow) => void;
}

export function PagamentosTable({
  pagamentos, pgBusca, setPgBusca, pgStatus, setPgStatus,
  pgPage, setPgPage, selecionados, togglePagamento,
  todosPendentesSelecionados, toggleTodos, selecionadosPendentes,
  loteRunning, onAprovarLote, onCancelLoteOpen, onLimparSelecao,
  onConfirmar, onCancelar, onDetalhe,
}: PagamentosTableProps) {
  const PAGE_SIZE = 20;
  const matchBusca = (q: string, ...campos: string[]) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return campos.some(c => (c || "").toLowerCase().includes(t));
  };

  const filtrados = pagamentos.filter(p =>
    (pgStatus === "todos" || p.status === pgStatus) &&
    matchBusca(pgBusca, nomePaciente(p), nomeMedico(p), nomeEmpresa(p), p.id)
  );
  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const pageSafe = Math.min(pgPage, totalPages);
  const pagina = filtrados.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);
  const pendentes = pagamentos.filter(p => p.status === "pendente");

  return (
    <div className="space-y-2">
      {selecionadosPendentes.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-2">
          <span className="text-sm">{selecionadosPendentes.length} pagamento(s) pendente(s) selecionado(s)</span>
          <div className="space-x-2">
            <Button size="sm" variant="outline" onClick={onLimparSelecao} disabled={loteRunning}>Limpar</Button>
            <Button size="sm" onClick={onAprovarLote} disabled={loteRunning}>
              {loteRunning ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}Aprovar selecionados
            </Button>
            <Button size="sm" variant="destructive" onClick={onCancelLoteOpen} disabled={loteRunning}>
              <XCircle className="h-3 w-3 mr-1" />Cancelar selecionados
            </Button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[220px]">
          <Label>Buscar</Label>
          <Input placeholder="Paciente, médico, empresa ou ID" value={pgBusca} onChange={e => { setPgBusca(e.target.value); setPgPage(1); }} />
        </div>
        <div className="min-w-[180px]">
          <Label>Status</Label>
          <Select value={pgStatus} onValueChange={v => { setPgStatus(v); setPgPage(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="recusado">Recusado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
              <SelectItem value="reembolsado">Estornado</SelectItem>
              <SelectItem value="reembolsado_parcial">Estornado parcial</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="p-2 w-8">
                <Checkbox checked={todosPendentesSelecionados} onCheckedChange={toggleTodos} aria-label="Selecionar todos pendentes" disabled={!pendentes.length} />
              </th>
              <th className="text-left p-2">ID</th>
              <th className="text-left p-2">Paciente / Médico / Empresa</th>
              <th className="text-left p-2">Valor</th>
              <th className="text-left p-2">Forma</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Pago em</th>
              <th className="text-right p-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {pagina.map(p => (
              <tr key={p.id} className="border-t">
                <td className="p-2">
                  {p.status === "pendente" && (
                    <Checkbox checked={selecionados.has(p.id)} onCheckedChange={() => togglePagamento(p.id)} aria-label={`Selecionar ${p.id}`} />
                  )}
                </td>
                <td className="p-2 font-mono text-xs">{p.id.slice(0, 8)}</td>
                <td className="p-2">
                  <div className="leading-tight">
                    <div>{nomePaciente(p) || <span className="text-muted-foreground">—</span>}</div>
                    <div className="text-xs text-muted-foreground">{[nomeMedico(p), nomeEmpresa(p)].filter(Boolean).join(" · ") || ""}</div>
                  </div>
                </td>
                <td className="p-2">{brl(p.valor_bruto_centavos || p.valor_centavos || 0)}</td>
                <td className="p-2">{p.metodo || p.forma || "—"}</td>
                <td className="p-2"><FinanceiroStatusBadge s={p.status} /></td>
                <td className="p-2">{fmtData(p.data_pagamento || p.paid_at)}</td>
                <td className="p-2 text-right space-x-1">
                  <Button size="sm" variant="ghost" onClick={() => onDetalhe(p)}>Ver</Button>
                  {p.status === "pendente" && <>
                    <Button size="sm" variant="outline" onClick={() => onConfirmar(p.id)}><CheckCircle2 className="h-3 w-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => onCancelar(p.id)}><XCircle className="h-3 w-3" /></Button>
                  </>}
                </td>
              </tr>
            ))}
            {!filtrados.length && <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">Sem pagamentos</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{filtrados.length} resultado(s) · página {pageSafe}/{totalPages}</span>
        <div className="space-x-2">
          <Button size="sm" variant="outline" disabled={pageSafe <= 1} onClick={() => setPgPage(p => Math.max(1, p - 1))}>Anterior</Button>
          <Button size="sm" variant="outline" disabled={pageSafe >= totalPages} onClick={() => setPgPage(p => p + 1)}>Próxima</Button>
        </div>
      </div>
    </div>
  );
}
