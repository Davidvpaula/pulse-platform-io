import { useEffect, useState, useMemo } from "react";
import { brl } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search, Plus, X, CheckCircle2, Loader2, ArrowRight, UserCircle2,
  Percent, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTermsCheck } from "@/hooks/useTermsCheck";
import { TermsAcceptanceDialog } from "@/components/shared/TermsAcceptanceDialog";

/* ─────────── Types ─────────── */

type MedicoComPlano = {
  id: string;
  nome: string;
  especialidade: string | null;
  foto_url: string | null;
  crm: string | null;
  especialidades: string[]; // from medico_especialidades join
  valor_mensal_centavos: number; // from their medico-level plano, or 0
};

type DescontoRegra = { qtd_medicos_min: number; desconto_pct: number };

/* ─────────── Component ─────────── */

export default function PacienteMontarPlano() {
  const { session } = useSession();
  const uid = session?.user?.id;
  const termsPlano = useTermsCheck("plano_plataforma");

  const [step, setStep] = useState(1);
  const [medicos, setMedicos] = useState<MedicoComPlano[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [regras, setRegras] = useState<DescontoRegra[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [jaTemPlanoAtivo, setJaTemPlanoAtivo] = useState(false);

  useEffect(() => {
    loadData();
  }, [uid]);

  async function loadData() {
    if (!uid) return;
    setLoading(true);
    try {
      // 1. Médicos aprovados com especialidades e foto
      const { data: rawMedicos } = await supabase
        .from("medicos")
        .select("id, nome, especialidade, foto_url, crm")
        .eq("status", "aprovado")
        .order("nome");

      // 2. Especialidades de cada médico (join)
      const { data: medEsps } = await supabase
        .from("medico_especialidades")
        .select("medico_id, especialidades(nome)")
        .eq("ativo", true);

      // 3. Planos dos médicos (para obter valor real)
      const { data: planosMedicos } = await supabase
        .from("planos")
        .select("medico_id, valor_mensal_centavos")
        .eq("nivel", "medico")
        .eq("status", "ativo");

      // 4. Regras de desconto
      const { data: r } = await supabase
        .from("desconto_progressivo_regras")
        .select("qtd_medicos_min, desconto_pct")
        .eq("ativo", true)
        .order("qtd_medicos_min");

      // 5. Verificar se paciente já tem plano custom ativo
      const { data: existentes } = await supabase
        .from("planos")
        .select("id")
        .eq("created_by", uid)
        .eq("nivel", "paciente_custom")
        .in("status", ["ativo", "rascunho"])
        .limit(1);

      setJaTemPlanoAtivo((existentes?.length ?? 0) > 0);

      // Build map: medico_id → especialidades[]
      const espMap = new Map<string, string[]>();
      for (const me of (medEsps ?? [])) {
        const mid = (me as any).medico_id;
        const nome = (me as any).especialidades?.nome;
        if (!mid || !nome) continue;
        const arr = espMap.get(mid) || [];
        arr.push(nome);
        espMap.set(mid, arr);
      }

      // Build map: medico_id → valor_mensal_centavos
      const valorMap = new Map<string, number>();
      for (const p of (planosMedicos ?? [])) {
        if (p.medico_id) {
          // If multiple, take the highest
          const existing = valorMap.get(p.medico_id) || 0;
          if (p.valor_mensal_centavos > existing) {
            valorMap.set(p.medico_id, p.valor_mensal_centavos);
          }
        }
      }

      const enriched: MedicoComPlano[] = (rawMedicos ?? []).map((m: any) => ({
        id: m.id,
        nome: m.nome,
        especialidade: m.especialidade,
        foto_url: m.foto_url,
        crm: m.crm,
        especialidades: espMap.get(m.id) || (m.especialidade ? [m.especialidade] : []),
        valor_mensal_centavos: valorMap.get(m.id) || 0,
      }));

      setMedicos(enriched);
      setRegras((r ?? []) as DescontoRegra[]);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  }

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const descontoPct = useMemo(() => {
    const count = selectedIds.size;
    let d = 0;
    for (const r of regras) {
      if (count >= r.qtd_medicos_min) d = Number(r.desconto_pct);
    }
    return d;
  }, [selectedIds.size, regras]);

  // Next discount threshold
  const proximaFaixa = useMemo(() => {
    const count = selectedIds.size;
    for (const r of regras) {
      if (count < r.qtd_medicos_min) {
        return { falta: r.qtd_medicos_min - count, desconto: Number(r.desconto_pct) };
      }
    }
    return null;
  }, [selectedIds.size, regras]);

  // Real pricing from medico plans
  const selectedMedicos = useMemo(
    () => medicos.filter((m) => selectedIds.has(m.id)),
    [medicos, selectedIds]
  );

  const valorBruto = useMemo(
    () => selectedMedicos.reduce((s, m) => s + m.valor_mensal_centavos, 0),
    [selectedMedicos]
  );

  const valorFinal = Math.round(valorBruto * (1 - descontoPct / 100));

  const filtered = medicos.filter(
    (m) =>
      !busca ||
      m.nome.toLowerCase().includes(busca.toLowerCase()) ||
      m.especialidades.some((e) => e.toLowerCase().includes(busca.toLowerCase())) ||
      (m.especialidade || "").toLowerCase().includes(busca.toLowerCase())
  );

  const medicosComPreco = filtered.filter((m) => m.valor_mensal_centavos > 0);
  const medicosSemPreco = filtered.filter((m) => m.valor_mensal_centavos === 0);

  async function confirmar() {
    if (!uid || selectedIds.size < 2) return;
    if (termsPlano.needsAcceptance) {
      termsPlano.promptAcceptance();
      return;
    }
    if (jaTemPlanoAtivo) {
      toast.error("Você já possui um plano personalizado ativo ou em rascunho.");
      return;
    }
    setSaving(true);
    try {
      const { data: plano, error: pe } = await supabase
        .from("planos")
        .insert({
          nome: `Plano personalizado — ${selectedIds.size} médicos`,
          nivel: "paciente_custom" as any,
          status: "rascunho" as any,
          valor_mensal_centavos: valorFinal,
          created_by: uid,
          categoria: "personalizado" as any,
          publico: "paciente" as any,
          modelo_cobranca: "mensal" as any,
          desconto_geral_pct: descontoPct,
        })
        .select("id")
        .single();
      if (pe) throw pe;

      const rows = Array.from(selectedIds).map((mid) => ({
        plano_id: plano.id,
        medico_id: mid,
      }));
      const { error: me } = await supabase.from("plano_medicos").insert(rows);
      if (me) throw me;

      toast.success("Plano personalizado criado! Aguardando aceite dos médicos.");
      setStep(3);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao criar plano");
    } finally {
      setSaving(false);
    }
  }

  /* ─── Loading ─── */
  if (loading) {
    return (
      <PageShell title="Monte seu Plano" subtitle="Escolha múltiplos médicos e ganhe desconto progressivo">
        <div className="space-y-4">
          <Skeleton className="h-10 max-w-sm" />
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Monte seu Plano" subtitle="Escolha múltiplos médicos e ganhe desconto progressivo">
      {/* Aviso: já tem plano ativo */}
      {jaTemPlanoAtivo && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Você já possui um plano personalizado</p>
            <p className="text-muted-foreground">
              Cancele ou aguarde a conclusão do plano atual antes de criar um novo.
            </p>
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium",
              s <= step ? "text-primary" : "text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs",
                s < step
                  ? "bg-primary text-primary-foreground"
                  : s === step
                  ? "border-2 border-primary"
                  : "border border-border"
              )}
            >
              {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
            </span>
            <span className="hidden sm:inline">
              {s === 1 ? "Escolher médicos" : s === 2 ? "Revisar" : "Confirmado"}
            </span>
            {s < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />}
          </div>
        ))}
      </div>

      {/* ─── STEP 1: Escolher médicos ─── */}
      {step === 1 && (
        <>
          {/* Search + counter */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar médico ou especialidade..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            {selectedIds.size > 0 && (
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm">
                <UserCircle2 className="h-4 w-4" />
                {selectedIds.size} médico{selectedIds.size > 1 ? "s" : ""} selecionado{selectedIds.size > 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          {/* Desconto progressivo preview */}
          {regras.length > 0 && (
            <div className="mb-4 rounded-xl border border-border bg-muted/30 p-3">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Percent className="h-4 w-4 text-primary" />
                  <span className="font-medium">Desconto atual: <span className="text-success">{descontoPct}%</span></span>
                </div>
                {proximaFaixa && (
                  <span className="text-muted-foreground">
                    +{proximaFaixa.falta} médico{proximaFaixa.falta > 1 ? "s" : ""} para {proximaFaixa.desconto}% de desconto
                  </span>
                )}
                {valorBruto > 0 && (
                  <span className="ml-auto text-muted-foreground">
                    Total: {descontoPct > 0 ? <><s>{brl(valorBruto)}</s> → </> : null}
                    <strong className="text-foreground">{brl(valorFinal)}</strong>/mês
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Selected badges */}
          {selectedIds.size > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {selectedMedicos.map((m) => (
                <Badge key={m.id} variant="secondary" className="gap-1">
                  {m.nome}
                  <button onClick={() => toggle(m.id)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Médicos com plano (selecionáveis) */}
          {medicosComPreco.length > 0 && (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {medicosComPreco.map((m) => {
                const selected = selectedIds.has(m.id);
                return (
                  <TooltipProvider key={m.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => toggle(m.id)}
                          disabled={jaTemPlanoAtivo}
                          className={cn(
                            "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                            selected ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                            jaTemPlanoAtivo && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarImage src={m.foto_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {m.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{m.nome}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {m.especialidades.join(", ") || m.especialidade || "Clínico Geral"}
                            </p>
                            <p className="text-xs text-primary mt-0.5">{brl(m.valor_mensal_centavos)}/mês</p>
                          </div>
                          {selected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-1" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>CRM: {m.crm || "—"}</p>
                        <p>{m.especialidades.join(", ") || m.especialidade || "Clínico Geral"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          )}

          {/* Médicos sem plano publicado */}
          {medicosSemPreco.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">
                Médicos abaixo ainda não publicaram plano individual — disponíveis em breve:
              </p>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 opacity-50">
                {medicosSemPreco.map((m) => (
                  <div key={m.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={m.foto_url || undefined} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                        {m.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{m.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {m.especialidades.join(", ") || m.especialidade || "Clínico Geral"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Plano em breve</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserCircle2 className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {busca ? `Nenhum médico encontrado para "${busca}"` : "Nenhum médico disponível no momento"}
              </p>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button disabled={selectedIds.size < 2 || jaTemPlanoAtivo} onClick={() => setStep(2)}>
              Próximo <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </>
      )}

      {/* ─── STEP 2: Revisar ─── */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo do plano</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Médicos selecionados ({selectedIds.size})
              </p>
              <div className="space-y-2">
                {selectedMedicos.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={m.foto_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {m.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{m.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.especialidades.join(", ") || m.especialidade || "Clínico Geral"}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-medium">{brl(m.valor_mensal_centavos)}/mês</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing summary */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{brl(valorBruto)}</span>
              </div>
              {descontoPct > 0 && (
                <div className="flex justify-between text-sm text-success">
                  <span>Desconto progressivo ({descontoPct}%)</span>
                  <span>-{brl(valorBruto - valorFinal)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold border-t border-border pt-2">
                <span>Total mensal</span>
                <span>{brl(valorFinal)}</span>
              </div>
            </div>

            {regras.length > 0 && (
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p className="font-semibold">Tabela de descontos:</p>
                {regras.map((r) => (
                  <p key={r.qtd_medicos_min}>
                    • A partir de {r.qtd_medicos_min} médicos: {r.desconto_pct}% de desconto
                  </p>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Após confirmar, cada médico receberá uma notificação para aceitar a participação. O plano será ativado
              quando todos aceitarem.
            </p>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button onClick={confirmar} disabled={saving || jaTemPlanoAtivo}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Confirmar plano
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── STEP 3: Confirmado ─── */}
      {step === 3 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
            <h3 className="text-lg font-semibold">Plano criado com sucesso!</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Aguardando aceite dos médicos. Você será notificado quando todos confirmarem.
            </p>
            <Button variant="outline" className="mt-6" onClick={() => window.location.href = "/app/paciente/plano"}>
              Ver Meu Plano
            </Button>
          </CardContent>
        </Card>
      )}

      <TermsAcceptanceDialog
        tipo="plano_plataforma"
        open={termsPlano.showDialog}
        onOpenChange={termsPlano.setShowDialog}
        onAccepted={termsPlano.onAccepted}
      />
    </PageShell>
  );
}
