import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ChevronDown, ChevronRight, Loader2, Shield, Clock, User } from "lucide-react";
import { FinanceiroStatusBadge } from "./FinanceiroStatusBadge";
import { supabase } from "@/integrations/supabase/client";

const fmtData = (s?: string | null) => s ? new Date(s).toLocaleString("pt-BR") : "—";
const brl = (v: number) => (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export interface ReembolsoRow {
  id: string;
  tipo: string;
  valor_centavos: number;
  status: string;
  motivo?: string;
  observacao?: string;
  created_at: string;
  decidido_em?: string | null;
  snapshot_estornado?: boolean;
  paciente_nome: string;
  medico_nome: string;
  consulta_data?: string | null;
  payment_ref?: string | null;
  solicitante_nome?: string | null;
  analisador_nome?: string | null;
}

interface ReembolsosTableProps {
  reembolsos: ReembolsoRow[];
  onAprovar: (id: string) => void;
  onRecusar: (id: string) => void;
}

export function ReembolsosTable({ reembolsos, onAprovar, onRecusar }: ReembolsosTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [audit, setAudit] = useState<Array<Record<string, unknown>>>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  async function toggleAudit(id: string) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    setAuditLoading(true);
    try {
      const { data } = await supabase
        .from("financeiro_auditoria")
        .select("*, actor:profiles!actor_id(nome)")
        .eq("entidade", "reembolso")
        .eq("entidade_id", id)
        .order("created_at", { ascending: true });
      setAudit(data || []);
    } catch { setAudit([]); }
    setAuditLoading(false);
  }

  return (
    <div className="rounded-lg border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="w-8 p-2" />
            <th className="text-left p-2">ID</th>
            <th className="text-left p-2">Paciente</th>
            <th className="text-left p-2">Médico</th>
            <th className="text-left p-2">Tipo</th>
            <th className="text-left p-2">Valor</th>
            <th className="text-left p-2">Status</th>
            <th className="text-left p-2">Data</th>
            <th className="text-right p-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {reembolsos.map(r => {
            const isExpanded = expandedId === r.id;
            return (
              <React.Fragment key={r.id}>
                <tr className="border-t cursor-pointer hover:bg-muted/30" onClick={() => toggleAudit(r.id)}>
                  <td className="p-2 text-muted-foreground">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </td>
                  <td className="p-2 font-mono text-xs">{r.id.slice(0, 8)}</td>
                  <td className="p-2">{r.paciente_nome}</td>
                  <td className="p-2">{r.medico_nome}</td>
                  <td className="p-2"><Badge variant="outline">{r.tipo}</Badge></td>
                  <td className="p-2 font-semibold">{brl(r.valor_centavos)}</td>
                  <td className="p-2"><FinanceiroStatusBadge s={r.status} /></td>
                  <td className="p-2 text-xs text-muted-foreground">{fmtData(r.created_at)}</td>
                  <td className="p-2 text-right space-x-1" onClick={e => e.stopPropagation()}>
                    {(r.status === "solicitado" || r.status === "em_analise") && <>
                      <Button size="sm" variant="outline" onClick={() => onAprovar(r.id)}><CheckCircle2 className="h-3 w-3" /></Button>
                      <Button size="sm" variant="outline" onClick={() => onRecusar(r.id)}><XCircle className="h-3 w-3" /></Button>
                    </>}
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="bg-muted/20">
                    <td colSpan={9} className="p-4">
                      {auditLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground py-4"><Loader2 className="h-4 w-4 animate-spin" /> Carregando auditoria…</div>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-3">
                            <h4 className="font-semibold text-sm flex items-center gap-1.5"><Shield className="h-4 w-4 text-primary" /> Detalhes do Reembolso</h4>
                            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                              <dt className="text-muted-foreground">Motivo:</dt><dd>{r.motivo}</dd>
                              {r.observacao && <><dt className="text-muted-foreground">Observação:</dt><dd>{r.observacao}</dd></>}
                              <dt className="text-muted-foreground">Solicitado por:</dt>
                              <dd className="flex items-center gap-1"><User className="h-3 w-3" /> {r.solicitante_nome ?? "—"}</dd>
                              <dt className="text-muted-foreground">Solicitado em:</dt><dd>{fmtData(r.created_at)}</dd>
                              {r.analisador_nome && <><dt className="text-muted-foreground">Analisado por:</dt><dd className="flex items-center gap-1"><User className="h-3 w-3" /> {r.analisador_nome}</dd></>}
                              {r.decidido_em && <><dt className="text-muted-foreground">Decidido em:</dt><dd>{fmtData(r.decidido_em)}</dd></>}
                              <dt className="text-muted-foreground">Consulta:</dt><dd>{r.consulta_data ? fmtData(r.consulta_data) : "—"}</dd>
                              <dt className="text-muted-foreground">Payment Ref:</dt><dd className="font-mono text-xs">{r.payment_ref ?? "—"}</dd>
                              <dt className="text-muted-foreground">Estorno processado:</dt><dd>{r.snapshot_estornado ? "Sim ✓" : "Não"}</dd>
                            </dl>
                          </div>
                          <div className="space-y-3">
                            <h4 className="font-semibold text-sm flex items-center gap-1.5"><Clock className="h-4 w-4 text-primary" /> Histórico de Auditoria</h4>
                            {audit.length === 0 ? (
                              <p className="text-xs text-muted-foreground">Sem registros de auditoria.</p>
                            ) : (
                              <div className="relative border-l-2 border-border pl-4 space-y-3">
                                {audit.map((a: Record<string, unknown>) => (
                                  <div key={a.id as string} className="relative">
                                    <div className="absolute -left-[1.35rem] top-1 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
                                    <p className="text-xs font-medium">{a.acao as string}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {(a.actor as Record<string, string> | null)?.nome ?? "Sistema"} · {fmtData(a.created_at as string)}
                                    </p>
                                    {(a.valor_anterior || a.valor_novo) && (
                                      <p className="text-xs mt-0.5">
                                        <span className="text-muted-foreground">{(a.valor_anterior as string) ?? "—"}</span>
                                        <span className="mx-1">→</span>
                                        <span className="font-medium">{(a.valor_novo as string) ?? "—"}</span>
                                      </p>
                                    )}
                                    {a.motivo && <p className="text-xs text-muted-foreground italic">{a.motivo as string}</p>}
                                    {a.observacao && <p className="text-xs text-muted-foreground">{a.observacao as string}</p>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
          {!reembolsos.length && <tr><td colSpan={9} className="p-4 text-center text-muted-foreground">Sem reembolsos</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
