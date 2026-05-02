import { useEffect, useMemo, useState } from "react";
import { brl } from "@/lib/format";
import { Link } from "react-router-dom";
import {
  Activity,
  Loader2,
  Save,
  ExternalLink,
  Settings,
  DollarSign,
  Clock,
  Percent,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getServicoAtendimentoImediato,
  updateServicoAtendimentoImediato,
  broadcastAtendimentoImediatoConfigChanged,
  type AtendimentoImediatoConfig,
} from "@/lib/clinico";
import { RepasseSplitInput } from "@/components/financeiro/RepasseSplitInput";
import { fmtHora } from "@/lib/format";

type ElegivelRow = {
  id: string;
  nome: string;
  valor_paciente_centavos: number;
  duracao_min: number;
  medicos_ativos: number;
};



export default function AdminAtendimentoImediato() {
  const [loading, setLoading] = useState(true);
  const [cfg, setCfg] = useState<AtendimentoImediatoConfig | null>(null);
  const [elegiveis, setElegiveis] = useState<ElegivelRow[]>([]);
  const [savingVinculo, setSavingVinculo] = useState(false);

  // form parâmetros
  const [precoReais, setPrecoReais] = useState<number>(0);
  const [duracao, setDuracao] = useState<number>(30);
  const [savingParams, setSavingParams] = useState(false);

  // form repasse
  const [modelo, setModelo] = useState<"percentual" | "valor_fixo">("percentual");
  const [comissaoPct, setComissaoPct] = useState<number>(50);
  const [valorFixoReais, setValorFixoReais] = useState<number>(0);
  const [pctValid, setPctValid] = useState(true);
  const [savingRepasse, setSavingRepasse] = useState(false);

  async function load() {
    setLoading(true);
    const c = await getServicoAtendimentoImediato();
    setCfg(c);
    if (c) {
      setPrecoReais(c.preco_centavos / 100);
      setDuracao(c.duracao_min);
      setModelo(c.modelo);
      setComissaoPct(c.comissao_pct ?? 50);
      setValorFixoReais((c.valor_fixo_centavos ?? 0) / 100);
    }

    // serviços elegíveis (tipo PA, ativos, com >=1 médico aderido)
    const [{ data: svcs }, { data: ms }] = await Promise.all([
      supabase
        .from("servicos_financeiros")
        .select("id, nome, valor_paciente_centavos, duracao_min, ativo, tipo")
        .eq("ativo", true)
        .eq("tipo", "pronto_atendimento"),
      supabase
        .from("medico_servicos")
        .select("servico_id")
        .eq("ativo", true)
        .eq("status", "ativo"),
    ]);
    const counts: Record<string, number> = {};
    (ms ?? []).forEach((r: any) => (counts[r.servico_id] = (counts[r.servico_id] ?? 0) + 1));
    const lista: ElegivelRow[] = (svcs ?? [])
      .map((s: any) => ({
        id: s.id,
        nome: s.nome,
        valor_paciente_centavos: s.valor_paciente_centavos ?? 0,
        duracao_min: s.duracao_min ?? 30,
        medicos_ativos: counts[s.id] ?? 0,
      }))
      .filter((s) => s.medicos_ativos > 0);
    setElegiveis(lista);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function trocarVinculo(id: string | null) {
    setSavingVinculo(true);
    const { error } = await supabase
      .from("app_settings")
      .update({ value: id as any })
      .eq("key", "atendimento_imediato.servico_id");
    setSavingVinculo(false);
    if (error) return toast.error(error.message);
    toast.success(id ? "Serviço vinculado." : "Porta pública desativada.");
    broadcastAtendimentoImediatoConfigChanged();
    load();
  }

  async function salvarParams() {
    if (!cfg) return;
    if (precoReais <= 0) return toast.error("Preço inválido.");
    if (duracao <= 0 || duracao % 5 !== 0) return toast.error("Duração deve ser múltiplo de 5.");
    setSavingParams(true);
    const r = await updateServicoAtendimentoImediato(cfg.servico_id, {
      valor_paciente_centavos: Math.round(precoReais * 100),
      duracao_min: duracao,
    });
    setSavingParams(false);
    if (!r.ok) return toast.error(r.error ?? "Falha.");
    toast.success("Parâmetros atualizados — calendário será refeito.");
    broadcastAtendimentoImediatoConfigChanged();
    load();
  }

  async function salvarRepasse() {
    if (!cfg) return;
    if (modelo === "percentual" && !pctValid) return toast.error("Corrija o percentual.");
    if (modelo === "valor_fixo" && valorFixoReais * 100 > precoReais * 100)
      return toast.error("Valor fixo maior que o preço.");
    setSavingRepasse(true);
    const r = await updateServicoAtendimentoImediato(cfg.servico_id, {
      modelo,
      comissao_pct: modelo === "percentual" ? comissaoPct : null,
      valor_fixo_centavos: modelo === "valor_fixo" ? Math.round(valorFixoReais * 100) : null,
    });
    setSavingRepasse(false);
    if (!r.ok) return toast.error(r.error ?? "Falha.");
    toast.success("Repasse atualizado.");
    broadcastAtendimentoImediatoConfigChanged();
    load();
  }

  // Preview de repasse com os valores correntes do form
  const previewRepasse = useMemo(() => {
    const v = Math.round(precoReais * 100);
    if (modelo === "valor_fixo") {
      const m = Math.round(valorFixoReais * 100);
      return { medico: m, plataforma: Math.max(0, v - m) };
    }
    const m = Math.round((v * (comissaoPct ?? 0)) / 100);
    return { medico: m, plataforma: Math.max(0, v - m) };
  }, [precoReais, modelo, comissaoPct, valorFixoReais]);

  // Preview dos slots gerados com a duração corrente
  const previewSlots = useMemo(() => {
    const hoje = new Date();
    const result: { key: string; inicio: Date; fim: Date }[] = [];
    for (let offset = 0; offset < 6; offset++) {
      const inicio = new Date(hoje);
      inicio.setHours(8, 0, 0, 0);
      inicio.setMinutes(offset * duracao);
      const fim = new Date(inicio.getTime() + duracao * 60_000);
      result.push({ key: inicio.toISOString(), inicio, fim });
    }
    return result;
  }, [duracao]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <PageHeader
          title="Atendimento imediato"
          description="Edite preço, duração e repasse do serviço público de pronto atendimento. Mudanças refletem automaticamente no calendário compartilhado."
        />
        <Button asChild variant="outline" size="sm">
          <Link to="/app/admin/configuracoes">
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
          </Link>
        </Button>
      </div>

      {/* Cartão 1 — Vínculo */}
      <Card className="border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-emerald-600" /> Serviço vinculado à porta pública
          </CardTitle>
          <CardDescription>
            Apenas serviços ativos do tipo <code>pronto_atendimento</code> com pelo menos 1 médico aderido aparecem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={cfg?.servico_id ?? "none"}
              onValueChange={(v) => trocarVinculo(v === "none" ? null : v)}
              disabled={savingVinculo}
            >
              <SelectTrigger className="w-96">
                <SelectValue placeholder="Selecione um serviço" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Desativar porta pública —</SelectItem>
                {elegiveis.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome} · {brl(s.valor_paciente_centavos)} · {s.medicos_ativos} médico(s)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cfg && (
              <Button asChild variant="outline" size="sm">
                <a href="/atendimento-imediato" target="_blank" rel="noreferrer">
                  Abrir página pública <ExternalLink className="ml-1 h-3.5 w-3.5" />
                </a>
              </Button>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/admin/servicos">Gerenciar catálogo →</Link>
            </Button>
          </div>
          {elegiveis.length === 0 && (
            <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
              Nenhum serviço elegível. Crie um em <Link to="/app/admin/servicos" className="underline">Serviços</Link>.
            </p>
          )}
        </CardContent>
      </Card>

      {!cfg ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Selecione um serviço acima para editar preço, duração e repasse.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Cartão 2 — Parâmetros operacionais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4 text-primary" /> Parâmetros operacionais
              </CardTitle>
              <CardDescription>
                Preço único cobrado do paciente e duração de cada slot do calendário compartilhado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <DollarSign className="mr-1 inline h-3 w-3" /> Preço único (R$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={precoReais}
                    onChange={(e) => setPrecoReais(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm tabular-nums outline-none focus:border-primary"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Valor que o paciente paga por atendimento.
                  </p>
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Clock className="mr-1 inline h-3 w-3" /> Duração por slot (min)
                  </label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={duracao}
                    onChange={(e) => setDuracao(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm tabular-nums outline-none focus:border-primary"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Múltiplo de 5. Define o passo do calendário compartilhado.
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={salvarParams} disabled={savingParams}>
                  {savingParams ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvar parâmetros
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Cartão 3 — Repasse */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Percent className="h-4 w-4 text-primary" /> Repasse Médico × Plataforma
              </CardTitle>
              <CardDescription>
                Define como o valor pago é dividido entre médico e plataforma para cada atendimento imediato.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Modelo
                </span>
                <Select value={modelo} onValueChange={(v: any) => setModelo(v)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentual">Percentual</SelectItem>
                    <SelectItem value="valor_fixo">Valor fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {modelo === "percentual" ? (
                <RepasseSplitInput
                  medicoPct={comissaoPct}
                  onChange={setComissaoPct}
                  onValidityChange={setPctValid}
                />
              ) : (
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Valor fixo do médico (R$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={valorFixoReais}
                    onChange={(e) => setValorFixoReais(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm tabular-nums outline-none focus:border-primary md:w-72"
                  />
                </div>
              )}

              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Preview por atendimento de {brl(Math.round(precoReais * 100))}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md bg-card p-2">
                    <p className="text-[11px] text-muted-foreground">Médico recebe</p>
                    <p className="font-semibold tabular-nums">{brl(previewRepasse.medico)}</p>
                  </div>
                  <div className="rounded-md bg-card p-2">
                    <p className="text-[11px] text-muted-foreground">Plataforma fica com</p>
                    <p className="font-semibold tabular-nums">{brl(previewRepasse.plataforma)}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={salvarRepasse} disabled={savingRepasse}>
                  {savingRepasse ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvar repasse
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Validação no calendário */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reflexo no calendário compartilhado</CardTitle>
              <CardDescription>
                Próximos slots gerados com a duração de <strong>{duracao} min</strong> e preço de{" "}
                <strong>{brl(Math.round(precoReais * 100))}</strong>.{" "}
                <Link to="/atendimento-imediato" className="underline" target="_blank" rel="noreferrer">
                  Abrir página pública →
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {previewSlots.map((s) => (
                  <div
                    key={s.key}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold tabular-nums">
                        {fmtHora(s.inicio)} → {fmtHora(s.fim)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{duracao} min</p>
                    </div>
                    <Badge variant="secondary" className="tabular-nums">
                      {brl(Math.round(precoReais * 100))}
                    </Badge>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Mudanças aqui não alteram consultas já agendadas — apenas slots/atendimentos novos.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
