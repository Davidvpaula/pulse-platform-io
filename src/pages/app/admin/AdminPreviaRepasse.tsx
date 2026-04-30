import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  CalendarPlus,
  Download,
  Loader2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  getRegrasVigentes,
  listConsultasParticularesParaPrevia,
  listSlotsParticularesFuturosParaPrevia,
  resolverPctMedicoVigente,
  simularRepasse,
  type ConsultaPreviaRow,
  type RegraSimulada,
  type RegrasVigentes,
  type SlotFuturoPreviaRow,
  type StatusConsultaPrevia,
} from "@/lib/financeiroPrevia";
import {
  PreviaRepasseSimuladorForm,
  type MedicoLite,
} from "@/components/financeiro/PreviaRepasseSimuladorForm";
import { PreviaRepasseTabela } from "@/components/financeiro/PreviaRepasseTabela";

type Periodo = "30d" | "60d" | "90d" | "futuro" | "tudo";

const STATUS_OPCOES: { value: StatusConsultaPrevia; label: string }[] = [
  { value: "agendada", label: "Agendada" },
  { value: "aguardando_pagamento", label: "Aguardando pagamento" },
  { value: "confirmada", label: "Confirmada" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "cancelada", label: "Cancelada" },
  { value: "no_show", label: "No-show" },
];

const fmtBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function AdminPreviaRepasse() {
  const [aba, setAba] = useState<"consultas" | "slots">("consultas");
  const [loading, setLoading] = useState(true);
  const [regras, setRegras] = useState<RegrasVigentes | null>(null);
  const [consultas, setConsultas] = useState<ConsultaPreviaRow[]>([]);
  const [slots, setSlots] = useState<SlotFuturoPreviaRow[]>([]);

  // filtros
  const [periodo, setPeriodo] = useState<Periodo>("futuro");
  const [statusFiltro, setStatusFiltro] = useState<"todos" | StatusConsultaPrevia>(
    "todos",
  );
  const [busca, setBusca] = useState("");

  // simulação
  const [simulada, setSimulada] = useState<RegraSimulada>({ tipo: "vigente" });

  const filtrosConsultas = useMemo(() => {
    const agora = new Date();
    const desde = new Date(agora);
    let dDesde: string | null = null;
    let dAte: string | null = null;
    if (periodo === "30d") {
      desde.setDate(desde.getDate() - 30);
      dDesde = desde.toISOString();
    } else if (periodo === "60d") {
      desde.setDate(desde.getDate() - 60);
      dDesde = desde.toISOString();
    } else if (periodo === "90d") {
      desde.setDate(desde.getDate() - 90);
      dDesde = desde.toISOString();
    } else if (periodo === "futuro") {
      dDesde = agora.toISOString();
    }
    return { desde: dDesde, ate: dAte };
  }, [periodo]);

  // carga inicial: regras vigentes
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = await getRegrasVigentes();
        if (!cancel) setRegras(r);
      } catch (e: any) {
        toast.error("Erro ao carregar regras vigentes", { description: e?.message });
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  // recarga ao mudar filtros / aba
  useEffect(() => {
    let cancel = false;
    setLoading(true);
    (async () => {
      try {
        if (aba === "consultas") {
          const data = await listConsultasParticularesParaPrevia({
            desde: filtrosConsultas.desde,
            ate: filtrosConsultas.ate,
            status:
              statusFiltro === "todos"
                ? null
                : ([statusFiltro] as StatusConsultaPrevia[]),
            limit: 200,
          });
          if (!cancel) setConsultas(data);
        } else {
          const data = await listSlotsParticularesFuturosParaPrevia({
            desde: filtrosConsultas.desde ?? new Date().toISOString(),
            ate: filtrosConsultas.ate,
            limit: 200,
          });
          if (!cancel) setSlots(data);
        }
      } catch (e: any) {
        toast.error("Erro ao carregar dados", { description: e?.message });
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [aba, filtrosConsultas, statusFiltro]);

  // Médicos disponíveis para simular exceção (a partir das linhas atuais)
  const medicosLista: MedicoLite[] = useMemo(() => {
    const map = new Map<string, string>();
    if (aba === "consultas") {
      consultas.forEach((c) => {
        if (!map.has(c.medico_id)) map.set(c.medico_id, c.medico_nome ?? c.medico_id.slice(0, 6));
      });
    } else {
      slots.forEach((s) => {
        if (!map.has(s.medico_id)) map.set(s.medico_id, s.medico_nome ?? s.medico_id.slice(0, 6));
      });
    }
    return Array.from(map.entries())
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [aba, consultas, slots]);

  // Filtragem por busca (cliente)
  const consultasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return consultas;
    return consultas.filter((c) => (c.medico_nome ?? "").toLowerCase().includes(termo));
  }, [consultas, busca]);
  const slotsFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return slots;
    return slots.filter((s) => (s.medico_nome ?? "").toLowerCase().includes(termo));
  }, [slots, busca]);

  // Resumo
  const resumo = useMemo(() => {
    if (!regras) return { n: 0, atual: 0, simulado: 0, delta: 0 };
    if (aba === "consultas") {
      let atual = 0;
      let simuladoTotal = 0;
      for (const c of consultasFiltradas) {
        const pctAtual =
          c.pct_medico_snapshot ??
          resolverPctMedicoVigente(c.medico_id, regras).pct;
        const valorAtual =
          c.valor_medico_snapshot_centavos ??
          Math.round((c.valor_centavos * pctAtual) / 100);
        const sim = simularRepasse(c.valor_centavos, c.medico_id, regras, simulada);
        atual += valorAtual;
        simuladoTotal += sim.valorMedicoCentavos;
      }
      return {
        n: consultasFiltradas.length,
        atual,
        simulado: simuladoTotal,
        delta: simuladoTotal - atual,
      };
    } else {
      let vig = 0;
      let simuladoTotal = 0;
      for (const s of slotsFiltrados) {
        const v = resolverPctMedicoVigente(s.medico_id, regras).pct;
        vig += Math.round((s.preco_centavos * v) / 100);
        const sim = simularRepasse(s.preco_centavos, s.medico_id, regras, simulada);
        simuladoTotal += sim.valorMedicoCentavos;
      }
      return {
        n: slotsFiltrados.length,
        atual: vig,
        simulado: simuladoTotal,
        delta: simuladoTotal - vig,
      };
    }
  }, [regras, aba, consultasFiltradas, slotsFiltrados, simulada]);

  function exportarCsv() {
    if (!regras) return;
    const linhas: string[] = [];
    if (aba === "consultas") {
      linhas.push(
        [
          "data",
          "medico",
          "status",
          "valor",
          "pct_atual",
          "medico_atual",
          "pct_simulado",
          "medico_simulado",
          "delta",
          "origem",
        ].join(";"),
      );
      for (const c of consultasFiltradas) {
        const pctAtual =
          c.pct_medico_snapshot ??
          resolverPctMedicoVigente(c.medico_id, regras).pct;
        const atual =
          c.valor_medico_snapshot_centavos ??
          Math.round((c.valor_centavos * pctAtual) / 100);
        const sim = simularRepasse(c.valor_centavos, c.medico_id, regras, simulada);
        linhas.push(
          [
            c.inicio,
            (c.medico_nome ?? "").replace(/;/g, ","),
            c.status,
            (c.valor_centavos / 100).toFixed(2),
            pctAtual.toFixed(2),
            (atual / 100).toFixed(2),
            sim.pctMedico.toFixed(2),
            (sim.valorMedicoCentavos / 100).toFixed(2),
            ((sim.valorMedicoCentavos - atual) / 100).toFixed(2),
            sim.origem,
          ].join(";"),
        );
      }
    } else {
      linhas.push(
        [
          "inicio",
          "medico",
          "preco_base",
          "pct_vigente",
          "medico_vigente",
          "pct_simulado",
          "medico_simulado",
          "delta",
          "origem",
        ].join(";"),
      );
      for (const s of slotsFiltrados) {
        const v = resolverPctMedicoVigente(s.medico_id, regras).pct;
        const vig = Math.round((s.preco_centavos * v) / 100);
        const sim = simularRepasse(s.preco_centavos, s.medico_id, regras, simulada);
        linhas.push(
          [
            s.inicio,
            (s.medico_nome ?? "").replace(/;/g, ","),
            (s.preco_centavos / 100).toFixed(2),
            v.toFixed(2),
            (vig / 100).toFixed(2),
            sim.pctMedico.toFixed(2),
            (sim.valorMedicoCentavos / 100).toFixed(2),
            ((sim.valorMedicoCentavos - vig) / 100).toFixed(2),
            sim.origem,
          ].join(";"),
        );
      }
    }
    const blob = new Blob(["\ufeff" + linhas.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `previa-repasse-${aba}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prévia de impacto do repasse"
        description="Simule alterações no repasse e veja o impacto em consultas particulares já agendadas e em slots futuros. Esta tela é somente leitura — nada é alterado no banco."
      />

      <div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/app/admin/financeiro/repasse">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Voltar para configuração
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs">Período</Label>
                  <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="futuro">A partir de hoje</SelectItem>
                      <SelectItem value="30d">Últimos 30 dias</SelectItem>
                      <SelectItem value="60d">Últimos 60 dias</SelectItem>
                      <SelectItem value="90d">Últimos 90 dias</SelectItem>
                      <SelectItem value="tudo">Tudo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {aba === "consultas" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={statusFiltro}
                      onValueChange={(v) =>
                        setStatusFiltro(v as "todos" | StatusConsultaPrevia)
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {STATUS_OPCOES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">Buscar médico</Label>
                  <Input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Nome do médico…"
                    className="h-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resumo */}
          <Card className="bg-gradient-to-r from-primary/5 via-background to-background">
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-4">
                <ResumoItem icon={Sparkles} label="Itens" valor={String(resumo.n)} />
                <ResumoItem
                  icon={CalendarClock}
                  label={aba === "consultas" ? "Soma médico (atual)" : "Soma médico (vigente)"}
                  valor={fmtBRL(resumo.atual)}
                />
                <ResumoItem
                  icon={CalendarPlus}
                  label="Soma médico (simulado)"
                  valor={fmtBRL(resumo.simulado)}
                />
                <ResumoItem
                  icon={TrendingUp}
                  label="Diferença total"
                  valor={`${resumo.delta > 0 ? "+" : ""}${fmtBRL(resumo.delta)}`}
                  destaque={
                    resumo.delta > 0
                      ? "positivo"
                      : resumo.delta < 0
                      ? "negativo"
                      : "neutro"
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Abas + tabela */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
              <CardTitle className="text-base">Comparativo</CardTitle>
              <Button variant="outline" size="sm" onClick={exportarCsv} disabled={!regras}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Tabs value={aba} onValueChange={(v) => setAba(v as "consultas" | "slots")}>
                <TabsList className="mb-4">
                  <TabsTrigger value="consultas">Já agendadas</TabsTrigger>
                  <TabsTrigger value="slots">Novas (slots futuros)</TabsTrigger>
                </TabsList>

                {loading || !regras ? (
                  <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
                  </div>
                ) : (
                  <>
                    <TabsContent value="consultas" className="mt-0">
                      <p className="mb-3 text-xs text-muted-foreground">
                        O snapshot financeiro é imutável: alterar o repasse global ou criar
                        uma exceção <strong>não recalcula</strong> consultas já criadas. As
                        colunas "atual" mostram o valor real que o médico vai receber; as
                        "simulado" indicam o que <em>seria</em> caso a regra simulada fosse
                        aplicada.
                      </p>
                      <PreviaRepasseTabela
                        modo="consultas"
                        rows={consultasFiltradas}
                        regrasVigentes={regras}
                        simulada={simulada}
                      />
                    </TabsContent>
                    <TabsContent value="slots" className="mt-0">
                      <p className="mb-3 text-xs text-muted-foreground">
                        Estes slots ainda não viraram consulta. Quando forem agendados,
                        adotarão a regra que estiver vigente no momento. Use a simulação para
                        prever o impacto nas próximas consultas.
                      </p>
                      <PreviaRepasseTabela
                        modo="slots"
                        rows={slotsFiltrados}
                        regrasVigentes={regras}
                        simulada={simulada}
                      />
                    </TabsContent>
                  </>
                )}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Coluna lateral: simulador */}
        <div className="space-y-4">
          {regras && (
            <PreviaRepasseSimuladorForm
              vigenteGlobalPctMedico={regras.globalPctMedico}
              medicos={medicosLista}
              value={simulada}
              onChange={setSimulada}
            />
          )}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Como ler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>
                <strong>Já agendadas</strong>: mostram o snapshot imutável que será pago
                ao médico, comparado a quanto seria se a regra simulada estivesse vigente
                quando a consulta foi criada.
              </p>
              <p>
                <strong>Novas (slots)</strong>: estima o valor que o médico receberia se
                cada slot fosse agendado agora com as regras simuladas.
              </p>
              <p>
                Esta tela <strong>não grava nada</strong> no banco — é apenas uma
                projeção.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ResumoItem({
  icon: Icon,
  label,
  valor,
  destaque,
}: {
  icon: typeof Sparkles;
  label: string;
  valor: string;
  destaque?: "positivo" | "negativo" | "neutro";
}) {
  const cor =
    destaque === "positivo"
      ? "text-emerald-600"
      : destaque === "negativo"
      ? "text-destructive"
      : "text-foreground";
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className={`text-lg font-semibold tabular-nums ${cor}`}>{valor}</div>
    </div>
  );
}
