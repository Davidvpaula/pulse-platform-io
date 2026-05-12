import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Settings, Stethoscope, Zap, Plus, Trash2, Loader2, CreditCard, AlertTriangle, Wallet, ArrowRight, ArrowUp, ArrowDown, ArrowDownAZ } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { type Especialidade } from "@/lib/clinico";
import { getProviderAtual, type PagamentoProvider } from "@/lib/pagamentos";
import { usePermission } from "@/lib/permissions/usePermission";

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

const Section = ({ icon: Icon, title, children, action }: { icon: typeof Settings; title: string; children: React.ReactNode; action?: React.ReactNode }) => (
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

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminConfiguracoes() {
  const { has } = usePermission("financeiro.editar_comissao");
  const podeRepasse = has("financeiro.editar_comissao");
  const [esps, setEsps] = useState<Especialidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoNome, setNovoNome] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [criando, setCriando] = useState(false);

  // Pagamentos
  const [provider, setProvider] = useState<PagamentoProvider>("mock");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("especialidades")
      .select("*")
      .order("ordem", { ascending: true })
      .order("nome", { ascending: true });
    setEsps((data ?? []) as Especialidade[]);
    setProvider(await getProviderAtual());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const criarEspecialidade = async () => {
    if (!novoNome.trim()) { toast.error("Informe o nome."); return; }
    setCriando(true);
    const maxOrdem = esps.reduce((m, e) => Math.max(m, (e as any).ordem ?? 0), 0);
    const { error } = await (supabase.from("especialidades") as any).insert({
      nome: novoNome.trim(),
      slug: slugify(novoNome),
      descricao: novaDescricao.trim() || null,
      ativo: true,
      ordem: maxOrdem + 10,
    });
    setCriando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Especialidade criada.");
    setNovoNome(""); setNovaDescricao("");
    load();
  };

  const moverEspecialidade = async (index: number, direcao: -1 | 1) => {
    const alvo = esps[index];
    const vizinho = esps[index + direcao];
    if (!alvo || !vizinho) return;
    const ordemAlvo = (alvo as any).ordem ?? (index + 1) * 10;
    const ordemVizinho = (vizinho as any).ordem ?? (index + 1 + direcao) * 10;

    // Atualização otimista
    const novoArr = [...esps];
    novoArr[index] = { ...alvo, ordem: ordemVizinho } as any;
    novoArr[index + direcao] = { ...vizinho, ordem: ordemAlvo } as any;
    novoArr.sort((a: any, b: any) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.nome.localeCompare(b.nome));
    setEsps(novoArr);

    const [r1, r2] = await Promise.all([
      (supabase.from("especialidades") as any).update({ ordem: ordemVizinho }).eq("id", alvo.id),
      (supabase.from("especialidades") as any).update({ ordem: ordemAlvo }).eq("id", vizinho.id),
    ]);
    if (r1.error || r2.error) {
      toast.error("Não foi possível reordenar.");
      load();
    }
  };

  const reordenarAlfabetico = async () => {
    if (!confirm("Recolocar todas as especialidades em ordem alfabética?")) return;
    const ordenado = [...esps].sort((a, b) => a.nome.localeCompare(b.nome));
    setEsps(ordenado.map((e, i) => ({ ...(e as any), ordem: (i + 1) * 10 })));
    await Promise.all(
      ordenado.map((e, i) =>
        (supabase.from("especialidades") as any).update({ ordem: (i + 1) * 10 }).eq("id", e.id),
      ),
    );
    toast.success("Ordem alfabética aplicada.");
    load();
  };

  const toggleAtivo = async (e: Especialidade) => {
    const { error } = await supabase
      .from("especialidades")
      .update({ ativo: !e.ativo })
      .eq("id", e.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${e.nome} ${!e.ativo ? "ativada" : "desativada"}.`);
    load();
  };

  const excluir = async (e: Especialidade) => {
    // Verifica vínculos antes
    const { count: vinculosCount } = await supabase
      .from("medico_especialidades")
      .select("*", { count: "exact", head: true })
      .eq("especialidade_id", e.id);

    if ((vinculosCount ?? 0) > 0) {
      const ok = confirm(
        `"${e.nome}" está vinculada a ${vinculosCount} médico(s).\n\n` +
        `Excluir vai remover esses vínculos também. Deseja continuar?\n\n` +
        `(Dica: você também pode apenas DESATIVAR a especialidade.)`
      );
      if (!ok) return;
      const { error: errVinc } = await supabase
        .from("medico_especialidades")
        .delete()
        .eq("especialidade_id", e.id);
      if (errVinc) { toast.error("Falha ao remover vínculos: " + errVinc.message); return; }
    } else {
      if (!confirm(`Excluir "${e.nome}"?`)) return;
    }

    const { error } = await supabase.from("especialidades").delete().eq("id", e.id);
    if (error) {
      toast.error(
        error.message.includes("foreign key")
          ? "Não foi possível excluir: ainda existem registros vinculados a esta especialidade. Tente desativá-la."
          : error.message
      );
      return;
    }
    toast.success("Excluída.");
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações da plataforma"
        description="Especialidades disponíveis no site e atalhos para módulos de gestão."
      />

      {/* Atalho: Repasse financeiro (apenas com capability) */}
      {podeRepasse && (
        <Link
          to="/app/admin/financeiro/repasse"
          className="card-elevated group flex items-center justify-between gap-4 p-5 transition hover:border-primary/40"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-base font-semibold">Repasse financeiro · Médicos</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Defina o % de repasse global das consultas particulares e configure exceções por médico.
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
        </Link>
      )}
      {/* Atalho: Atendimento imediato */}
      <Link
        to="/app/admin/atendimento-imediato"
        className="card-elevated group flex items-center justify-between gap-4 p-5 transition hover:border-emerald-400/60"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-100 p-2.5 text-emerald-700 dark:bg-emerald-950/40">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-base font-semibold">Atendimento imediato</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Edite preço, duração e repasse do serviço público — reflete no calendário compartilhado em tempo real.
            </p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-emerald-600" />
      </Link>
      {/* Pagamentos */}
      <Section
        icon={CreditCard}
        title="Pagamentos"
        action={
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
              provider === "stripe"
                ? "border-success/30 bg-success/10 text-success"
                : "border-warning/30 bg-warning/10 text-warning",
            )}
          >
            {provider === "stripe" ? "Stripe conectado" : "Modo simulado (dev)"}
          </span>
        }
      >
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm">
              Provider atual: <strong className="capitalize">{provider}</strong>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {provider === "mock"
                ? "Checkout simulado para desenvolvimento. Nenhum valor é cobrado e os pagamentos são confirmados localmente."
                : "Pagamentos reais via Stripe. Webhooks confirmam o pagamento e liberam a consulta."}
            </p>
          </div>
          <Button variant="outline" disabled title="Será habilitado quando ligarmos o Stripe">
            Conectar Stripe (em breve)
          </Button>
        </div>
        {provider === "mock" && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <span>
              Toda a infraestrutura (tabela <code className="font-mono">pagamentos</code>, RLS,
              fluxo de checkout/sucesso/cancelado) já está pronta. Para ativar o Stripe basta
              conectar a chave e implementar a edge function de Checkout Session.
            </span>
          </div>
        )}
      </Section>

      {/* Especialidades */}
      <Section
        icon={Stethoscope}
        title="Especialidades cadastradas"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={reordenarAlfabetico}
            disabled={loading || esps.length < 2}
            className="h-8"
            title="Recolocar todas em ordem alfabética"
          >
            <ArrowDownAZ className="mr-1.5 h-3.5 w-3.5" />
            Ordem A–Z
          </Button>
        }
      >
        <div className="space-y-4">
          {/* Form de criação */}
          <div className="rounded-lg border border-dashed border-border p-4">
            <div className="grid gap-3 md:grid-cols-[2fr_3fr_auto]">
              <Field label="Nome">
                <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Ex: Nutrologia" />
              </Field>
              <Field label="Descrição (opcional)">
                <Input value={novaDescricao} onChange={(e) => setNovaDescricao(e.target.value)} placeholder="Curta explicação exibida no site" />
              </Field>
              <div className="flex items-end">
                <Button onClick={criarEspecialidade} disabled={criando} className="bg-gradient-primary hover:opacity-90 w-full md:w-auto">
                  {criando ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
                  Adicionar
                </Button>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              A ordem definida aqui controla a exibição na home pública e nas listagens de especialidades.
            </p>
          </div>

          {/* Lista */}
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : esps.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhuma especialidade cadastrada ainda.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="grid grid-cols-12 gap-2 bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-3">Nome</div>
                <div className="col-span-4">Descrição</div>
                <div className="col-span-2 text-center">Ordem</div>
                <div className="col-span-1 text-center">Ativo</div>
                <div className="col-span-1 text-right">Ações</div>
              </div>
              <div className="divide-y divide-border">
                {esps.map((e, i) => (
                  <div key={e.id} className={cn("grid grid-cols-12 items-center gap-2 px-3 py-2.5 text-sm", !e.ativo && "opacity-60")}>
                    <div className="col-span-1 text-center">
                      <span className="inline-flex h-6 min-w-[1.75rem] items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground">
                        {i + 1}
                      </span>
                    </div>
                    <div className="col-span-3">
                      <p className="font-medium">{e.nome}</p>
                      <p className="text-[11px] text-muted-foreground">{e.slug}</p>
                    </div>
                    <div className="col-span-4 text-muted-foreground">{e.descricao || "—"}</div>
                    <div className="col-span-2 flex items-center justify-center gap-1">
                      <button
                        onClick={() => moverEspecialidade(i, -1)}
                        disabled={i === 0}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                        title="Mover para cima"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => moverEspecialidade(i, 1)}
                        disabled={i === esps.length - 1}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                        title="Mover para baixo"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={e.ativo}
                        onChange={() => toggleAtivo(e)}
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        onClick={() => excluir(e)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
