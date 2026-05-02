import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, FileText, AlertTriangle, XCircle, Clock, Users,
  Wallet, TrendingUp, CalendarDays, Info, Loader2, ShieldAlert,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ─── Helpers ─── */
const brl = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "—";
const fmtDateTime = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString("pt-BR") : "—";

const MODELO_LABEL: Record<string, string> = {
  por_consulta: "Cobrança por consulta realizada",
  por_colaborador: "Cobrança fixa por colaborador/mês",
  plano_mensal: "Plano mensal fixo",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ativo: "default",
  rascunho: "secondary",
  suspenso: "destructive",
  encerrado: "outline",
};

type Contrato = {
  id: string;
  empresa_id: string;
  status: string;
  modelo_financeiro: string;
  data_inicio: string | null;
  data_fim: string | null;
  data_renovacao: string | null;
  valor_colaborador_centavos: number;
  valor_consulta_centavos: number;
  plano_mensal_centavos: number;
  limite_consultas_mes: number | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  razao_social: string;
  plano_nome: string | null;
};

type AuditoriaEntry = {
  id: string;
  acao: string;
  campo: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  motivo: string | null;
  observacao: string | null;
  created_at: string;
};

export default function AdminContratoDetalhes() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [auditoria, setAuditoria] = useState<AuditoriaEntry[]>([]);
  const [qtdFuncionarios, setQtdFuncionarios] = useState(0);

  useEffect(() => {
    if (id) carregarDados(id);
  }, [id]);

  async function carregarDados(contratoId: string) {
    setLoading(true);
    try {
      const { data: c, error } = await supabase
        .from("empresas_contratos")
        .select("*, empresas(razao_social), planos(nome)")
        .eq("id", contratoId)
        .single();

      if (error || !c) {
        toast.error("Contrato não encontrado");
        return;
      }

      const mapped: Contrato = {
        id: c.id,
        empresa_id: c.empresa_id,
        status: c.status ?? "rascunho",
        modelo_financeiro: c.modelo_financeiro ?? "por_consulta",
        data_inicio: c.data_inicio,
        data_fim: c.data_fim,
        data_renovacao: c.data_renovacao,
        valor_colaborador_centavos: c.valor_colaborador_centavos ?? 0,
        valor_consulta_centavos: c.valor_consulta_centavos ?? 0,
        plano_mensal_centavos: c.plano_mensal_centavos ?? 0,
        limite_consultas_mes: c.limite_consultas_mes,
        observacoes: c.observacoes,
        created_at: c.created_at,
        updated_at: c.updated_at,
        razao_social: (c as any).empresas?.razao_social ?? "—",
        plano_nome: (c as any).planos?.nome ?? null,
      };
      setContrato(mapped);

      // Fetch audit history
      const { data: audData } = await supabase
        .from("empresas_auditoria")
        .select("id, acao, campo, valor_anterior, valor_novo, motivo, observacao, created_at")
        .eq("empresa_id", c.empresa_id)
        .order("created_at", { ascending: false })
        .limit(50);
      setAuditoria(audData ?? []);

      // Fetch employee count
      const { count } = await supabase
        .from("empresas_funcionarios")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", c.empresa_id)
        .eq("ativo", true);
      setQtdFuncionarios(count ?? 0);
    } catch (e: any) {
      toast.error("Erro ao carregar contrato", { description: e.message });
    } finally {
      setLoading(false);
    }
  }

  /* ─── Alertas ─── */
  const alertas = useMemo(() => {
    if (!contrato) return [];
    const list: { tipo: "warning" | "danger" | "info"; icon: typeof AlertTriangle; msg: string }[] = [];
    const hoje = new Date();
    const in30d = new Date();
    in30d.setDate(in30d.getDate() + 30);

    if (contrato.status === "suspenso") {
      list.push({ tipo: "info", icon: ShieldAlert, msg: "Contrato suspenso — funcionalidades B2B bloqueadas." });
    }
    if (contrato.status === "encerrado") {
      list.push({ tipo: "info", icon: XCircle, msg: "Contrato encerrado." });
    }
    if (contrato.data_fim) {
      const fim = new Date(contrato.data_fim);
      if (fim < hoje) {
        list.push({ tipo: "danger", icon: AlertTriangle, msg: `Contrato vencido em ${fmtDate(contrato.data_fim)}.` });
      } else if (fim <= in30d) {
        list.push({ tipo: "warning", icon: Clock, msg: `Contrato vence em ${fmtDate(contrato.data_fim)} — renove em breve.` });
      }
    }
    if (contrato.limite_consultas_mes && qtdFuncionarios > contrato.limite_consultas_mes) {
      list.push({
        tipo: "danger",
        icon: TrendingUp,
        msg: `Uso acima do limite: ${qtdFuncionarios} funcionários para ${contrato.limite_consultas_mes} consultas/mês.`,
      });
    }
    return list;
  }, [contrato, qtdFuncionarios]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contrato) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Contrato não encontrado.</p>
        <Button asChild variant="outline">
          <Link to="/app/admin/gestao-b2b"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Link>
        </Button>
      </div>
    );
  }

  const usoPct = contrato.limite_consultas_mes
    ? Math.min(100, Math.round((qtdFuncionarios / contrato.limite_consultas_mes) * 100))
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={contrato.razao_social}
        description="Detalhes do contrato B2B"
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[contrato.status] ?? "outline"} className="capitalize text-sm px-3 py-1">
              {contrato.status}
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link to="/app/admin/gestao-b2b"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Link>
            </Button>
          </div>
        }
      />

      {/* ─── Alertas ─── */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((a, i) => {
            const Icon = a.icon;
            const borderColor = a.tipo === "danger" ? "border-destructive/30 bg-destructive/5" : a.tipo === "warning" ? "border-warning/30 bg-warning/5" : "border-muted bg-muted/30";
            const iconColor = a.tipo === "danger" ? "text-destructive" : a.tipo === "warning" ? "text-warning" : "text-muted-foreground";
            return (
              <div key={i} className={`flex items-start gap-3 rounded-lg border p-4 ${borderColor}`}>
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
                <p className="text-sm">{a.msg}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Dados do Contrato ─── */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" /> Dados do Contrato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Modelo financeiro" value={MODELO_LABEL[contrato.modelo_financeiro] ?? contrato.modelo_financeiro} />
            {contrato.plano_mensal_centavos > 0 && <Row label="Valor mensal" value={brl(contrato.plano_mensal_centavos)} />}
            {contrato.valor_consulta_centavos > 0 && <Row label="Valor por consulta" value={brl(contrato.valor_consulta_centavos)} />}
            {contrato.valor_colaborador_centavos > 0 && <Row label="Valor por colaborador" value={brl(contrato.valor_colaborador_centavos)} />}
            <Row label="Início" value={fmtDate(contrato.data_inicio)} />
            <Row label="Fim" value={fmtDate(contrato.data_fim)} />
            <Row label="Renovação" value={fmtDate(contrato.data_renovacao)} />
            {contrato.plano_nome && <Row label="Plano vinculado" value={contrato.plano_nome} />}
            <Row label="Criado em" value={fmtDateTime(contrato.created_at)} />
            {contrato.observacoes && (
              <div className="pt-2 border-t border-border">
                <span className="text-muted-foreground">Observações:</span>
                <p className="mt-1 whitespace-pre-wrap">{contrato.observacoes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Regras de Uso do Plano ─── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4" /> Regras de Uso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Funcionários ativos: <strong>{qtdFuncionarios}</strong></span>
            </div>

            {contrato.limite_consultas_mes != null && contrato.limite_consultas_mes > 0 ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uso de consultas/mês</span>
                  <span className="font-medium">{qtdFuncionarios}/{contrato.limite_consultas_mes}</span>
                </div>
                <Progress value={usoPct} className={usoPct > 100 ? "[&>div]:bg-destructive" : ""} />
                <p className="text-xs text-muted-foreground">
                  {usoPct >= 100
                    ? "⚠️ Limite excedido — considere renegociar o contrato."
                    : usoPct >= 80
                      ? "Uso próximo do limite."
                      : "Dentro do limite contratado."}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">Sem limite de consultas definido.</p>
            )}

            <div className="pt-2 border-t border-border space-y-2">
              <p className="text-muted-foreground font-medium">Modelo de cobrança</p>
              <div className="flex items-start gap-2">
                <Wallet className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <span>{MODELO_LABEL[contrato.modelo_financeiro] ?? contrato.modelo_financeiro}</span>
              </div>
              {contrato.modelo_financeiro === "por_consulta" && (
                <p className="text-xs text-muted-foreground ml-6">
                  Cada consulta realizada é cobrada pelo valor unitário de {brl(contrato.valor_consulta_centavos)}.
                </p>
              )}
              {contrato.modelo_financeiro === "por_colaborador" && (
                <p className="text-xs text-muted-foreground ml-6">
                  Cada colaborador ativo é cobrado {brl(contrato.valor_colaborador_centavos)}/mês.
                </p>
              )}
              {contrato.modelo_financeiro === "plano_mensal" && (
                <p className="text-xs text-muted-foreground ml-6">
                  Valor fixo mensal de {brl(contrato.plano_mensal_centavos)}, independente do uso.
                </p>
              )}
            </div>

            {contrato.data_renovacao && (
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span>Próxima renovação: <strong>{fmtDate(contrato.data_renovacao)}</strong></span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Histórico de Alterações ─── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" /> Histórico de Alterações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {auditoria.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhum registro de auditoria encontrado.</p>
          ) : (
            <div className="relative border-l-2 border-border ml-3 space-y-4 py-2">
              {auditoria.map((entry) => (
                <div key={entry.id} className="relative pl-6">
                  <div className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-primary bg-background" />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">{fmtDateTime(entry.created_at)}</span>
                      <Badge variant="outline" className="text-xs capitalize">{entry.acao}</Badge>
                      {entry.campo && (
                        <span className="text-xs font-medium text-foreground">{entry.campo}</span>
                      )}
                    </div>
                    {(entry.valor_anterior || entry.valor_novo) && (
                      <p className="text-sm">
                        {entry.valor_anterior && (
                          <span className="line-through text-muted-foreground mr-2">{entry.valor_anterior}</span>
                        )}
                        {entry.valor_novo && (
                          <span className="text-foreground font-medium">→ {entry.valor_novo}</span>
                        )}
                      </p>
                    )}
                    {entry.motivo && <p className="text-xs text-muted-foreground">Motivo: {entry.motivo}</p>}
                    {entry.observacao && <p className="text-xs text-muted-foreground italic">{entry.observacao}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Tiny row component ─── */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
