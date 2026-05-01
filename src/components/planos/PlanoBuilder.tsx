import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SaudeFinanceiraCard } from "./SaudeFinanceiraCard";
import { BeneficioSelector } from "./BeneficioSelector";

type Plano = any;
type Beneficio = any;

interface Props {
  open: boolean;
  onClose: () => void;
  planoId?: string | null;
  onSaved?: () => void;
}

const CATEGORIAS = [
  ["saude_mental", "Saúde mental"],
  ["fitness", "Fitness"],
  ["clinico_geral", "Clínico geral"],
  ["infantil", "Infantil"],
  ["empresarial", "Empresarial"],
  ["personalizado", "Personalizado"],
] as const;

const PUBLICOS = [
  ["paciente", "Paciente"],
  ["empresa", "Empresa"],
  ["ambos", "Ambos"],
] as const;

const COBRANCAS = [
  ["gratuito", "Gratuito"],
  ["valor_fixo", "Valor fixo"],
  ["mensal", "Mensal"],
  ["anual", "Anual"],
  ["por_uso", "Por uso"],
  ["por_colaborador", "Por colaborador"],
  ["hibrido", "Híbrido"],
] as const;

const STATUS = [
  ["rascunho", "Rascunho"],
  ["ativo", "Ativo"],
  ["inativo", "Inativo"],
  ["arquivado", "Arquivado"],
] as const;

const BENEF_TIPOS = [
  ["especialidade", "Especialidade"],
  ["medico", "Médico"],
  ["servico", "Serviço"],
  ["categoria", "Categoria"],
  ["desconto_geral", "Desconto geral"],
] as const;

const PERIODOS = [
  ["semanal", "Semanal"],
  ["mensal", "Mensal"],
  ["anual", "Anual"],
  ["total", "Total do plano"],
] as const;

function emptyPlano(): Plano {
  return {
    nome: "",
    descricao: "",
    descricao_comercial: "",
    categoria: "personalizado",
    publico: "paciente",
    modelo_cobranca: "mensal",
    status: "rascunho",
    valor_mensal_centavos: 0,
    valor_anual_centavos: 0,
    valor_promocional_centavos: null,
    taxa_adesao_centavos: 0,
    custo_operacional_centavos: 0,
    taxa_pagamento_pct: 4,
    imposto_estimado_pct: 10,
    desconto_geral_pct: 0,
    publicado_site: false,
    destacado: false,
    ordem_exibicao: 0,
    cta_texto: "Quero esse plano",
  };
}

function emptyBeneficio(planoId?: string): Beneficio {
  return {
    plano_id: planoId,
    tipo: "especialidade",
    nome: "",
    quantidade: 1,
    ilimitado: false,
    periodo: "mensal",
    acumulativo: false,
    custo_estimado_centavos: 0,
    valor_adicional_centavos: 0,
    desconto_pct: 0,
  };
}

const toReais = (c: number) => ((c || 0) / 100).toString().replace(".", ",");
const toCentavos = (s: string) => Math.round(Number(String(s).replace(/\./g, "").replace(",", ".") || 0) * 100);

