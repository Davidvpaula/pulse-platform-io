import { useEffect, useState, useMemo } from "react";
import { brl } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, X, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Medico = { id: string; nome: string; especialidade: string };
type DescontoRegra = { qtd_medicos_min: number; desconto_pct: number };

export default function PacienteMontarPlano() {
  const { session } = useSession();
  const uid = session?.user?.id;

  const [step, setStep] = useState(1);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [regras, setRegras] = useState<DescontoRegra[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: m }, { data: r }] = await Promise.all([
        supabase.from("medicos").select("id, nome, especialidade").eq("status", "aprovado").order("nome"),
        supabase.from("desconto_progressivo_regras").select("qtd_medicos_min, desconto_pct").eq("ativo", true).order("qtd_medicos_min"),
      ]);
      setMedicos((m ?? []) as Medico[]);
      setRegras((r ?? []) as DescontoRegra[]);
      setLoading(false);
    })();
  }, []);

  const toggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
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

  // Placeholder base value (each doctor's plan base, simplified)
  const valorBasePorMedico = 15000; // R$ 150,00 placeholder
  const valorBruto = selectedIds.size * valorBasePorMedico;
  const valorFinal = Math.round(valorBruto * (1 - descontoPct / 100));

  

  const filtered = medicos.filter(m =>
    !busca || m.nome.toLowerCase().includes(busca.toLowerCase()) || m.especialidade.toLowerCase().includes(busca.toLowerCase())
  );

  async function confirmar() {
    if (!uid || selectedIds.size < 2) return;
    setSaving(true);
    try {
      // Create plano
      const { data: plano, error: pe } = await supabase.from("planos").insert({
        nome: `Plano personalizado — ${selectedIds.size} médicos`,
        nivel: "paciente_custom" as any,
        status: "rascunho" as any,
        valor_mensal_centavos: valorFinal,
        created_by: uid,
        categoria: "personalizado" as any,
        publico: "paciente" as any,
        modelo_cobranca: "mensal" as any,
        desconto_geral_pct: descontoPct,
      }).select("id").single();
      if (pe) throw pe;

      // Insert plano_medicos
      const rows = Array.from(selectedIds).map(mid => ({
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

  if (loading) {
    return (
      <PageShell title="Montar Plano">
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Monte seu Plano" subtitle="Escolha múltiplos médicos e ganhe desconto progressivo">
      {/* Steps */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map(s => (
          <div key={s} className={cn(
            "flex items-center gap-1.5 text-sm font-medium",
            s <= step ? "text-primary" : "text-muted-foreground"
          )}>
            <span className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-xs",
              s < step ? "bg-primary text-primary-foreground" : s === step ? "border-2 border-primary" : "border border-border"
            )}>{s < step ? <CheckCircle2 className="h-4 w-4" /> : s}</span>
            <span className="hidden sm:inline">{s === 1 ? "Escolher médicos" : s === 2 ? "Revisar" : "Confirmado"}</span>
            {s < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <>
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar médico ou especialidade..." value={busca} onChange={e => setBusca(e.target.value)} />
          </div>

          {selectedIds.size > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {Array.from(selectedIds).map(id => {
                const m = medicos.find(x => x.id === id);
                return m ? (
                  <Badge key={id} variant="secondary" className="gap-1">
                    {m.nome}
                    <button onClick={() => toggle(id)}><X className="h-3 w-3" /></button>
                  </Badge>
                ) : null;
              })}
            </div>
          )}

          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(m => {
              const selected = selectedIds.has(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggle(m.id)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors",
                    selected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  )}
                >
                  <p className="font-medium text-sm">{m.nome}</p>
                  <p className="text-xs text-muted-foreground">{m.especialidade}</p>
                  {selected && <CheckCircle2 className="h-4 w-4 text-primary mt-1" />}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <Button disabled={selectedIds.size < 2} onClick={() => setStep(2)}>
              Próximo <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo do plano</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Médicos selecionados ({selectedIds.size})</p>
              <div className="flex flex-wrap gap-2">
                {Array.from(selectedIds).map(id => {
                  const m = medicos.find(x => x.id === id);
                  return m ? <Badge key={id}>{m.nome} — {m.especialidade}</Badge> : null;
                })}
              </div>
            </div>

            {descontoPct > 0 && (
              <div className="rounded-lg bg-success/10 p-3">
                <p className="text-sm font-semibold text-success">🎉 Desconto progressivo: {descontoPct}%</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Valor base: {toReais(valorBruto)} → Valor final: <strong>{toReais(valorFinal)}</strong>/mês
                </p>
              </div>
            )}

            {regras.length > 0 && (
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p className="font-semibold">Tabela de descontos:</p>
                {regras.map(r => (
                  <p key={r.qtd_medicos_min}>• A partir de {r.qtd_medicos_min} médicos: {r.desconto_pct}% de desconto</p>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Após confirmar, cada médico receberá uma notificação para aceitar a participação. O plano será ativado quando todos aceitarem.
            </p>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
              <Button onClick={confirmar} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Confirmar plano
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
            <h3 className="text-lg font-semibold">Plano criado com sucesso!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Aguardando aceite dos médicos. Você será notificado quando todos confirmarem.
            </p>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
