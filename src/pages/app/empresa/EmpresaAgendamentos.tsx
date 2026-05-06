import { useEffect, useMemo, useState, useCallback } from "react";
import { Plus, Layers, Calendar, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { brl } from "@/lib/relatorios/utils";
import { useEmpresaAtual } from "@/lib/useEmpresaAtual";

type ConsultaEmpresa = {
  id: string;
  inicio: string;
  fim: string;
  status: string;
  modalidade: string;
  valor_centavos: number;
  paciente_nome: string;
  medico_nome: string;
};

export default function EmpresaAgendamentos() {
  const { empresa } = useEmpresaAtual();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ConsultaEmpresa[]>([]);
  const [busca, setBusca] = useState("");

  const carregar = useCallback(async () => {
    if (!empresa) return;
    setLoading(true);
    try {
      const eid = empresa.empresaId;

      // Buscar consultas da empresa
      const { data: consultas, error } = await supabase
        .from("consultas")
        .select(`
          id, inicio, fim, status, modalidade, valor_centavos,
          pacientes:pacientes!consultas_paciente_id_fkey ( nome_completo ),
          medicos:medicos!consultas_medico_id_fkey ( nome )
        `)
        .eq("empresa_id", eid)
        .order("inicio", { ascending: false })
        .limit(200);

      if (error) throw error;

      setRows(
        (consultas || []).map((c: any) => ({
          id: c.id,
          inicio: c.inicio,
          fim: c.fim,
          status: c.status,
          modalidade: c.modalidade,
          valor_centavos: c.valor_centavos,
          paciente_nome: c.pacientes?.nome_completo || "—",
          medico_nome: c.medicos?.nome || "—",
        }))
      );
    } catch (e: any) {
      toast.error(e.message || "Erro ao carregar agendamentos");
    } finally {
      setLoading(false);
    }
  }, [empresa]);

  useEffect(() => { carregar(); }, [carregar]);

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(r =>
      r.paciente_nome.toLowerCase().includes(t) ||
      r.medico_nome.toLowerCase().includes(t)
    );
  }, [rows, busca]);

  const futuras = filtradas.filter(r => new Date(r.inicio) >= new Date() && !["cancelada", "concluida", "no_show"].includes(r.status));
  const passadas = filtradas.filter(r => new Date(r.inicio) < new Date() || ["cancelada", "concluida", "no_show"].includes(r.status));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Operação</p>
          <h1 className="font-display text-2xl font-bold">Agendamentos corporativos</h1>
          <p className="text-sm text-muted-foreground">Consultas vinculadas à sua empresa</p>
        </div>
        <Button variant="outline" onClick={carregar} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </header>

      {/* Fluxo visual */}
      <div className="card-elevated p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fluxo do agendamento</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {["Empresa", "Sistema", "Médico", "Confirmação"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">{s}</span>
              {i < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </div>

      {/* Busca */}
      <Input
        placeholder="Buscar por funcionário ou médico..."
        value={busca}
        onChange={e => setBusca(e.target.value)}
        className="max-w-sm"
      />

      {/* Próximos */}
      <div className="card-elevated p-4">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" /> Próximos agendamentos
        </h2>
        <div className="mt-3 overflow-x-auto">
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="pb-2 pr-3">Funcionário</th>
                  <th className="pb-2 pr-3">Médico</th>
                  <th className="pb-2 pr-3">Data</th>
                  <th className="pb-2 pr-3">Modalidade</th>
                  <th className="pb-2 pr-3">Valor</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {futuras.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">Nenhum agendamento futuro.</td></tr>
                )}
                {futuras.map(a => (
                  <tr key={a.id}>
                    <td className="py-3 pr-3 font-medium">{a.paciente_nome}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{a.medico_nome}</td>
                    <td className="py-3 pr-3 text-muted-foreground">
                      {new Date(a.inicio).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="py-3 pr-3 capitalize text-muted-foreground">{a.modalidade}</td>
                    <td className="py-3 pr-3 text-right">{brl(a.valor_centavos)}</td>
                    <td className="py-3"><StatusBadge status={a.status as any} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Histórico */}
      {passadas.length > 0 && (
        <div className="card-elevated p-4">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2 text-muted-foreground">
            Histórico
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="pb-2 pr-3">Funcionário</th>
                  <th className="pb-2 pr-3">Médico</th>
                  <th className="pb-2 pr-3">Data</th>
                  <th className="pb-2 pr-3">Valor</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {passadas.map(a => (
                  <tr key={a.id} className="opacity-70">
                    <td className="py-3 pr-3 font-medium">{a.paciente_nome}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{a.medico_nome}</td>
                    <td className="py-3 pr-3 text-muted-foreground">
                      {new Date(a.inicio).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="py-3 pr-3 text-right">{brl(a.valor_centavos)}</td>
                    <td className="py-3"><StatusBadge status={a.status as any} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
