import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FiltrosGlobais, brl, num, pct, toRpcArgs, downloadCSV } from "@/lib/relatorios/utils";
import { Download, AlertTriangle, Trophy } from "lucide-react";
import { toast } from "sonner";

type Props = { filtros: FiltrosGlobais };

type Linha = {
  medico_id: string;
  medico_nome: string;
  especialidade: string;
  total_consultas: number;
  concluidas: number;
  no_show: number;
  canceladas: number;
  receita_bruta_centavos: number;
  receita_medico_centavos: number;
  taxa_no_show: number;
  pacientes_unicos: number;
  ticket_medio_centavos: number;
};

export default function MedicosTab({ filtros }: Props) {
  const [loading, setLoading] = useState(false);
  const [linhas, setLinhas] = useState<Linha[]>([]);

  const carregar = async () => {
    setLoading(true);
    try {
      const args = toRpcArgs(filtros);
      const { data, error } = await supabase.rpc("relatorios_medicos_performance", {
        p_inicio: args.p_inicio, p_fim: args.p_fim,
        p_especialidade: args.p_especialidade, p_empresa_id: args.p_empresa_id,
      });
      if (error) throw error;
      setLinhas((data || []) as Linha[]);
    } catch (e: any) {
      toast.error("Erro ao carregar performance médicos", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [JSON.stringify(filtros)]);

  const exportar = () => {
    const rows: any[][] = [["Médico", "Especialidade", "Consultas", "Concluídas", "No-show", "Canceladas", "Receita bruta", "Repasse", "Taxa no-show", "Pacientes únicos", "Ticket médio"]];
    linhas.forEach((l) => rows.push([
      l.medico_nome, l.especialidade, l.total_consultas, l.concluidas, l.no_show, l.canceladas,
      brl(l.receita_bruta_centavos), brl(l.receita_medico_centavos), pct(l.taxa_no_show),
      l.pacientes_unicos, brl(l.ticket_medio_centavos),
    ]));
    downloadCSV(`medicos-${filtros.inicio}-a-${filtros.fim}.csv`, rows);
  };

  const top3Receita = [...linhas].slice(0, 3);
  const alertasNoShow = linhas.filter((l) => l.taxa_no_show >= 20 && l.total_consultas >= 5);

  if (loading && linhas.length === 0) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={exportar}><Download className="h-4 w-4 mr-1" /> Exportar CSV</Button>
      </div>

      {linhas.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">Sem dados de médicos no período.</Card>
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-3">
            {top3Receita.map((m, i) => (
              <Card key={m.medico_id} className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className={i === 0 ? "h-5 w-5 text-amber-500" : i === 1 ? "h-5 w-5 text-gray-400" : "h-5 w-5 text-amber-700"} />
                  <span className="text-xs text-muted-foreground">#{i + 1} faturamento</span>
                </div>
                <div className="text-sm font-semibold truncate">{m.medico_nome}</div>
                <div className="text-xs text-muted-foreground mb-2">{m.especialidade}</div>
                <div className="text-xl font-bold text-emerald-600">{brl(m.receita_bruta_centavos)}</div>
                <div className="text-xs text-muted-foreground mt-1">{m.concluidas} concluídas · {m.pacientes_unicos} pacientes</div>
              </Card>
            ))}
          </div>

          {alertasNoShow.length > 0 && (
            <Card className="p-4 border-destructive/30 bg-destructive/5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <h3 className="text-sm font-semibold">Médicos com alto no-show (≥20%)</h3>
              </div>
              <ul className="text-sm space-y-1">
                {alertasNoShow.map((m) => (
                  <li key={m.medico_id}>
                    <strong>{m.medico_nome}</strong> — {pct(m.taxa_no_show)} ({m.no_show}/{m.total_consultas})
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground bg-muted/30 border-b">
                  <tr>
                    <th className="text-left p-3">Médico</th>
                    <th className="text-left p-3">Especialidade</th>
                    <th className="text-right p-3">Consultas</th>
                    <th className="text-right p-3">Concluídas</th>
                    <th className="text-right p-3">No-show</th>
                    <th className="text-right p-3">Pacientes</th>
                    <th className="text-right p-3">Ticket médio</th>
                    <th className="text-right p-3">Receita</th>
                    <th className="text-right p-3">Repasse</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((m) => (
                    <tr key={m.medico_id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3 font-medium">{m.medico_nome}</td>
                      <td className="p-3 text-xs text-muted-foreground">{m.especialidade}</td>
                      <td className="p-3 text-right">{num(m.total_consultas)}</td>
                      <td className="p-3 text-right">{num(m.concluidas)}</td>
                      <td className="p-3 text-right">
                        <Badge variant={m.taxa_no_show >= 20 ? "destructive" : m.taxa_no_show >= 10 ? "secondary" : "outline"}>
                          {pct(m.taxa_no_show)}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">{num(m.pacientes_unicos)}</td>
                      <td className="p-3 text-right">{brl(m.ticket_medio_centavos)}</td>
                      <td className="p-3 text-right font-semibold text-emerald-600">{brl(m.receita_bruta_centavos)}</td>
                      <td className="p-3 text-right text-muted-foreground">{brl(m.receita_medico_centavos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
