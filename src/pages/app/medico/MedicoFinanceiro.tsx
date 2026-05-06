import { useEffect, useMemo, useState } from "react";
import { Wallet, TrendingUp, Clock, CheckCircle2, AlertCircle, Loader2, Filter, Banknote, CalendarClock, ArrowDownToLine, Building2, User } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { useMedicoAtual } from "@/lib/useMedicoAtual";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ReceitaPorOrigem } from "@/components/planos/ReceitaPorOrigem";
import { getSaqueConfig, calcularSaldo, brl, type SaqueConfig, type SaldoInfo } from "@/lib/saques";
import { SolicitarSaqueDialog } from "@/components/medico/SolicitarSaqueDialog";
import { SaqueHistorico } from "@/components/medico/SaqueHistorico";

type FinRow = {
  id: string;
  consulta_id: string;
  data_consulta: string;
  servico_nome_snapshot: string | null;
  modelo_aplicado: string;
  comissao_pct_aplicada: number | null;
  valor_bruto_centavos: number;
  valor_medico_centavos: number;
  valor_plataforma_centavos: number;
  status: string;
  paciente_nome?: string | null;
  empresa_id?: string | null;
};

const periodos = [
  { key: "30d", label: "Últimos 30 dias" },
  { key: "90d", label: "Últimos 90 dias" },
  { key: "ano", label: "Este ano" },
  { key: "tudo", label: "Tudo" },
] as const;

function statusBadge(s: string) {
  if (s === "liberado" || s === "pago" || s === "valido")
    return <Badge variant="outline" className="border-success/40 text-success">Liberado</Badge>;
  if (s === "pendente")
    return <Badge variant="outline" className="border-warning/40 text-warning">Pendente</Badge>;
  if (s === "cancelado" || s === "estornado" || s === "invalidado" || s === "reembolsado")
    return <Badge variant="outline" className="border-destructive/40 text-destructive">{s}</Badge>;
  return <Badge variant="outline">{s}</Badge>;
}

