import { useEffect, useState, useCallback } from "react";
import { Wallet, Download, FileText, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { brl } from "@/lib/relatorios/utils";
import { useEmpresaAtual } from "@/lib/useEmpresaAtual";

const STATUS_LABEL: Record<string, string> = {
  paga: "Paga",
  em_aberto: "Em aberto",
  atrasada: "Atrasada",
  cancelada: "Cancelada",
};

const STATUS_CLASS: Record<string, string> = {
  paga: "bg-success/10 text-success",
  em_aberto: "bg-warning/10 text-warning",
  atrasada: "bg-destructive/10 text-destructive",
  cancelada: "bg-muted text-muted-foreground",
};

type Fatura = {
  id: string;
  competencia_mes: number;
  competencia_ano: number;
  vencimento: string;
  valor_total_centavos: number;
  qtd_funcionarios: number;
  qtd_consultas: number;
  status: string;
  pago_em: string | null;
  observacoes: string | null;
};

export default function EmpresaFinanceiro() {
  const { empresa } = useEmpresaAtual();
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    if (!empresa) return;
    setLoading(true);
    try {
      const { data: fats, error } = await supabase
        .from("empresas_faturas")
        .select("*")
        .eq("empresa_id", empresa.empresaId)
        .order("competencia_ano", { ascending: false })
        .order("competencia_mes", { ascending: false })
        .limit(50);

      if (error) throw error;
      setFaturas((fats as Fatura[]) || []);
    } catch (e: any) {
      toast.error(e.message || "Erro ao carregar faturas");
    } finally {
      setLoading(false);
    }
  }, [empresa]);

  useEffect(() => { carregar(); }, [carregar]);

  const totalPago = faturas.filter(f => f.status === "paga").reduce((s, f) => s + f.valor_total_centavos, 0);
  const totalAberto = faturas.filter(f => f.status === "em_aberto" || f.status === "atrasada").reduce((s, f) => s + f.valor_total_centavos, 0);
  const ultimaFatura = faturas[0];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Financeiro</p>
          <h1 className="font-display text-2xl font-bold">Faturas e consumo</h1>
          {empresa && <p className="text-sm text-muted-foreground">{empresa.nomeFantasia || empresa.razaoSocial}</p>}
        </div>
        <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </header>

      {/* KPIs */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="card-elevated p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total pago</p>
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-bold">{brl(totalPago)}</p>
            <p className="text-[11px] text-muted-foreground">{faturas.filter(f => f.status === "paga").length} faturas pagas</p>
          </div>
          <div className="card-elevated p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Em aberto</p>
            <p className="mt-2 text-2xl font-bold">{brl(totalAberto)}</p>
            <p className="text-[11px] text-muted-foreground">{faturas.filter(f => f.status === "em_aberto" || f.status === "atrasada").length} faturas pendentes</p>
          </div>
          <div className="card-elevated p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Última fatura</p>
            <p className="mt-2 text-2xl font-bold">
              {ultimaFatura ? `${String(ultimaFatura.competencia_mes).padStart(2, "0")}/${ultimaFatura.competencia_ano}` : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {ultimaFatura ? `${ultimaFatura.qtd_funcionarios} vidas · ${brl(ultimaFatura.valor_total_centavos)}` : "Nenhuma fatura"}
            </p>
          </div>
        </div>
      )}

      {/* Tabela de faturas */}
      <section className="card-elevated p-6">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
          <FileText className="h-4 w-4 text-primary" /> Histórico de faturas
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full rounded" />)}
          </div>
        ) : faturas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Nenhuma fatura encontrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="pb-2 pr-3">Competência</th>
                  <th className="pb-2 pr-3">Vidas</th>
                  <th className="pb-2 pr-3">Consultas</th>
                  <th className="pb-2 pr-3">Valor</th>
                  <th className="pb-2 pr-3">Vencimento</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {faturas.map(f => (
                  <tr key={f.id}>
                    <td className="py-3 pr-3 font-medium">
                      {String(f.competencia_mes).padStart(2, "0")}/{f.competencia_ano}
                    </td>
                    <td className="py-3 pr-3">{f.qtd_funcionarios}</td>
                    <td className="py-3 pr-3">{f.qtd_consultas}</td>
                    <td className="py-3 pr-3">{brl(f.valor_total_centavos)}</td>
                    <td className="py-3 pr-3 text-muted-foreground">
                      {new Date(f.vencimento).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-3 pr-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLASS[f.status] || ""}`}>
                        {STATUS_LABEL[f.status] || f.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => toast.info("Download de boleto/NF será habilitado em breve.")}>
                        <Download className="mr-1 h-3.5 w-3.5" /> Baixar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
