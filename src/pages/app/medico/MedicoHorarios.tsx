import { useEffect, useMemo, useState } from "react";
import { addDays, addWeeks, format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarIcon,
  Plus,
  Trash2,
  Database,
  Clock,
  Video,
  
  X,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSession } from "@/lib/session";
import {
  listSlotsDoMedico,
  criarSlotsEmLote,
  excluirSlot,
  excluirSlotsDoDia,
  getDuracaoSlotMedico,
  getMedicoAtual,
  type AgendaSlot,
  type FaixaHorario,
} from "@/lib/clinico";
import { supabase } from "@/integrations/supabase/client";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

type Modalidade = "online";

const DIAS_SEMANA = [
  { idx: 1, label: "Seg" },
  { idx: 2, label: "Ter" },
  { idx: 3, label: "Qua" },
  { idx: 4, label: "Qui" },
  { idx: 5, label: "Sex" },
  { idx: 6, label: "Sáb" },
  { idx: 0, label: "Dom" },
];

function statusLabel(s: AgendaSlot["status"]) {
  const m: Record<AgendaSlot["status"], { label: string; cls: string }> = {
    disponivel: { label: "Disponível", cls: "bg-success/10 text-success" },
    reservado: { label: "Reservado", cls: "bg-warning/10 text-warning" },
    bloqueado: { label: "Bloqueado", cls: "bg-muted text-muted-foreground" },
  };
  return m[s];
}

function fmtDataHora(iso: string) {
  return format(new Date(iso), "EEE, dd 'de' MMM · HH:mm", { locale: ptBR });
}

