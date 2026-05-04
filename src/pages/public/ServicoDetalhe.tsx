import { useEffect, useMemo, useState, useCallback } from "react";
import { brl, fmtHora, dataLabel } from "@/lib/format";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Users, Info, Activity, Calendar, ChevronLeft, ChevronRight, User, ShieldCheck, ArrowLeft } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import CalendarioFila from "@/components/atendimento-imediato/CalendarioFila";
import RodapeReserva from "@/components/atendimento-imediato/RodapeReserva";
import type { SlotEstado } from "@/components/atendimento-imediato/SlotCelula";
import type { PASlot, PAReserva } from "@/lib/pa-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { criarCheckoutSession, abrirCheckout } from "@/lib/pagamentos";
import { getPacienteAtual } from "@/lib/clinico";
import { maskCpf } from "@/lib/validation/cpf";

type Servico = {
  id: string;
  nome: string;
  descricao_publica: string | null;
  duracao_min: number;
  valor_paciente_centavos: number;
};

const TTL_MS_DEFAULT = 10 * 60 * 1000;

function dataKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

const onlyDigits = (s: string) => s.replace(/\D/g, "");
const maskFone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
};
const maskCEP = (v: string) =>
  onlyDigits(v).slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");

type Step = "slots" | "formulario";