export function PlanoBuilder({ open, onClose, planoId, onSaved }: Props) {
  const [plano, setPlano] = useState<Plano>(emptyPlano());
  const [beneficios, setBeneficios] = useState<Beneficio[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (planoId) {
      void carregar(planoId);
    } else {
      setPlano(emptyPlano());
      setBeneficios([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, planoId]);

  async function carregar(id: string) {
    setLoading(true);
    const [{ data: p }, { data: bs }] = await Promise.all([
      supabase.from("planos").select("*").eq("id", id).maybeSingle(),
      supabase.from("plano_beneficios").select("*").eq("plano_id", id).order("ordem"),
    ]);
    if (p) setPlano(p);
    setBeneficios(bs ?? []);
    setLoading(false);
  }

  function setField<K extends keyof Plano>(k: K, v: Plano[K]) {
    setPlano((p: Plano) => ({ ...p, [k]: v }));
  }

  function addBeneficio() {
    setBeneficios((bs) => [...bs, emptyBeneficio(planoId ?? undefined)]);
  }

  function updateBen(i: number, patch: Partial<Beneficio>) {
    setBeneficios((bs) => bs.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }

  function removeBen(i: number) {
    setBeneficios((bs) => bs.filter((_, idx) => idx !== i));
  }

  async function salvar() {
    if (!plano.nome?.trim()) {
      toast.error("Informe o nome do plano");
      return;
    }
    setSaving(true);
    try {
      let id = planoId ?? null;
      const payload = { ...plano };
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;

      if (id) {
        const { error } = await supabase.from("planos").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("planos").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
      }

      // Sincroniza benefícios: apaga antigos e reinsere (simples e seguro para esta etapa)
      await supabase.from("plano_beneficios").delete().eq("plano_id", id!);
      if (beneficios.length > 0) {
        const rows = beneficios.map((b, idx) => {
          const r: any = { ...b, plano_id: id, ordem: idx };
          delete r.id;
          delete r.created_at;
          delete r.updated_at;
          return r;
        });
        const { error } = await supabase.from("plano_beneficios").insert(rows);
        if (error) throw error;
      }

      toast.success(planoId ? "Plano atualizado" : "Plano criado");
      onSaved?.();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar plano");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{planoId ? "Editar plano" : "Novo plano"}</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Dados básicos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dados básicos</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <Label>Nome do plano</Label>
                  <Input value={plano.nome ?? ""} onChange={(e) => setField("nome", e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Descrição comercial</Label>
                  <Textarea value={plano.descricao_comercial ?? ""} onChange={(e) => setField("descricao_comercial", e.target.value)} rows={2} />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={plano.categoria} onValueChange={(v) => setField("categoria", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIAS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Público-alvo</Label>
                  <Select value={plano.publico} onValueChange={(v) => setField("publico", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PUBLICOS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Modelo de cobrança</Label>
                  <Select value={plano.modelo_cobranca} onValueChange={(v) => setField("modelo_cobranca", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{COBRANCAS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={plano.status} onValueChange={(v) => setField("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Valores e custos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Valores e custos</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <Label>Valor mensal (R$)</Label>
                  <Input value={toReais(plano.valor_mensal_centavos)} onChange={(e) => setField("valor_mensal_centavos", toCentavos(e.target.value))} />
                </div>
                <div>
                  <Label>Valor anual (R$)</Label>
                  <Input value={toReais(plano.valor_anual_centavos)} onChange={(e) => setField("valor_anual_centavos", toCentavos(e.target.value))} />
                </div>
                <div>
                  <Label>Taxa de adesão (R$)</Label>
                  <Input value={toReais(plano.taxa_adesao_centavos)} onChange={(e) => setField("taxa_adesao_centavos", toCentavos(e.target.value))} />
                </div>
                <div>
                  <Label>Custo operacional (R$/assinante)</Label>
                  <Input value={toReais(plano.custo_operacional_centavos)} onChange={(e) => setField("custo_operacional_centavos", toCentavos(e.target.value))} />
                </div>
                <div>
                  <Label>Taxa pagamento (%)</Label>
                  <Input type="number" step="0.1" value={plano.taxa_pagamento_pct ?? 0} onChange={(e) => setField("taxa_pagamento_pct", Number(e.target.value))} />
                </div>
                <div>
                  <Label>Imposto estimado (%)</Label>
                  <Input type="number" step="0.1" value={plano.imposto_estimado_pct ?? 0} onChange={(e) => setField("imposto_estimado_pct", Number(e.target.value))} />
                </div>
                <div>
                  <Label>Desconto geral (%)</Label>
                  <Input type="number" step="0.1" value={plano.desconto_geral_pct ?? 0} onChange={(e) => setField("desconto_geral_pct", Number(e.target.value))} />
                </div>
              </CardContent>
            </Card>

            {/* Benefícios */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Benefícios inclusos</CardTitle>
                <Button size="sm" variant="outline" onClick={addBeneficio}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {beneficios.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum benefício. Adicione consultas, descontos ou pacotes que compõem o plano.</p>
                )}
                {beneficios.map((b, i) => (
                  <div key={i} className="rounded-lg border p-3 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline">{BENEF_TIPOS.find(([v]) => v === b.tipo)?.[1]}</Badge>
                      <Button size="icon" variant="ghost" onClick={() => removeBen(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <Label>Tipo</Label>
                        <Select value={b.tipo} onValueChange={(v) => updateBen(i, { tipo: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{BENEF_TIPOS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2">
                        <Label>Nome</Label>
                        <Input value={b.nome ?? ""} onChange={(e) => updateBen(i, { nome: e.target.value })} placeholder="Ex.: Consulta com nutricionista" />
                      </div>
                      <div>
                        <Label>Quantidade</Label>
                        <Input type="number" value={b.quantidade ?? 0} onChange={(e) => updateBen(i, { quantidade: Number(e.target.value) })} disabled={b.ilimitado} />
                      </div>
                      <div>
                        <Label>Período</Label>
                        <Select value={b.periodo} onValueChange={(v) => updateBen(i, { periodo: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{PERIODOS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <Switch checked={!!b.ilimitado} onCheckedChange={(v) => updateBen(i, { ilimitado: v })} /> Ilimitado
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <Switch checked={!!b.acumulativo} onCheckedChange={(v) => updateBen(i, { acumulativo: v })} /> Acumula
                        </label>
                      </div>
                      <div>
                        <Label>Custo estimado por uso (R$)</Label>
                        <Input value={toReais(b.custo_estimado_centavos)} onChange={(e) => updateBen(i, { custo_estimado_centavos: toCentavos(e.target.value) })} />
                      </div>
                      <div>
                        <Label>Valor adicional após limite (R$)</Label>
                        <Input value={toReais(b.valor_adicional_centavos)} onChange={(e) => updateBen(i, { valor_adicional_centavos: toCentavos(e.target.value) })} />
                      </div>
                      <div>
                        <Label>Desconto (%)</Label>
                        <Input type="number" step="0.1" value={b.desconto_pct ?? 0} onChange={(e) => updateBen(i, { desconto_pct: Number(e.target.value) })} />
                      </div>
                      <div className="md:col-span-3">
                        <Label>Regra de uso</Label>
                        <Textarea rows={2} value={b.regra_uso ?? ""} onChange={(e) => updateBen(i, { regra_uso: e.target.value })} />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Publicação no site */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Publicação no site</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 text-sm col-span-2">
                  <Switch checked={!!plano.publicado_site} onCheckedChange={(v) => setField("publicado_site", v)} /> Exibir no site
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={!!plano.destacado} onCheckedChange={(v) => setField("destacado", v)} /> Destacar
                </label>
                <div>
                  <Label>Ordem</Label>
                  <Input type="number" value={plano.ordem_exibicao ?? 0} onChange={(e) => setField("ordem_exibicao", Number(e.target.value))} />
                </div>
                <div>
                  <Label>Texto do CTA</Label>
                  <Input value={plano.cta_texto ?? ""} onChange={(e) => setField("cta_texto", e.target.value)} />
                </div>
                <div className="md:col-span-3">
                  <Label>Imagem (URL)</Label>
                  <Input value={plano.imagem_url ?? ""} onChange={(e) => setField("imagem_url", e.target.value)} />
                </div>
              </CardContent>
            </Card>

            {/* Saúde financeira (apenas em edição) */}
            {planoId && <SaudeFinanceiraCard planoId={planoId} />}

            <div className="flex justify-end gap-2 pb-6">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={salvar} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Salvar plano
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