/** Agrupa slots por dia (chave: yyyy-MM-dd) */
function groupByDay(slots: AgendaSlot[]) {
  const map = new Map<string, AgendaSlot[]>();
  for (const s of slots) {
    const k = format(new Date(s.inicio), "yyyy-MM-dd");
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(s);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

type ServicoOpc = {
  id: string;
  nome: string;
  duracao_min: number;
  valor_paciente_centavos: number;
};

type EspecialidadeInfo = {
  nome: string;
  duracao_minutos: number;
  preco_centavos: number | null;
};

export default function MedicoHorarios() {
  const { session } = useSession();
  const [slots, setSlots] = useState<AgendaSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<AgendaSlot | null>(null);
  const [confirmDeleteDia, setConfirmDeleteDia] = useState<{ dia: string; disponiveis: number } | null>(null);
  const [duracao, setDuracao] = useState<number | null>(null);
  const [modalidade, setModalidade] = useState<Modalidade>("online");
  const [linkSala, setLinkSala] = useState<string | null>(null);
  const [tipoSlot, setTipoSlot] = useState<"particular" | "servico">("particular");
  const [servicosSel, setServicosSel] = useState<string[]>([]);
  const [servicosDisp, setServicosDisp] = useState<ServicoOpc[]>([]);
  const [espInfo, setEspInfo] = useState<EspecialidadeInfo | null>(null);

  // ── Aba semanal
  const [diasSel, setDiasSel] = useState<number[]>([1, 2, 3, 4, 5]);
  const [semanas, setSemanas] = useState(4);
  const [faixasSemana, setFaixasSemana] = useState<FaixaHorario[]>([
    { hi: "08:00", hf: "12:00" },
  ]);
  const [savingSemana, setSavingSemana] = useState(false);

  // ── Aba por dia
  const [dataSel, setDataSel] = useState<Date | undefined>();
  const [faixasDia, setFaixasDia] = useState<FaixaHorario[]>([
    { hi: "09:00", hf: "10:00" },
  ]);
  const [savingDia, setSavingDia] = useState(false);

  async function refresh() {
    setLoading(true);
    const [list, dur, med] = await Promise.all([
      listSlotsDoMedico(),
      getDuracaoSlotMedico(),
      getMedicoAtual(),
    ]);
    setSlots(list);
    setDuracao(dur);
    setLinkSala(med?.link_sala_padrao ?? null);
    // Especialidade do médico
    if (med?.id) {
      const { data: espRows } = await supabase
        .from("medico_especialidades")
        .select("especialidade_id, duracao_minutos, preco_centavos, rqe, ativo")
        .eq("medico_id", med.id)
        .eq("ativo", true)
        .limit(1);
      if (espRows && espRows.length > 0) {
        // Buscar nome da especialidade
        const { data: espNome } = await supabase
          .from("especialidades")
          .select("nome")
          .eq("id", espRows[0].especialidade_id)
          .maybeSingle();
        setEspInfo({
          nome: espNome?.nome ?? "Especialidade",
          duracao_minutos: espRows[0].duracao_minutos || 30,
          preco_centavos: espRows[0].preco_centavos,
        });
      } else {
        setEspInfo(null);
      }
      // Serviços aderidos pelo médico (status ativo)
      const { data: vinc } = await supabase
        .from("medico_servicos")
        .select("servico_id")
        .eq("medico_id", med.id)
        .eq("status", "ativo")
        .eq("ativo", true);
      const ids = (vinc ?? []).map((v: any) => v.servico_id);
      if (ids.length) {
        const { data: srv } = await supabase
          .from("servicos_financeiros")
          .select("id,nome,duracao_min,valor_paciente_centavos")
          .in("id", ids)
          .eq("ativo", true);
        setServicosDisp((srv ?? []) as ServicoOpc[]);
      } else {
        setServicosDisp([]);
      }
    }
    setLoading(false);
  }

  // Duração efetiva para modo particular
  const duracaoEfetiva = tipoSlot === "particular" ? duracao : null;

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  function toggleDia(idx: number) {
    setDiasSel((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]
    );
  }

  function setFaixa(
    list: FaixaHorario[],
    setter: (f: FaixaHorario[]) => void,
    i: number,
    patch: Partial<FaixaHorario>
  ) {
    setter(list.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }

  // Pré-cálculo dos dias gerados na aba semanal
  const datasSemana = useMemo(() => {
    if (diasSel.length === 0) return [];
    const out: Date[] = [];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const inicioSemana = startOfWeek(hoje, { weekStartsOn: 0 });
    for (let w = 0; w < semanas; w++) {
      for (let d = 0; d < 7; d++) {
        const dia = addDays(addWeeks(inicioSemana, w), d);
        if (dia < hoje) continue;
        if (diasSel.includes(dia.getDay())) out.push(dia);
      }
    }
    return out;
  }, [diasSel, semanas]);

  async function gerarSemanal() {
    if (tipoSlot === "particular" && !duracaoEfetiva) {
      toast.error("Configure uma especialidade com duração antes de gerar horários.");
      return;
    }
    if (tipoSlot === "servico" && servicosSel.length === 0) {
      toast.error("Selecione ao menos um serviço da plataforma.");
      return;
    }
    if (diasSel.length === 0) {
      toast.error("Selecione ao menos um dia da semana.");
      return;
    }
    if (faixasSemana.some((f) => !f.hi || !f.hf)) {
      toast.error("Preencha todas as faixas de horário.");
      return;
    }
    setSavingSemana(true);
    let totalCriados = 0;
    let totalPulados = 0;
    if (tipoSlot === "servico") {
      for (const srvId of servicosSel) {
        const srv = servicosDisp.find((s) => s.id === srvId);
        if (!srv) continue;
        const res = await criarSlotsEmLote({
          datas: datasSemana,
          faixas: faixasSemana,
          duracaoMin: srv.duracao_min,
          modalidade,
          servicoId: srvId,
        });
        if (res.ok) { totalCriados += res.criados; totalPulados += res.pulados; }
        else { toast.error(`Erro em ${srv.nome}: ${res.error}`); }
      }
    } else {
      const res = await criarSlotsEmLote({
        datas: datasSemana,
        faixas: faixasSemana,
        duracaoMin: duracaoEfetiva!,
        modalidade,
        servicoId: null,
      });
      if (!res.ok) { setSavingSemana(false); toast.error(res.error ?? "Não foi possível gerar."); return; }
      totalCriados = res.criados;
      totalPulados = res.pulados;
    }
    setSavingSemana(false);
    toast.success(
      `${totalCriados} horário(s) criado(s)` +
        (totalPulados > 0 ? ` · ${totalPulados} pulado(s) por conflito` : "")
    );
    refresh();
  }

  async function gerarDia() {
    if (tipoSlot === "particular" && !duracaoEfetiva) {
      toast.error("Configure uma especialidade com duração antes de gerar horários.");
      return;
    }
    if (tipoSlot === "servico" && servicosSel.length === 0) {
      toast.error("Selecione ao menos um serviço da plataforma.");
      return;
    }
    if (!dataSel) {
      toast.error("Selecione uma data no calendário.");
      return;
    }
    if (faixasDia.some((f) => !f.hi || !f.hf)) {
      toast.error("Preencha todas as faixas de horário.");
      return;
    }
    setSavingDia(true);
    let totalCriados = 0;
    let totalPulados = 0;
    if (tipoSlot === "servico") {
      for (const srvId of servicosSel) {
        const srv = servicosDisp.find((s) => s.id === srvId);
        if (!srv) continue;
        const res = await criarSlotsEmLote({
          datas: [dataSel],
          faixas: faixasDia,
          duracaoMin: srv.duracao_min,
          modalidade,
          servicoId: srvId,
        });
        if (res.ok) { totalCriados += res.criados; totalPulados += res.pulados; }
        else { toast.error(`Erro em ${srv.nome}: ${res.error}`); }
      }
    } else {
      const res = await criarSlotsEmLote({
        datas: [dataSel],
        faixas: faixasDia,
        duracaoMin: duracaoEfetiva!,
        modalidade,
        servicoId: null,
      });
      if (!res.ok) { setSavingDia(false); toast.error(res.error ?? "Não foi possível gerar."); return; }
      totalCriados = res.criados;
      totalPulados = res.pulados;
    }
    setSavingDia(false);
    toast.success(
      `${totalCriados} horário(s) criado(s)` +
        (totalPulados > 0 ? ` · ${totalPulados} pulado(s) por conflito` : "")
    );
    refresh();
  }



  async function onDelete() {
    if (!confirmDelete) return;
    const res = await excluirSlot(confirmDelete.id);
    setConfirmDelete(null);
    if (!res.ok) {
      toast.error(res.error ?? "Não foi possível excluir.");
      return;
    }
    toast.success("Horário removido.");
    refresh();
  }

  const devMode = !session;
  const grouped = groupByDay(slots);


  return (
    <div className="space-y-6">
      <PageHeader
        title="Meus horários"
        description="Configure sua disponibilidade e o sistema gera os slots automaticamente conforme a duração da consulta."
        actions={
          devMode ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning">
              <Info className="h-3 w-3" /> Visualização (sem login)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
              <Database className="h-3 w-3" /> Dados em tempo real
            </span>
          )
        }
      />

      {devMode && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-xs text-warning-foreground">
          <b>Modo visualização de dev:</b> você não está logado como médico. A tela é
          exibida pra inspecionar layout e fluxo, mas <b>gerar/excluir horários está
          desabilitado</b>. Faça login como médico aprovado para usar de verdade.
        </div>
      )}

      {/* Faixa de info de duração */}
      <div className="card-elevated flex items-center gap-3 p-4">
        <Clock className="h-5 w-5 text-primary" />
        <div className="flex-1 text-sm">
          {duracao ? (
            <>
              Duração de cada consulta:{" "}
              <span className="font-semibold">{duracao} minutos</span>
              <span className="text-muted-foreground">
                {" "}
                · definida pela sua especialidade
              </span>
            </>
          ) : (
            <span className="text-warning-foreground">
              Você ainda não tem especialidade com duração configurada. Configure em
              <span className="font-semibold"> Configurações</span> antes de cadastrar
              horários.
            </span>
          )}
        </div>
        <div className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-muted/40 px-3 text-xs text-muted-foreground">
          <Video className="h-3.5 w-3.5 text-primary" />
          Telemedicina (online)
        </div>
      </div>

      {/* Tipo de slot: Particular vs Serviço da plataforma */}
      <div className="card-elevated p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tipo de horário a gerar
        </p>
        <RadioGroup value={tipoSlot} onValueChange={(v) => { setTipoSlot(v as any); if (v === "particular") setServicosSel([]); }} className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="particular" id="t-part" />
            <span className="text-sm">Particular (preço/duração da sua especialidade)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="servico" id="t-srv" disabled={servicosDisp.length === 0} />
            <span className="text-sm">
              Serviço da plataforma {servicosDisp.length === 0 && <span className="text-xs text-muted-foreground">(adira em /app/medico/servicos)</span>}
            </span>
          </label>
        </RadioGroup>
        {tipoSlot === "servico" && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Selecione um ou mais serviços:</p>
            {servicosDisp.map((s) => (
              <label key={s.id} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 cursor-pointer hover:border-primary/40 transition">
                <Checkbox
                  checked={servicosSel.includes(s.id)}
                  onCheckedChange={(checked) => {
                    setServicosSel((prev) =>
                      checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)
                    );
                  }}
                />
                <span className="text-sm flex-1">
                  {s.nome} · <span className="text-muted-foreground">{s.duracao_min}min</span> · <span className="font-semibold">R$ {(s.valor_paciente_centavos / 100).toFixed(2)}</span>
                </span>
              </label>
            ))}
          </div>
        )}
        {tipoSlot === "servico" && servicosSel.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {servicosSel.length} serviço(s) selecionado(s). Slots serão criados para cada serviço com sua duração específica.
          </p>
        )}
        {tipoSlot === "particular" && espInfo && (
          <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Especialidade: <b className="text-foreground">{espInfo.nome}</b> · Duração: <b>{espInfo.duracao_minutos}min</b>
            {espInfo.preco_centavos != null && <> · Valor: <b>R$ {(espInfo.preco_centavos / 100).toFixed(2)}</b></>}
          </div>
        )}
        {tipoSlot === "particular" && !espInfo && !loading && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning-foreground">
            Nenhuma especialidade ativa configurada. <Link to="/app/medico/configuracoes" className="font-semibold text-primary hover:underline">Configurar agora →</Link>
          </div>
        )}
      </div>

      {session && modalidade === "online" && !linkSala && !loading && (
        <div className="card-elevated border-warning/40 bg-warning/5 p-4">
          <div className="flex items-start gap-3">
            <Video className="mt-0.5 h-5 w-5 text-warning shrink-0" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-warning-foreground">
                Configure o link da sala antes de criar horários online
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Toda consulta online precisa de um link de sala (Google Meet, Zoom, Jitsi…).
                Configure em <b>Meu perfil → Sala de atendimento online</b> e o link será enviado
                automaticamente ao paciente em cada consulta.
              </p>
              <Link
                to="/app/medico/perfil"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Ir para Meu perfil →
              </Link>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="semanal">
        <TabsList>
          <TabsTrigger value="semanal">Recorrência semanal</TabsTrigger>
          <TabsTrigger value="dia">Por dia</TabsTrigger>
        </TabsList>

        {/* ───── Aba semanal ───── */}
        <TabsContent value="semanal" className="mt-4">
          <div className="card-elevated space-y-5 p-5">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Dias da semana
              </p>
              <div className="flex flex-wrap gap-2">
                {DIAS_SEMANA.map((d) => {
                  const on = diasSel.includes(d.idx);
                  return (
                    <button
                      key={d.idx}
                      type="button"
                      onClick={() => toggleDia(d.idx)}
                      className={cn(
                        "h-9 min-w-[3.25rem] rounded-full px-4 text-sm font-medium transition",
                        on
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "border border-border bg-background text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Faixas de horário
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setFaixasSemana([...faixasSemana, { hi: "14:00", hf: "18:00" }])
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar faixa
                </Button>
              </div>
              <div className="space-y-2">
                {faixasSemana.map((f, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Início</Label>
                      <Input
                        type="time"
                        value={f.hi}
                        onChange={(e) =>
                          setFaixa(faixasSemana, setFaixasSemana, i, {
                            hi: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Fim</Label>
                      <Input
                        type="time"
                        value={f.hf}
                        onChange={(e) =>
                          setFaixa(faixasSemana, setFaixasSemana, i, {
                            hf: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={faixasSemana.length === 1}
                        onClick={() =>
                          setFaixasSemana(faixasSemana.filter((_, idx) => idx !== i))
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-[11px] text-muted-foreground">Repetir por</Label>
                <Select
                  value={String(semanas)}
                  onValueChange={(v) => setSemanas(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 semana</SelectItem>
                    <SelectItem value="2">2 semanas</SelectItem>
                    <SelectItem value="4">4 semanas</SelectItem>
                    <SelectItem value="8">8 semanas</SelectItem>
                    <SelectItem value="12">12 semanas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <div className="flex w-full items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5" />
                  Serão geradas datas em <b className="mx-1">{datasSemana.length}</b> dia(s)
                  {duracao ? ` · slots de ${duracao}min` : ""}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={gerarSemanal}
                disabled={savingSemana || (tipoSlot === "particular" && !duracao) || (tipoSlot === "servico" && servicosSel.length === 0) || devMode || (modalidade === "online" && !linkSala && !!session)}
                className="bg-gradient-primary hover:opacity-90"
              >
                {savingSemana ? "Gerando…" : "Gerar horários"}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ───── Aba por dia ───── */}
        <TabsContent value="dia" className="mt-4">
          <div className="card-elevated grid grid-cols-1 gap-5 p-5 lg:grid-cols-[auto_1fr]">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Selecione o dia
              </p>
              <div className="rounded-lg border border-border">
                <Calendar
                  mode="single"
                  selected={dataSel}
                  onSelect={setDataSel}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  locale={ptBR}
                  className={cn("p-3 pointer-events-auto")}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Faixas{" "}
                    {dataSel && (
                      <span className="ml-1 normal-case text-foreground">
                        · {format(dataSel, "EEEE, dd 'de' MMM", { locale: ptBR })}
                      </span>
                    )}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setFaixasDia([...faixasDia, { hi: "14:00", hf: "15:00" }])
                    }
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar faixa
                  </Button>
                </div>
                <div className="space-y-2">
                  {faixasDia.map((f, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Início</Label>
                        <Input
                          type="time"
                          value={f.hi}
                          onChange={(e) =>
                            setFaixa(faixasDia, setFaixasDia, i, { hi: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Fim</Label>
                        <Input
                          type="time"
                          value={f.hf}
                          onChange={(e) =>
                            setFaixa(faixasDia, setFaixasDia, i, { hf: e.target.value })
                          }
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          disabled={faixasDia.length === 1}
                          onClick={() =>
                            setFaixasDia(faixasDia.filter((_, idx) => idx !== i))
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                {duracao
                  ? `Cada faixa será dividida em slots de ${duracao} minutos.`
                  : "Configure uma especialidade com duração."}
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={gerarDia}
                  disabled={savingDia || !duracao || !dataSel || devMode || (modalidade === "online" && !linkSala && !!session)}
                  className="bg-gradient-primary hover:opacity-90"
                >
                  {savingDia ? "Gerando…" : "Adicionar ao dia"}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Lista de horários cadastrados */}
      <div>
        <h2 className="mb-3 text-sm font-semibold">Horários cadastrados</h2>
        <div className="card-elevated overflow-hidden">
          {loading && (
            <p className="p-10 text-center text-sm text-muted-foreground">Carregando…</p>
          )}
          {!loading && slots.length === 0 && (
            <div className="p-10 text-center">
              <CalendarIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-medium">Nenhum horário cadastrado</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Use as abas acima para gerar sua disponibilidade.
              </p>
            </div>
          )}
          {!loading && grouped.length > 0 && (
            <div className="divide-y divide-border">
              {grouped.map(([dia, items]) => {
                const disponiveis = items.filter((s) => s.status === "disponivel").length;
                return (
                <div key={dia} className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {format(new Date(dia + "T00:00:00"), "EEEE, dd 'de' MMMM", {
                        locale: ptBR,
                      })}
                    </p>
                    {disponiveis > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 text-xs"
                        onClick={() => setConfirmDeleteDia({ dia, disponiveis })}
                      >
                        <Trash2 className="mr-1 h-3 w-3" /> Excluir dia ({disponiveis})
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {items.map((s) => {
                      const st = statusLabel(s.status);
                      return (
                        <div
                          key={s.id}
                          className="group relative flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs"
                        >
                          <Video className="h-3 w-3 text-primary" />
                          <span className="font-medium">
                            {format(new Date(s.inicio), "HH:mm")}–
                            {format(new Date(s.fim), "HH:mm")}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                              st.cls
                            )}
                          >
                            {st.label}
                          </span>
                          <button
                            type="button"
                            disabled={s.status !== "disponivel"}
                            onClick={() => setConfirmDelete(s)}
                            className="ml-1 text-muted-foreground hover:text-destructive disabled:opacity-30"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dialog excluir slot individual */}
      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir horário?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete && (
                <>Esse slot ({fmtDataHora(confirmDelete.inicio)}) deixará de aparecer para os pacientes.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog excluir dia inteiro */}
      <AlertDialog
        open={!!confirmDeleteDia}
        onOpenChange={(o) => !o && setConfirmDeleteDia(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir todos os horários do dia?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDeleteDia && (
                <>
                  Serão removidos <b>{confirmDeleteDia.disponiveis}</b> horário(s) disponível(is) de{" "}
                  {format(new Date(confirmDeleteDia.dia + "T00:00:00"), "EEEE, dd 'de' MMMM", { locale: ptBR })}.
                  Horários reservados ou bloqueados não serão afetados.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmDeleteDia) return;
                const res = await excluirSlotsDoDia(confirmDeleteDia.dia);
                setConfirmDeleteDia(null);
                if (!res.ok) { toast.error(res.error ?? "Não foi possível excluir."); return; }
                toast.success(`${res.removidos} horário(s) removido(s).`);
                refresh();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir dia
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
