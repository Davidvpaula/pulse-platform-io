import { useEffect, useMemo, useState, useCallback } from "react";
import { User, Stethoscope, Video, Bell, Save, Zap, Loader2, Link2, Unlink, ExternalLink, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  listEspecialidades,
  listVinculosDoMedico,
  upsertVinculoEspecialidade,
  getProntoAtendimentoDuracao,
  getMedicoAtualId,
  type Especialidade,
  type MedicoEspecialidade,
} from "@/lib/clinico";



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

const Section = ({ icon: Icon, title, children, action }: { icon: typeof User; title: string; children: React.ReactNode; action?: React.ReactNode }) => (
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
  const [notif, setNotif] = useState({ lembretes: true, alertas: true, resumoDiario: false });

  // Google OAuth state
  const [googleStatus, setGoogleStatus] = useState<{
    connected: boolean;
    google_email: string | null;
    tipo_sala: string;
    link_sala_padrao: string | null;
    connected_at: string | null;
  }>({ connected: false, google_email: null, tipo_sala: "fixo", link_sala_padrao: null, connected_at: null });
  const [googleLoading, setGoogleLoading] = useState(true);
  const [googleActionLoading, setGoogleActionLoading] = useState(false);
  const [linkSala, setLinkSala] = useState("");

  const fetchGoogleStatus = useCallback(async () => {
    setGoogleLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-oauth", {
        body: { action: "status" },
      });
      if (!error && data && !data.error) {
        setGoogleStatus(data);
        setLinkSala(data.link_sala_padrao || "");
      }
    } catch {
      // silently fail — secrets may not be configured yet
    }
    setGoogleLoading(false);
  }, []);

  useEffect(() => { fetchGoogleStatus(); }, [fetchGoogleStatus]);

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
        setGoogleStatus({ connected: false, google_email: null, tipo_sala: "fixo", link_sala_padrao: googleStatus.link_sala_padrao, connected_at: null });
      }
    } catch {
      toast.error("Erro ao desconectar.");
    }
    setGoogleActionLoading(false);
  };

  // Atendimento dinâmico
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
        // Modo dev/visualização — pré-popula linhas vazias
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
    // Validação CFM: especialidades marcadas como "especialista" precisam de RQE
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Google Meet, atendimento e notificações."
        actions={
          <Button className="bg-gradient-primary hover:opacity-90" onClick={() => toast("Configurações salvas")}>
            <Save className="mr-2 h-4 w-4" /> Salvar alterações
          </Button>
        }
      />

      <Section icon={Video} title="Google Meet & Calendar">
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
                    googleStatus.tipo_sala === "fixo"
                      ? "border-primary bg-primary/5 font-medium"
                      : "border-border hover:border-primary/40"
                  )}>
                    <input
                      type="radio"
                      name="tipo_sala"
                      className="accent-primary"
                      checked={googleStatus.tipo_sala === "fixo"}
                      onChange={() => setGoogleStatus(prev => ({ ...prev, tipo_sala: "fixo" }))}
                    />
                    Fixo
                  </label>
                  <label className={cn(
                    "flex flex-1 cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition",
                    googleStatus.tipo_sala === "dinamico"
                      ? "border-primary bg-primary/5 font-medium"
                      : "border-border hover:border-primary/40",
                    !googleStatus.connected && "opacity-50 cursor-not-allowed"
                  )}>
                    <input
                      type="radio"
                      name="tipo_sala"
                      className="accent-primary"
                      checked={googleStatus.tipo_sala === "dinamico"}
                      disabled={!googleStatus.connected}
                      onChange={() => setGoogleStatus(prev => ({ ...prev, tipo_sala: "dinamico" }))}
                    />
                    Dinâmico (Google Meet)
                  </label>
                </div>
              </Field>

              {googleStatus.tipo_sala === "fixo" && (
                <Field label="Link fixo de atendimento" hint="Cole seu link permanente do Google Meet.">
                  <Input
                    value={linkSala}
                    onChange={(e) => setLinkSala(e.target.value)}
                    placeholder="https://meet.google.com/xxx-xxx-xxx"
                  />
                </Field>
              )}

              {googleStatus.tipo_sala === "dinamico" && (
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
                      <div key={e.id} className={cn(
                        "px-3 py-2.5 text-sm",
                        !l.ativo && "opacity-60"
                      )}>
                        <div className="grid grid-cols-12 items-center gap-2">
                          <div className="col-span-5">
                            <p className="font-medium">{e.nome}</p>
                            {e.descricao && <p className="text-[11px] text-muted-foreground">{e.descricao}</p>}
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

          {/* Prévia: como fica quando preenchido */}
          <div className="rounded-xl border border-primary/20 bg-primary-soft/30 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                Exemplo
              </span>
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
                {[
                  { nome: "Clínica Geral", duracao: 30, preco: 180, especialista: null as null | boolean, rqe: "" },
                  { nome: "Psiquiatria", duracao: 50, preco: 350, especialista: true, rqe: "12345" },
                  { nome: "Pediatria", duracao: 30, preco: 220, especialista: false, rqe: "" },
                ].map((ex) => (
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
                    <div className="col-span-3 text-muted-foreground">R$ {ex.preco.toFixed(2).replace(".", ",")}</div>
                    <div className="col-span-1 flex justify-end">
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">Ativo</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {[
                { label: "Clínica Geral", duracao: "30 min", preco: "R$ 180,00", tag: null as null | string },
                { label: "Psiquiatria", duracao: "50 min", preco: "R$ 350,00", tag: "Especialista · RQE 12345" },
                { label: "Pediatria", duracao: "30 min", preco: "R$ 220,00", tag: "Não especialista" },
              ].map((c) => (
                <div key={c.label} className="rounded-lg border border-border bg-card p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">{c.label}</p>
                  <div className="mt-1.5 flex items-baseline justify-between">
                    <span className="font-display text-lg font-semibold">{c.preco}</span>
                    <span className="text-[11px] text-muted-foreground">{c.duracao}</span>
                  </div>
                  {c.tag && (
                    <p className="mt-1 text-[10px] text-muted-foreground">{c.tag}</p>
                  )}
                </div>
              ))}
            </div>

            <p className="mt-2 text-[11px] text-muted-foreground">
              ↑ Exemplos visuais conforme regra do <strong>CFM</strong>: Clínica Geral nunca exige RQE; demais especialidades mostram <em>"Especialista · RQE"</em> ou <em>"Não especialista"</em> no perfil público.
            </p>
          </div>

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
          </div>
        </div>
      </Section>

      <Section icon={Bell} title="Notificações">
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries({
            lembretes: "Lembretes de consulta (10 min antes)",
            alertas: "Alertas operacionais (pagamentos, agenda)",
            resumoDiario: "Resumo diário por e-mail",
          }).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer">
              <span className="text-sm">{label}</span>
              <input
                type="checkbox"
                checked={(notif as any)[key]}
                onChange={e => setNotif({ ...notif, [key]: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
            </label>
          ))}
        </div>
      </Section>
    </div>
  );
}
