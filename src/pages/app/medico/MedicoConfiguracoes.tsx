import { useEffect, useMemo, useState } from "react";
import { User, Stethoscope, Calendar, Video, Bell, Save, Zap, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  listEspecialidades,
  listVinculosDoMedico,
  upsertVinculoEspecialidade,
  getProntoAtendimentoDuracao,
  getMedicoAtualId,
  type Especialidade,
  type MedicoEspecialidade,
} from "@/lib/clinico";

const semana = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

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
  const [diasAtivos, setDiasAtivos] = useState(["Seg", "Ter", "Qua", "Qui", "Sex"]);
  const [notif, setNotif] = useState({ lembretes: true, alertas: true, resumoDiario: false });

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
    setSavingAt(true);
    let okCount = 0;
    let failCount = 0;
    for (const l of dirties) {
      const r = await upsertVinculoEspecialidade({
        especialidade_id: l.especialidade_id,
        ativo: l.ativo,
        duracao_minutos: l.duracao_minutos,
        preco_centavos: l.preco_centavos,
        pronto_atendimento: l.pronto_atendimento && l.ativo,
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

  const toggleDia = (d: string) =>
    setDiasAtivos(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Perfil, atendimento, agenda, Google Meet e notificações."
        actions={
          <Button className="bg-gradient-primary hover:opacity-90" onClick={() => toast("Configurações salvas")}>
            <Save className="mr-2 h-4 w-4" /> Salvar alterações
          </Button>
        }
      />

      <Section icon={User} title="Perfil">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nome completo"><Input defaultValue="Dr. Rafael Lasmar" /></Field>
          <Field label="CRM"><Input defaultValue="CRM/MG 12345" /></Field>
          <Field label="Especialidade principal"><Input defaultValue="Cardiologia" /></Field>
          <Field label="Foto de perfil"><Input type="file" accept="image/*" /></Field>
          <div className="md:col-span-2">
            <Field label="Bio">
              <textarea
                rows={3}
                defaultValue="Cardiologista com 12 anos de atuação clínica. Foco em prevenção e telemedicina."
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </Field>
          </div>
        </div>
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
                    return (
                      <div key={e.id} className={cn(
                        "grid grid-cols-12 items-center gap-2 px-3 py-2.5 text-sm",
                        !l.ativo && "opacity-60"
                      )}>
                        <div className="col-span-5">
                          <p className="font-medium">{e.nome}</p>
                          {e.descricao && <p className="text-[11px] text-muted-foreground">{e.descricao}</p>}
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
                  { nome: "Clínica Geral", duracao: 30, preco: 180 },
                  { nome: "Psiquiatria", duracao: 50, preco: 350 },
                  { nome: "Pediatria", duracao: 30, preco: 220 },
                ].map((ex) => (
                  <div key={ex.nome} className="grid grid-cols-12 items-center gap-2 px-3 py-2.5 text-sm">
                    <div className="col-span-5 font-medium">{ex.nome}</div>
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
                { label: "Clínica Geral", duracao: "30 min", preco: "R$ 180,00" },
                { label: "Psiquiatria", duracao: "50 min", preco: "R$ 350,00" },
                { label: "Pediatria", duracao: "30 min", preco: "R$ 220,00" },
              ].map((c) => (
                <div key={c.label} className="rounded-lg border border-border bg-card p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">{c.label}</p>
                  <div className="mt-1.5 flex items-baseline justify-between">
                    <span className="font-display text-lg font-semibold">{c.preco}</span>
                    <span className="text-[11px] text-muted-foreground">{c.duracao}</span>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-2 text-[11px] text-muted-foreground">
              ↑ Esses cards são <strong>exemplos visuais</strong>. Ao preencher a tabela acima e salvar, suas especialidades aparecerão no catálogo público com esses dados.
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

      <Section icon={Calendar} title="Agenda">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field label="Dias da semana">
              <div className="flex flex-wrap gap-2">
                {semana.map(d => {
                  const ativo = diasAtivos.includes(d);
                  return (
                    <button key={d} onClick={() => toggleDia(d)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-xs font-medium border transition",
                        ativo ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/40",
                      )}
                    >{d}</button>
                  );
                })}
              </div>
            </Field>
          </div>
          <Field label="Início"><Input type="time" defaultValue="08:00" /></Field>
          <Field label="Fim"><Input type="time" defaultValue="18:00" /></Field>
        </div>
      </Section>

      <Section icon={Video} title="Google Meet">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field label="Link fixo de atendimento" hint="Em breve: integração com Google Agenda para link dinâmico por consulta.">
              <Input defaultValue="https://meet.google.com/dr-rafael-lasmar" />
            </Field>
          </div>
          <Field label="Tipo de link">
            <select className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm">
              <option>Fixo</option>
              <option disabled>Dinâmico (Google Agenda) — em breve</option>
            </select>
          </Field>
          <Field label="Google Calendar conectado">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-xs text-warning">Não conectado</span>
          </Field>
        </div>
      </Section>

      <Section icon={Bell} title="Notificações">
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries({
            lembretes: "Lembretes de consulta (10 min antes)",
            alertas: "Alertas operacionais (Feegow, pagamentos)",
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
