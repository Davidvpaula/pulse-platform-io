import { useEffect, useMemo, useState, useCallback } from "react";
import { Stethoscope, Video, Bell, Save, Zap, Loader2, Link2, Unlink, ExternalLink, CheckCircle2, Eye } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  listEspecialidades,
  listVinculosDoMedico,
  upsertVinculoEspecialidade,
  getProntoAtendimentoDuracao,
  type Especialidade,
  type MedicoEspecialidade,
} from "@/lib/clinico";
import { useMedicoAtual } from "@/lib/useMedicoAtual";

const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
  <div>
    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
    <div className="mt-1.5">{children}</div>
    {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className={cn("w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary", p.className)} />
);

const Section = ({ icon: Icon, title, children, action }: { icon: typeof Video; title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <section className="card-elevated p-6">
    <div className="mb-4 flex items-center justify-between gap-2 border-b border-border pb-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-display text-lg font-semibold">{title}</h3>
      </div>
      {action}
    </div>
    {children}
  </section>
);

type LinhaEsp = {
  especialidade_id: string;
  ativo: boolean;
  duracao_minutos: number;
  preco_centavos: number;
  pronto_atendimento: boolean;
  especialista: boolean;
  rqe: string;
  dirty?: boolean;
};

const isClinicaGeral = (e: { slug?: string | null; nome: string }) => {
  const s = (e.slug ?? "").toLowerCase();
  if (s === "clinica-geral" || s === "clinico-geral") return true;
  return /cl[ií]nic[ao]\s+geral/i.test(e.nome);
};

export default function MedicoConfiguracoes() {
  const { medico: medicoAtualHook } = useMedicoAtual();
  const hookMedicoId = medicoAtualHook?.id ?? null;
  // ── Google Meet & Calendar ──
  const [googleStatus, setGoogleStatus] = useState<{
    connected: boolean;
    google_email: string | null;
    connected_at: string | null;
  }>({ connected: false, google_email: null, connected_at: null });
  const [googleLoading, setGoogleLoading] = useState(true);
  const [googleActionLoading, setGoogleActionLoading] = useState(false);
  const [tipoSala, setTipoSala] = useState<"fixo" | "dinamico">("fixo");
  const [linkSala, setLinkSala] = useState("");
  const [savingMeet, setSavingMeet] = useState(false);
  const [meetDirty, setMeetDirty] = useState(false);
  const [medicoIdRef, setMedicoIdRef] = useState<string | null>(null);

  // Load medico config + Google status
  const fetchConfig = useCallback(async () => {
    setGoogleLoading(true);
    const mid = await getMedicoAtualId();
    setMedicoIdRef(mid);

    if (mid) {
      // Load tipo_sala and link from medicos table directly
      const { data: medico } = await supabase
        .from("medicos")
        .select("tipo_sala, link_sala_padrao")
        .eq("id", mid)
        .maybeSingle();
      if (medico) {
        setTipoSala((medico.tipo_sala as "fixo" | "dinamico") || "fixo");
        setLinkSala(medico.link_sala_padrao || "");
      }
    }

    // Check Google OAuth connection via edge function
    try {
      const { data, error } = await supabase.functions.invoke("google-oauth", {
        body: { action: "status" },
      });
      if (!error && data && !data.error) {
        setGoogleStatus({
          connected: data.connected,
          google_email: data.google_email,
          connected_at: data.connected_at,
        });
      }
    } catch {
      // silently fail — secrets may not be configured yet
    }
    setGoogleLoading(false);
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleGoogleConnect = async () => {
    setGoogleActionLoading(true);
    try {
      const redirectUri = `${window.location.origin}/medico/google-callback`;
      const { data, error } = await supabase.functions.invoke("google-oauth", {
        body: { action: "get-auth-url", redirect_uri: redirectUri },
      });
      if (error || data?.error) {
        if (data?.not_configured) {
          toast.info("Integração Google será ativada na etapa final de configuração.");
        } else {
          toast.error(data?.error || "Erro ao gerar link de autorização.");
        }
        setGoogleActionLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Erro ao iniciar conexão Google.");
      setGoogleActionLoading(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    setGoogleActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-oauth", {
        body: { action: "disconnect" },
      });
      if (error || data?.error) {
        toast.error("Erro ao desconectar.");
      } else {
        toast.success("Google Calendar desconectado.");
        setGoogleStatus({ connected: false, google_email: null, connected_at: null });
        // If was dynamic, revert to fixo since no longer connected
        if (tipoSala === "dinamico") {
          setTipoSala("fixo");
          setMeetDirty(true);
        }
      }
    } catch {
      toast.error("Erro ao desconectar.");
    }
    setGoogleActionLoading(false);
  };

  const salvarMeet = async () => {
    if (!medicoIdRef) {
      toast.error("Cadastro médico não encontrado.");
      return;
    }
    // Validation
    if (tipoSala === "fixo") {
      if (!linkSala.trim()) {
        toast.error("Informe o link fixo do Google Meet.");
        return;
      }
      try {
        new URL(linkSala.trim());
      } catch {
        toast.error("O link informado não é uma URL válida.");
        return;
      }
    }
    if (tipoSala === "dinamico" && !googleStatus.connected) {
      toast.error("Conecte o Google Calendar antes de usar o modo dinâmico.");
      return;
    }

    setSavingMeet(true);
    const { error } = await supabase.from("medicos").update({
      tipo_sala: tipoSala,
      link_sala_padrao: tipoSala === "fixo" ? linkSala.trim() : null,
    }).eq("id", medicoIdRef);

    setSavingMeet(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Configurações de vídeo salvas com sucesso.");
      setMeetDirty(false);
    }
  };

  // ── Atendimento ──
  const [loadingAt, setLoadingAt] = useState(true);
  const [savingAt, setSavingAt] = useState(false);
  const [especialidades, setEspecialidades] = useState<Especialidade[]>([]);
  const [linhas, setLinhas] = useState<Record<string, LinhaEsp>>({});
  const [paDuracao, setPaDuracao] = useState<number>(15);
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingAt(true);
      const [esps, paDur, medicoId] = await Promise.all([
        listEspecialidades(),
        getProntoAtendimentoDuracao(),
        getMedicoAtualId(),
      ]);
      setEspecialidades(esps);
      setPaDuracao(paDur);

      if (!medicoId) {
        setDevMode(true);
        const mapa: Record<string, LinhaEsp> = {};
        for (const e of esps) {
          mapa[e.id] = {
            especialidade_id: e.id,
            ativo: false,
            duracao_minutos: 30,
            preco_centavos: 0,
            pronto_atendimento: false,
            especialista: false,
            rqe: "",
          };
        }
        setLinhas(mapa);
      } else {
        const vinculos: MedicoEspecialidade[] = await listVinculosDoMedico();
        const vMap = new Map(vinculos.map((v) => [v.especialidade_id, v]));
        const mapa: Record<string, LinhaEsp> = {};
        for (const e of esps) {
          const v = vMap.get(e.id);
          mapa[e.id] = {
            especialidade_id: e.id,
            ativo: v?.ativo ?? false,
            duracao_minutos: v?.duracao_minutos ?? 30,
            preco_centavos: v?.preco_centavos ?? 0,
            pronto_atendimento: (v as any)?.pronto_atendimento ?? false,
            especialista: (v as any)?.especialista ?? false,
            rqe: (v as any)?.rqe ?? "",
          };
        }
        setLinhas(mapa);
      }
      setLoadingAt(false);
    })();
  }, []);

  const ativasCount = useMemo(
    () => Object.values(linhas).filter((l) => l.ativo).length,
    [linhas]
  );
  const paCount = useMemo(
    () => Object.values(linhas).filter((l) => l.ativo && l.pronto_atendimento).length,
    [linhas]
  );

  const updateLinha = (id: string, patch: Partial<LinhaEsp>) => {
    setLinhas((prev) => ({ ...prev, [id]: { ...prev[id], ...patch, dirty: true } }));
  };

  const salvarAtendimento = async () => {
    if (devMode) {
      toast.error("Faça login como médico para salvar.");
      return;
    }
    const dirties = Object.values(linhas).filter((l) => l.dirty);
    if (dirties.length === 0) {
      toast("Nenhuma alteração para salvar.");
      return;
    }
    const espMap = new Map(especialidades.map((e) => [e.id, e]));
    for (const l of dirties) {
      const esp = espMap.get(l.especialidade_id);
      if (!esp || !l.ativo) continue;
      if (isClinicaGeral(esp)) continue;
      if (l.especialista && !l.rqe.trim()) {
        toast.error(`Informe o RQE para ${esp.nome} (especialista CFM).`);
        return;
      }
    }
    setSavingAt(true);
    let okCount = 0;
    let failCount = 0;
    for (const l of dirties) {
      const esp = espMap.get(l.especialidade_id);
      const cg = esp ? isClinicaGeral(esp) : false;
      const r = await upsertVinculoEspecialidade({
        especialidade_id: l.especialidade_id,
        ativo: l.ativo,
        duracao_minutos: l.duracao_minutos,
        preco_centavos: l.preco_centavos,
        pronto_atendimento: l.pronto_atendimento && l.ativo,
        especialista: cg ? false : l.especialista,
        rqe: cg || !l.especialista ? null : l.rqe.trim(),
      });
      if (r.ok) okCount++;
      else failCount++;
    }
    setSavingAt(false);
    if (failCount === 0) {
      toast.success(`Atendimento atualizado (${okCount} especialidade${okCount > 1 ? "s" : ""}).`);
      setLinhas((prev) => {
        const out: Record<string, LinhaEsp> = {};
        for (const k of Object.keys(prev)) out[k] = { ...prev[k], dirty: false };
        return out;
      });
    } else {
      toast.error(`Falha ao salvar ${failCount} item(ns).`);
    }
  };

  // ── Notificações ──
  const [notif, setNotif] = useState({ lembretes: true, alertas: true, resumoDiario: false });
  const [notifLoading, setNotifLoading] = useState(true);
  const [savingNotif, setSavingNotif] = useState(false);

  useEffect(() => {
    (async () => {
      const mid = await getMedicoAtualId();
      if (!mid) { setNotifLoading(false); return; }
      const { data } = await supabase
        .from("medico_notificacao_prefs" as any)
        .select("*")
        .eq("medico_id", mid)
        .maybeSingle();
      if (data) {
        setNotif({
          lembretes: (data as any).lembretes_consulta ?? true,
          alertas: (data as any).alertas_operacionais ?? true,
          resumoDiario: (data as any).resumo_diario_email ?? false,
        });
      }
      setNotifLoading(false);
    })();
  }, []);

  const salvarNotificacoes = async () => {
    const mid = await getMedicoAtualId();
    if (!mid) { toast.error("Cadastro médico não encontrado."); return; }
    setSavingNotif(true);
    const { error } = await supabase.from("medico_notificacao_prefs" as any).upsert({
      medico_id: mid,
      lembretes_consulta: notif.lembretes,
      alertas_operacionais: notif.alertas,
      resumo_diario_email: notif.resumoDiario,
      updated_at: new Date().toISOString(),
    } as any, { onConflict: "medico_id" });
    setSavingNotif(false);
    if (error) {
      toast.error("Erro ao salvar notificações.");
    } else {
      toast.success("Preferências de notificação salvas.");
    }
  };

  // ── Prévia dinâmica ──
  const ativas = useMemo(() => {
    return especialidades
      .filter((e) => linhas[e.id]?.ativo)
      .map((e) => {
        const l = linhas[e.id];
        const cg = isClinicaGeral(e);
        return {
          nome: e.nome,
          duracao: l.duracao_minutos,
          preco: l.preco_centavos,
          especialista: cg ? null : l.especialista,
          rqe: l.rqe,
          cg,
        };
      });
  }, [especialidades, linhas]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Google Meet, atendimento e notificações."
      />

      {/* ═══ Google Meet & Calendar ═══ */}
      <Section
        icon={Video}
        title="Google Meet & Calendar"
        action={
          <Button
            size="sm"
            onClick={salvarMeet}
            disabled={savingMeet || googleLoading}
            className="bg-gradient-primary hover:opacity-90"
          >
            {savingMeet ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            Salvar vídeo
          </Button>
        }
      >
        {googleLoading ? (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando conexão Google…
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status da conexão */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  googleStatus.connected ? "bg-success/15" : "bg-muted"
                )}>
                  {googleStatus.connected
                    ? <CheckCircle2 className="h-5 w-5 text-success" />
                    : <Link2 className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {googleStatus.connected ? "Google Calendar conectado" : "Google Calendar não conectado"}
                  </p>
                  {googleStatus.connected && googleStatus.google_email && (
                    <p className="text-xs text-muted-foreground">{googleStatus.google_email}</p>
                  )}
                  {!googleStatus.connected && (
                    <p className="text-xs text-muted-foreground">
                      Conecte para gerar salas Meet dinâmicas por consulta.
                    </p>
                  )}
                </div>
              </div>
              <div>
                {googleStatus.connected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGoogleDisconnect}
                    disabled={googleActionLoading}
                    className="text-destructive hover:text-destructive"
                  >
                    {googleActionLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Unlink className="mr-1.5 h-3.5 w-3.5" />}
                    Desconectar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleGoogleConnect}
                    disabled={googleActionLoading}
                    className="bg-gradient-primary hover:opacity-90"
                  >
                    {googleActionLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="mr-1.5 h-3.5 w-3.5" />}
                    Conectar Google Calendar
                  </Button>
                )}
              </div>
            </div>

            {/* Tipo de sala */}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Tipo de link de vídeo">
                <div className="flex gap-3">
                  <label className={cn(
                    "flex flex-1 cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition",
                    tipoSala === "fixo"
                      ? "border-primary bg-primary/5 font-medium"
                      : "border-border hover:border-primary/40"
                  )}>
                    <input
                      type="radio"
                      name="tipo_sala"
                      className="accent-primary"
                      checked={tipoSala === "fixo"}
                      onChange={() => { setTipoSala("fixo"); setMeetDirty(true); }}
                    />
                    Fixo
                  </label>
                  <label className={cn(
                    "flex flex-1 cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition",
                    tipoSala === "dinamico"
                      ? "border-primary bg-primary/5 font-medium"
                      : "border-border hover:border-primary/40",
                    !googleStatus.connected && "opacity-50 cursor-not-allowed"
                  )}>
                    <input
                      type="radio"
                      name="tipo_sala"
                      className="accent-primary"
                      checked={tipoSala === "dinamico"}
                      disabled={!googleStatus.connected}
                      onChange={() => { setTipoSala("dinamico"); setMeetDirty(true); }}
                    />
                    Dinâmico (Google Meet)
                  </label>
                </div>
              </Field>

              {tipoSala === "fixo" && (
                <Field label="Link fixo de atendimento" hint="Cole seu link permanente do Google Meet.">
                  <Input
                    value={linkSala}
                    onChange={(e) => { setLinkSala(e.target.value); setMeetDirty(true); }}
                    placeholder="https://meet.google.com/xxx-xxx-xxx"
                  />
                </Field>
              )}

              {tipoSala === "dinamico" && (
                <Field label="Como funciona">
                  <div className="rounded-lg border border-primary/20 bg-primary-soft/30 p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Link gerado automaticamente</p>
                    <p className="mt-1">
                      A cada consulta confirmada, um evento será criado no seu Google Calendar
                      com uma sala Meet exclusiva. O link é enviado ao paciente automaticamente.
                    </p>
                  </div>
                </Field>
              )}
            </div>
          </div>
        )}
      </Section>

      {/* ═══ Atendimento ═══ */}
      <Section
        icon={Stethoscope}
        title="Atendimento"
        action={
          <Button
            size="sm"
            onClick={salvarAtendimento}
            disabled={savingAt || loadingAt}
            className="bg-gradient-primary hover:opacity-90"
          >
            {savingAt ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            Salvar atendimento
          </Button>
        }
      >
        <div className="space-y-4">
          {devMode && (
            <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
              Visualização (sem login) — alterações não serão persistidas.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Especialidades ativas</p>
              <p className="mt-1 font-display text-2xl font-semibold">{ativasCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Em Pronto Atendimento</p>
              <p className="mt-1 font-display text-2xl font-semibold">{paCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Duração PA</p>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  somente leitura
                </span>
              </div>
              <p className="mt-1 font-display text-2xl font-semibold">{paDuracao} min</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Definido pelo Admin</p>
            </div>
          </div>

          {/* Modo Particular */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <h4 className="text-sm font-semibold">Consulta particular (agendada)</h4>
              <span className="text-[11px] text-muted-foreground">
                Marque as especialidades que atende e defina duração / preço para cada uma.
              </span>
            </div>

            {loadingAt ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando especialidades…
              </div>
            ) : especialidades.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                Nenhuma especialidade cadastrada pelo Admin.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="grid grid-cols-12 gap-2 bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <div className="col-span-5">Especialidade</div>
                  <div className="col-span-3">Duração (min)</div>
                  <div className="col-span-3">Preço (R$)</div>
                  <div className="col-span-1 text-right">Ativo</div>
                </div>
                <div className="divide-y divide-border">
                  {especialidades.map((e) => {
                    const l = linhas[e.id];
                    if (!l) return null;
                    const cg = isClinicaGeral(e);
                    return (
                      <div key={e.id} className={cn("px-3 py-2.5 text-sm", !l.ativo && "opacity-60")}>
                        <div className="grid grid-cols-12 items-center gap-2">
                          <div className="col-span-5">
                            <p className="font-medium">{e.nome}</p>
                            {(e as any).descricao && <p className="text-[11px] text-muted-foreground">{(e as any).descricao}</p>}
                            {cg && (
                              <span className="mt-0.5 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                                CFM: não exige RQE
                              </span>
                            )}
                          </div>
                          <div className="col-span-3">
                            <Input
                              type="number"
                              min={5}
                              step={5}
                              value={l.duracao_minutos}
                              disabled={!l.ativo}
                              onChange={(ev) => updateLinha(e.id, { duracao_minutos: Math.max(5, Number(ev.target.value) || 0) })}
                            />
                          </div>
                          <div className="col-span-3">
                            <Input
                              type="number"
                              min={0}
                              step={10}
                              value={(l.preco_centavos / 100).toFixed(2)}
                              disabled={!l.ativo}
                              onChange={(ev) => updateLinha(e.id, { preco_centavos: Math.max(0, Math.round(Number(ev.target.value) * 100) || 0) })}
                            />
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-primary"
                              checked={l.ativo}
                              onChange={(ev) => updateLinha(e.id, { ativo: ev.target.checked })}
                            />
                          </div>
                        </div>

                        {/* Linha 2: especialista CFM + RQE */}
                        {l.ativo && !cg && (
                          <div className="mt-2 grid grid-cols-12 items-center gap-2 rounded-md bg-muted/30 px-2 py-2">
                            <div className="col-span-5 flex items-center gap-3">
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Especialista (CFM)
                              </span>
                              <div className="flex items-center gap-3 text-xs">
                                <label className="flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`esp-${e.id}`}
                                    className="accent-primary"
                                    checked={l.especialista === true}
                                    onChange={() => updateLinha(e.id, { especialista: true })}
                                  />
                                  Sim
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`esp-${e.id}`}
                                    className="accent-primary"
                                    checked={l.especialista === false}
                                    onChange={() => updateLinha(e.id, { especialista: false, rqe: "" })}
                                  />
                                  Não
                                </label>
                              </div>
                            </div>
                            <div className="col-span-7">
                              {l.especialista ? (
                                <div className="flex items-center gap-2">
                                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                                    RQE *
                                  </label>
                                  <Input
                                    placeholder="Ex.: 12345"
                                    value={l.rqe}
                                    onChange={(ev) => updateLinha(e.id, { rqe: ev.target.value })}
                                    className={cn(
                                      "max-w-[180px]",
                                      !l.rqe.trim() && "border-destructive/50"
                                    )}
                                  />
                                  <span className="text-[11px] text-muted-foreground">
                                    Aparecerá no seu perfil público.
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">
                                  Aparecerá no site como <strong className="text-foreground">"Não especialista"</strong>.
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Prévia dinâmica (aparece somente com especialidades ativas) ── */}
          {ativas.length > 0 && (
            <div className="rounded-xl border border-primary/20 bg-primary-soft/30 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold">Prévia: como sua consulta particular vai aparecer</h4>
              </div>

              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="grid grid-cols-12 gap-2 bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <div className="col-span-5">Especialidade</div>
                  <div className="col-span-3">Duração</div>
                  <div className="col-span-3">Preço</div>
                  <div className="col-span-1 text-right">Status</div>
                </div>
                <div className="divide-y divide-border">
                  {ativas.map((ex) => (
                    <div key={ex.nome} className="grid grid-cols-12 items-center gap-2 px-3 py-2.5 text-sm">
                      <div className="col-span-5">
                        <p className="font-medium">{ex.nome}</p>
                        {ex.especialista === null ? null : ex.especialista ? (
                          <span className="mt-0.5 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                            Especialista · RQE {ex.rqe}
                          </span>
                        ) : (
                          <span className="mt-0.5 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Não especialista
                          </span>
                        )}
                      </div>
                      <div className="col-span-3 text-muted-foreground">{ex.duracao} min</div>
                      <div className="col-span-3 text-muted-foreground">
                        R$ {(ex.preco / 100).toFixed(2).replace(".", ",")}
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">Ativo</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cards preview */}
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {ativas.slice(0, 3).map((c) => (
                  <div key={c.nome} className="rounded-lg border border-border bg-card p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">{c.nome}</p>
                    <div className="mt-1.5 flex items-baseline justify-between">
                      <span className="font-display text-lg font-semibold">
                        R$ {(c.preco / 100).toFixed(2).replace(".", ",")}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{c.duracao} min</span>
                    </div>
                    {c.especialista !== null && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {c.especialista ? `Especialista · RQE ${c.rqe}` : "Não especialista"}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <p className="mt-2 text-[11px] text-muted-foreground">
                ↑ Prévia com seus dados reais conforme regra do <strong>CFM</strong>: Clínica Geral nunca exige RQE; demais especialidades mostram <em>"Especialista · RQE"</em> ou <em>"Não especialista"</em> no perfil público.
              </p>
            </div>
          )}

          {/* Modo Pronto Atendimento */}
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-warning" />
                <h4 className="text-sm font-semibold">Pronto Atendimento</h4>
                <span className="text-[11px] text-muted-foreground">
                  Marque as especialidades disponíveis em PA. Duração ({paDuracao} min) definida pelo Admin.
                </span>
              </div>
              {especialidades.filter((e) => linhas[e.id]?.ativo).length > 0 && (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      especialidades.forEach((e) => {
                        if (linhas[e.id]?.ativo) updateLinha(e.id, { pronto_atendimento: true });
                      });
                    }}
                    className="rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground hover:border-warning/40 hover:text-warning"
                  >
                    Selecionar todas
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      especialidades.forEach((e) => {
                        if (linhas[e.id]?.ativo) updateLinha(e.id, { pronto_atendimento: false });
                      });
                    }}
                    className="rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground hover:border-destructive/40 hover:text-destructive"
                  >
                    Limpar
                  </button>
                </div>
              )}
            </div>

            {loadingAt ? null : (
              <div className="flex flex-wrap gap-2">
                {especialidades.filter((e) => linhas[e.id]?.ativo).length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                    Ative pelo menos uma especialidade acima para liberar o Pronto Atendimento.
                  </p>
                ) : (
                  especialidades
                    .filter((e) => linhas[e.id]?.ativo)
                    .map((e) => {
                      const l = linhas[e.id];
                      const on = l.pronto_atendimento;
                      return (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => updateLinha(e.id, { pronto_atendimento: !on })}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                            on
                              ? "border-warning bg-warning/15 text-warning"
                              : "border-border bg-card text-muted-foreground hover:border-warning/40"
                          )}
                        >
                          {on ? "✓ " : ""}{e.nome}
                        </button>
                      );
                    })
                )}
              </div>
            )}

            {/* Link para Serviços da Plataforma */}
            <div className="mt-3 rounded-lg border border-dashed border-border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">
                Além das especialidades particulares, você também pode aderir aos{" "}
                <Link to="/app/medico/servicos" className="font-semibold text-primary hover:underline">
                  Serviços da Plataforma
                </Link>{" "}
                gerenciados pelo Admin, com comissões e regras específicas.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══ Notificações ═══ */}
      <Section
        icon={Bell}
        title="Notificações"
        action={
          <Button
            size="sm"
            onClick={salvarNotificacoes}
            disabled={savingNotif || notifLoading}
            className="bg-gradient-primary hover:opacity-90"
          >
            {savingNotif ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            Salvar notificações
          </Button>
        }
      >
        {notifLoading ? (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando preferências…
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {([
              ["lembretes", "Lembretes de consulta (10 min antes)"],
              ["alertas", "Alertas operacionais (pagamentos, agenda)"],
              ["resumoDiario", "Resumo diário por e-mail"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer">
                <span className="text-sm">{label}</span>
                <input
                  type="checkbox"
                  checked={notif[key]}
                  onChange={(e) => setNotif({ ...notif, [key]: e.target.checked })}
                  className="h-4 w-4 accent-primary"
                />
              </label>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