export default function ServicoDetalhe() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [servico, setServico] = useState<Servico | null>(null);
  const [slots, setSlots] = useState<PASlot[]>([]);
  const [reserva, setReserva] = useState<PAReserva | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  const [destacar, setDestacar] = useState<string | null>(null);
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("slots");
  const [submitting, setSubmitting] = useState(false);

  // Patient form fields
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataNasc, setDataNasc] = useState("");
  const [sexo, setSexo] = useState("nao_informado");
  const [cep, setCep] = useState("");
  const [motivo, setMotivo] = useState("");

  // Load service
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: s } = await (supabase as any)
        .from("servicos_publicos")
        .select("id,nome,descricao_publica,duracao_min,valor_paciente_centavos,ativo")
        .eq("slug", slug)
        .maybeSingle();
      if (!s || !(s as any).ativo) {
        setLoading(false);
        return;
      }

      const { data: paCfg } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "atendimento_imediato.servico_id")
        .maybeSingle();
      const paId = (paCfg?.value as string | null) ?? null;
      if (paId === s.id) {
        navigate("/atendimento-imediato", { replace: true });
        return;
      }

      setServico(s as Servico);
      setLoading(false);
    })();
  }, [slug, navigate]);

  // Pre-fill patient data
  useEffect(() => {
    if (!session) return;
    getPacienteAtual().then((p) => {
      if (p) {
        setNome(p.nome_completo ?? "");
        setCpf(p.cpf ? maskCpf(p.cpf) : "");
        setTelefone(p.telefone ? maskFone(p.telefone) : "");
        setDataNasc(p.data_nascimento ?? "");
        setSexo(p.sexo ?? "nao_informado");
        setCep(p.cep ? maskCEP(p.cep) : "");
      }
    });
  }, [session]);

  // Load slots
  const carregarSlots = useCallback(async () => {
    if (!servico) return;
    const { data, error } = await supabase.rpc("fn_servico_slots_disponiveis" as any, {
      _servico_id: servico.id,
      _data: new Date().toISOString().slice(0, 10),
    });
    if (error) {
      console.error("Erro ao carregar slots:", error);
      setSlots([]);
    } else {
      const agrupado = new Map<string, PASlot>();
      for (const row of (data ?? []) as any[]) {
        const key = row.inicio;
        if (!agrupado.has(key)) {
          agrupado.set(key, {
            key,
            slot_id: row.slot_id,
            inicio: new Date(row.inicio),
            fim: new Date(row.fim),
            medico_id: row.medico_id,
            total_vagas: Number(row.total_vagas),
          });
        }
      }
      const sorted = Array.from(agrupado.values()).sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
      setSlots(sorted);
      if (sorted.length > 0 && !diaSelecionado) {
        setDiaSelecionado(dataKey(sorted[0].inicio));
      }
    }
  }, [servico, diaSelecionado]);

  useEffect(() => {
    if (!servico) return;
    carregarSlots();
    const interval = setInterval(carregarSlots, 15_000);
    return () => clearInterval(interval);
  }, [servico, carregarSlots]);

  // Expiration tick
  useEffect(() => {
    const t = setInterval(() => {
      setAgora(Date.now());
      setReserva((prev) => {
        if (prev && prev.expiresAt <= Date.now()) {
          toast.message("Reserva expirou", {
            description: `O horário ${fmtHora(prev.inicio)} foi liberado.`,
          });
          setStep("slots");
          carregarSlots();
          return null;
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [carregarSlots]);

  // Group slots by date
  const diasComSlots = useMemo(() => {
    const map = new Map<string, PASlot[]>();
    for (const s of slots) {
      const dk = dataKey(s.inicio);
      if (!map.has(dk)) map.set(dk, []);
      map.get(dk)!.push(s);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [slots]);

  const slotsNoDia = useMemo(() => {
    if (!diaSelecionado) return [];
    return slots.filter((s) => dataKey(s.inicio) === diaSelecionado);
  }, [slots, diaSelecionado]);

  const estadoPorSlot = useMemo(() => {
    const map = new Map<string, { estado: SlotEstado; vagas: number; capacidade: number }>();
    for (const s of slotsNoDia) {
      const fimMs = s.fim.getTime();
      const inicioMs = s.inicio.getTime();
      const minhaAqui = reserva?.slot_key === s.key && reserva.expiresAt > agora;

      let estado: SlotEstado;
      if (fimMs < agora) estado = "passado";
      else if ((s.total_vagas ?? 0) === 0) estado = "lotado";
      else if (minhaAqui) estado = "reservado_por_mim";
      else if (inicioMs <= agora && agora < fimMs) estado = "em_atendimento";
      else estado = "livre";

      map.set(s.key, { estado, vagas: s.total_vagas ?? 0, capacidade: s.total_vagas ?? 0 });
    }
    return map;
  }, [slotsNoDia, reserva, agora]);

  async function reservar(slot: PASlot) {
    if (!session) {
      toast.error("Faça login para reservar um horário.");
      navigate("/auth");
      return;
    }
    if (!servico) return;

    const { data, error } = await supabase.rpc("fn_servico_reservar_slot" as any, {
      _slot_inicio: slot.key,
      _servico_id: servico.id,
    });

    if (error) {
      toast.error("Erro de conexão ao reservar.", { description: error.message });
      carregarSlots();
      return;
    }
    if (!(data as any)?.ok) {
      toast.error((data as any)?.erro || "Erro ao reservar. Tente novamente.");
      carregarSlots();
      return;
    }

    const res = data as any;
    setReserva({
      slot_id: res.slot_id,
      slot_key: res.inicio,
      medico_id: res.medico_id,
      medico_nome: res.medico_nome,
      inicio: res.inicio,
      fim: res.fim,
      expiresAt: res.reserva_expira_em ? new Date(res.reserva_expira_em).getTime() : Date.now() + TTL_MS_DEFAULT,
    });
    setDestacar(res.inicio);
    setTimeout(() => setDestacar(null), 3000);
    carregarSlots();

    if (res.transferido) {
      toast.warning("Horário trocado automaticamente", {
        description: `O horário pedido foi ocupado. Alocamos ${fmtHora(res.inicio)} com Dr(a). ${res.medico_nome}.`,
      });
    } else {
      toast.success(`Reservado ${fmtHora(res.inicio)} com Dr(a). ${res.medico_nome}`, {
        description: "Você tem 10 minutos para confirmar.",
      });
    }
  }

  function cancelar() {
    setReserva(null);
    setStep("slots");
    carregarSlots();
    toast.message("Reserva liberada");
  }

  function irParaFormulario() {
    setStep("formulario");
  }

  async function confirmarEPagar() {
    if (!reserva || !servico) return;

    const erros: string[] = [];
    if (!nome.trim() || nome.trim().split(/\s+/).length < 2) erros.push("Nome completo (nome e sobrenome)");
    if (onlyDigits(cpf).length !== 11) erros.push("CPF válido");
    if (onlyDigits(telefone).length < 10) erros.push("Telefone com DDD");
    if (!dataNasc) erros.push("Data de nascimento");
    if (onlyDigits(cep).length !== 8) erros.push("CEP válido");

    if (erros.length > 0) {
      toast.error("Preencha os campos obrigatórios", { description: erros.join(", ") });
      return;
    }

    setSubmitting(true);
    try {
      // Usa fluxo unificado: reserva slot com dados do paciente (sem criar consulta)
      const { data: resData, error: resErr } = await supabase.rpc("reservar_slot_unificado" as any, {
        _slot_id: reserva.slot_id,
        _tipo: "servico",
        _referencia_id: servico.id,
        _motivo: motivo.trim() || null,
        _nome_completo: nome.trim(),
        _cpf: onlyDigits(cpf),
        _telefone: onlyDigits(telefone),
        _data_nascimento: dataNasc,
        _sexo: sexo,
        _cep: onlyDigits(cep),
      });

      if (resErr) {
        toast.error("Erro ao reservar.", { description: resErr.message });
        setReserva(null);
        setStep("slots");
        carregarSlots();
        return;
      }

      const res = resData as any;
      if (!res?.ok) {
        toast.error(res?.erro || "Erro ao confirmar. Reserva pode ter expirado.");
        setReserva(null);
        setStep("slots");
        carregarSlots();
        return;
      }

      // Cria checkout SEM consulta_id (consulta criada pós-pagamento)
      const checkoutSession = await criarCheckoutSession({
        valorCentavos: res.valor_centavos,
        descricao: `${servico.nome} · Dr(a). ${reserva.medico_nome}`,
        reserva: {
          slot_id: res.slot_id,
          tipo: res.tipo,
          referencia_id: res.referencia_id,
          motivo: res.motivo,
          paciente_id: res.paciente_id,
          medico_id: res.medico_id,
        },
      });

      toast.success("Reserva confirmada!", {
        description: "Redirecionando para pagamento…",
      });
      setReserva(null);
      abrirCheckout(checkoutSession, navigate);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao criar sessão de pagamento.");
    } finally {
      setSubmitting(false);
    }
  }

  const totalLivres = Array.from(estadoPorSlot.values()).filter((v) => v.estado === "livre").length;

  if (loading) {
    return (
      <PageShell title="Carregando…">
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </PageShell>
    );
  }

  if (!servico) {
    return (
      <PageShell title="Serviço não encontrado">
        <div className="card-elevated p-10 text-center">
          <Button asChild>
            <Link to="/servicos">Voltar aos serviços</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const idxDia = diasComSlots.findIndex(([dk]) => dk === diaSelecionado);

  // ─── Step: Patient Form ───
  if (step === "formulario" && reserva) {
    return (
      <PageShell
        title="Confirmar dados"
        subtitle={`${servico.nome} · ${fmtHora(reserva.inicio)} com Dr(a). ${reserva.medico_nome}`}
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="card-elevated p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <User className="h-4 w-4 text-primary" />
              <h2 className="font-display text-lg font-semibold">Seus dados</h2>
            </div>

            <div>
              <Label htmlFor="nome">Nome completo *</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Como aparece nos documentos" maxLength={120} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="cpf">CPF *</Label>
                <Input id="cpf" value={cpf} onChange={(e) => setCpf(maskCpf(e.target.value))} placeholder="000.000.000-00" inputMode="numeric" />
              </div>
              <div>
                <Label htmlFor="tel">Telefone (com DDD) *</Label>
                <Input id="tel" value={telefone} onChange={(e) => setTelefone(maskFone(e.target.value))} placeholder="(11) 91234-5678" inputMode="tel" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="nasc">Nascimento *</Label>
                <Input id="nasc" type="date" value={dataNasc} onChange={(e) => setDataNasc(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
              </div>
              <div>
                <Label htmlFor="sexo">Sexo biológico *</Label>
                <Select value={sexo} onValueChange={setSexo}>
                  <SelectTrigger id="sexo"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feminino">Feminino</SelectItem>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="intersexo">Intersexo</SelectItem>
                    <SelectItem value="nao_informado">Prefiro não informar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cep">CEP *</Label>
                <Input id="cep" value={cep} onChange={(e) => setCep(maskCEP(e.target.value))} placeholder="00000-000" inputMode="numeric" />
              </div>
            </div>

            <div>
              <Label htmlFor="motivo">Motivo da consulta (opcional)</Label>
              <Textarea id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Conte resumidamente o que motiva a consulta." rows={3} maxLength={500} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setStep("slots")}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar aos horários
              </Button>
              <Button onClick={confirmarEPagar} disabled={submitting} className="bg-gradient-primary hover:opacity-90">
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando…</>
                ) : (
                  <><ShieldCheck className="mr-2 h-4 w-4" /> Confirmar e ir para pagamento</>
                )}
              </Button>
            </div>
          </div>

          {/* Resumo lateral */}
          <aside className="card-elevated h-fit p-5 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Resumo</p>
              <h3 className="mt-1 font-display text-lg font-semibold">{servico.nome}</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{dataLabel(dataKey(new Date(reserva.inicio)))}</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span>{fmtHora(reserva.inicio)} · Dr(a). {reserva.medico_nome}</span>
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Valor</span>
                <span className="font-bold">{brl(servico.valor_paciente_centavos)}</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Sua reserva expira em <strong>{Math.max(0, Math.ceil((reserva.expiresAt - agora) / 60000))} min</strong>.
            </p>
          </aside>
        </div>
      </PageShell>
    );
  }

  // ─── Step: Slot Selection ───
  return (
    <PageShell
      title={servico.nome}
      subtitle="Calendário compartilhado — escolha o horário, o sistema escolhe o profissional."
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="card-elevated overflow-hidden">
          <div className="gradient-soft flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <Badge className="mb-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                <Activity className="mr-1 h-3 w-3" /> Serviço da Plataforma
              </Badge>
              {servico.descricao_publica && (
                <p className="text-sm text-muted-foreground mb-2">{servico.descricao_publica}</p>
              )}
              <p className="text-sm font-medium">
                Valor: <span className="tabular-nums">{brl(servico.valor_paciente_centavos)}</span>{" "}
                · Duração: <span className="tabular-nums">{servico.duracao_min} min</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                <Users className="mr-1 inline h-3.5 w-3.5" />
                <strong>{totalLivres}</strong> horários livres{" "}
                {diaSelecionado ? dataLabel(diaSelecionado).toLowerCase() : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Legenda cor="bg-card border border-primary/30" texto="Livre" />
              <Legenda cor="bg-accent ring-2 ring-primary" texto="Você reservou" />
              <Legenda cor="bg-destructive/10 border border-destructive/40" texto="Lotado" />
            </div>
          </div>
        </div>

        {/* Aviso */}
        <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            Se outro paciente reservar o mesmo horário antes de você, o sistema move você
            automaticamente para o horário <strong>mais próximo</strong> com vaga e atribui
            o melhor profissional disponível pelo <strong>ranking</strong>.
          </span>
        </div>

        {/* Date navigation */}
        {diasComSlots.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              disabled={idxDia <= 0}
              onClick={() => {
                if (idxDia > 0) setDiaSelecionado(diasComSlots[idxDia - 1][0]);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex flex-1 gap-2 overflow-x-auto pb-1">
              {diasComSlots.map(([dk, daySlots]) => (
                <button
                  key={dk}
                  onClick={() => setDiaSelecionado(dk)}
                  className={`flex flex-col items-center rounded-lg border px-4 py-2 text-xs transition-all shrink-0 ${
                    dk === diaSelecionado
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <Calendar className="mb-1 h-3.5 w-3.5" />
                  <span className="font-medium">{dataLabel(dk)}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {daySlots.length} horário{daySlots.length !== 1 ? "s" : ""}
                  </span>
                </button>
              ))}
            </div>

            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              disabled={idxDia >= diasComSlots.length - 1}
              onClick={() => {
                if (idxDia < diasComSlots.length - 1) setDiaSelecionado(diasComSlots[idxDia + 1][0]);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {slots.length === 0 ? (
          <div className="card-elevated p-10 text-center text-muted-foreground">
            Nenhum horário disponível no momento. Tente novamente mais tarde.
          </div>
        ) : slotsNoDia.length === 0 ? (
          <div className="card-elevated p-10 text-center text-muted-foreground">
            Selecione um dia acima para ver os horários.
          </div>
        ) : (
          <CalendarioFila
            slots={slotsNoDia}
            estadoPorSlot={estadoPorSlot}
            destacar={destacar}
            onPick={reservar}
          />
        )}

        {reserva && (
          <RodapeReserva
            medicoNome={reserva.medico_nome}
            inicio={reserva.inicio}
            msRestantes={reserva.expiresAt - agora}
            precoCentavos={servico.valor_paciente_centavos}
            onCancelar={cancelar}
            onConfirmar={irParaFormulario}
          />
        )}
      </div>
    </PageShell>
  );
}

function Legenda({ cor, texto }: { cor: string; texto: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className={`inline-block h-3 w-3 rounded ${cor}`} />
      {texto}
    </span>
  );
}