export default function MedicoFinanceiro() {
  const { session } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<FinRow[]>([]);
  const [periodo, setPeriodo] = useState<typeof periodos[number]["key"]>("30d");
  const [medicoId, setMedicoId] = useState<string | null>(null);
  const { medico: medicoAtual } = useMedicoAtual();

  // Saque state
  const [saqueConfig, setSaqueConfig] = useState<SaqueConfig | null>(null);
  const [saldo, setSaldo] = useState<SaldoInfo | null>(null);
  const [saqueDialogOpen, setSaqueDialogOpen] = useState(false);

  function cutoffDate(): Date | null {
    const d = new Date();
    if (periodo === "30d") { d.setDate(d.getDate() - 30); return d; }
    if (periodo === "90d") { d.setDate(d.getDate() - 90); return d; }
    if (periodo === "ano") return new Date(d.getFullYear(), 0, 1);
    return null;
  }

  async function carregar() {
    if (!session) { setLoading(false); return; }
    setLoading(true);
    const mid = await getMedicoAtualId();
    setMedicoId(mid);
    if (!mid) { setRows([]); setLoading(false); return; }

    let q = supabase
      .from("consultas_financeiro")
      .select(`
        id, consulta_id, data_consulta, servico_nome_snapshot, modelo_aplicado,
        comissao_pct_aplicada, valor_bruto_centavos, valor_medico_centavos,
        valor_plataforma_centavos, status, empresa_id, paciente_id
      `)
      .eq("medico_id", mid)
      .order("data_consulta", { ascending: false })
      .limit(500);

    const cut = cutoffDate();
    if (cut) q = q.gte("data_consulta", cut.toISOString());

    const { data, error } = await q;
    if (error) {
      toast({ title: "Erro ao carregar financeiro", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Buscar nomes dos pacientes via paciente_id → profiles (user_id do paciente)
    const pacienteIds = Array.from(new Set(
      (data ?? []).map((r: any) => r.paciente_id).filter(Boolean) as string[]
    ));
    let nomes: Record<string, string> = {};
    if (pacienteIds.length) {
      const { data: pacs } = await supabase.from("pacientes").select("id, user_id").in("id", pacienteIds);
      const userIds = (pacs ?? []).map(p => p.user_id).filter(Boolean) as string[];
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, nome").in("id", userIds);
        const nomeMap = Object.fromEntries((profs ?? []).map(p => [p.id, p.nome]));
        for (const pac of pacs ?? []) {
          if (pac.user_id && nomeMap[pac.user_id]) {
            nomes[pac.id] = nomeMap[pac.user_id];
          }
        }
      }
    }

    setRows((data ?? []).map((r: any) => ({
      id: r.id,
      consulta_id: r.consulta_id,
      data_consulta: r.data_consulta,
      servico_nome_snapshot: r.servico_nome_snapshot,
      modelo_aplicado: r.modelo_aplicado,
      comissao_pct_aplicada: r.comissao_pct_aplicada,
      valor_bruto_centavos: r.valor_bruto_centavos,
      valor_medico_centavos: r.valor_medico_centavos,
      valor_plataforma_centavos: r.valor_plataforma_centavos,
      status: r.status,
      paciente_nome: r.paciente_id ? nomes[r.paciente_id] ?? null : null,
      empresa_id: r.empresa_id ?? null,
    })));
    setLoading(false);
  }

  async function carregarSaldo() {
    if (!medicoId) return;
    const cfg = await getSaqueConfig();
    setSaqueConfig(cfg);
    const s = await calcularSaldo(medicoId, cfg);
    setSaldo(s);
  }

  useEffect(() => { void carregar(); }, [session, periodo]);
  useEffect(() => { if (medicoId) carregarSaldo(); }, [medicoId]);

  const kpis = useMemo(() => {
    const valido = rows.filter(r => r.status === "valido" || r.status === "liberado" || r.status === "pago");
    const pendente = rows.filter(r => r.status === "pendente");
    return {
      totalReceber: valido.reduce((s, r) => s + r.valor_medico_centavos, 0),
      pendentes: pendente.reduce((s, r) => s + r.valor_medico_centavos, 0),
      consultas: rows.length,
      ticketMedio: rows.length ? Math.round(rows.reduce((s, r) => s + r.valor_medico_centavos, 0) / rows.length) : 0,
    };
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description="Extrato dos seus repasses por consulta e controle de saques."
      />

      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="A receber (liberado)" value={brl(kpis.totalReceber)} icon={CheckCircle2} />
        <StatCard label="Pendente" value={brl(kpis.pendentes)} icon={Clock} />
        <StatCard label="Consultas no período" value={kpis.consultas.toString()} icon={TrendingUp} />
        <StatCard label="Ticket médio (você)" value={brl(kpis.ticketMedio)} icon={Wallet} />
      </div>

      {/* ── SEPARAÇÃO B2B vs B2C ── */}
      {rows.length > 0 && (() => {
        const b2b = rows.filter(r => !!r.empresa_id);
        const b2c = rows.filter(r => !r.empresa_id);
        const totalB2B = b2b.reduce((s, r) => s + r.valor_medico_centavos, 0);
        const totalB2C = b2c.reduce((s, r) => s + r.valor_medico_centavos, 0);
        const total = totalB2B + totalB2C;
        if (b2b.length === 0 && b2c.length === 0) return null;
        return (
          <div className="card-elevated p-5">
            <h3 className="text-sm font-semibold mb-3">Receita por origem</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <User className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Particular (B2C)</p>
                  <p className="text-lg font-bold">{brl(totalB2C)}</p>
                </div>
                <span className="text-xs text-muted-foreground">{b2c.length} consultas</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <Building2 className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Corporativo (B2B)</p>
                  <p className="text-lg font-bold">{brl(totalB2B)}</p>
                </div>
                <span className="text-xs text-muted-foreground">{b2b.length} consultas</span>
              </div>
            </div>
            {total > 0 && (
              <div className="mt-3 h-2 flex rounded-full overflow-hidden bg-muted">
                <div className="bg-muted-foreground/40 transition-all" style={{ width: `${Math.round((totalB2C / total) * 100)}%` }} />
                <div className="bg-primary transition-all" style={{ width: `${Math.round((totalB2B / total) * 100)}%` }} />
              </div>
            )}
          </div>
        );
      })()}

      {saldo && saqueConfig && medicoId && (
        <div className="card-elevated p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <Banknote className="h-5 w-5 text-primary" /> Saldo para saque
            </h3>
            <Button
              className="bg-gradient-primary hover:opacity-90"
              disabled={saldo.liberado_centavos < saqueConfig.valor_minimo_centavos}
              onClick={() => setSaqueDialogOpen(true)}
            >
              <ArrowDownToLine className="mr-2 h-4 w-4" /> Solicitar saque
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-success/30 bg-success/5 p-4 text-center">
              <p className="text-xs text-muted-foreground">Disponível para saque</p>
              <p className="text-xl font-bold text-success">{brl(saldo.liberado_centavos)}</p>
            </div>
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-center">
              <p className="text-xs text-muted-foreground">Aguardando liberação</p>
              <p className="text-xl font-bold text-warning">{brl(saldo.aguardando_centavos)}</p>
            </div>
            <div className="rounded-lg border border-border p-4 text-center">
              <p className="text-xs text-muted-foreground">Prazo de segurança</p>
              <p className="text-xl font-bold">{saqueConfig.prazo_liberacao_dias} dias</p>
            </div>
            <div className="rounded-lg border border-border p-4 text-center">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><CalendarClock className="h-3 w-3" /> Próxima liberação</p>
              <p className="text-xl font-bold">
                {saldo.proxima_liberacao ? saldo.proxima_liberacao.toLocaleDateString("pt-BR") : "—"}
              </p>
            </div>
          </div>
          {saldo.liberado_centavos < saqueConfig.valor_minimo_centavos && saldo.liberado_centavos > 0 && (
            <p className="text-xs text-muted-foreground">
              Valor mínimo para saque: {brl(saqueConfig.valor_minimo_centavos)}. Aguarde mais consultas serem liberadas.
            </p>
          )}
        </div>
      )}

      {/* Histórico de saques */}
      {medicoId && (
        <div className="card-elevated overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold">Histórico de saques</h3>
          </div>
          <SaqueHistorico medicoId={medicoId} />
        </div>
      )}

      {/* Receita por origem */}
      {medicoId && <ReceitaPorOrigem periodo={periodo} medicoId={medicoId} />}

      <div className="card-elevated p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Período:</span>
          {periodos.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriodo(p.key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                periodo === p.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card-elevated overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando extrato…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 opacity-40" />
            <p className="text-sm">Nenhuma consulta financeira no período selecionado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Data</th>
                  <th className="px-4 py-2 text-left">Paciente</th>
                  <th className="px-4 py-2 text-left">Serviço</th>
                  <th className="px-4 py-2 text-left">Modelo</th>
                  <th className="px-4 py-2 text-right">Bruto</th>
                  <th className="px-4 py-2 text-right">Plataforma</th>
                  <th className="px-4 py-2 text-right">Você</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {new Date(r.data_consulta).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-2.5">{r.paciente_nome ?? "—"}</td>
                    <td className="px-4 py-2.5">{r.servico_nome_snapshot ?? "Particular"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {r.modelo_aplicado}
                      {r.comissao_pct_aplicada != null && ` (${r.comissao_pct_aplicada}%)`}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{brl(r.valor_bruto_centavos)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">{brl(r.valor_plataforma_centavos)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold">{brl(r.valor_medico_centavos)}</td>
                    <td className="px-4 py-2.5">{statusBadge(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Os valores são calculados no momento da criação da consulta (snapshot imutável).
        Dúvidas sobre comissões? Fale com o administrador.
      </p>

      {/* Dialog de saque */}
      {medicoId && saldo && saqueConfig && (
        <SolicitarSaqueDialog
          open={saqueDialogOpen}
          onOpenChange={setSaqueDialogOpen}
          medicoId={medicoId}
          saldo={saldo}
          config={saqueConfig}
          onSuccess={carregarSaldo}
        />
      )}
    </div>
  );
}
