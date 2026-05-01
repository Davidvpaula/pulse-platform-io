import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Taxa = { id?: string; tipo: string; valor_pct: number; valor_fixo_centavos: number; ativo: boolean };

export function TaxaPlataformaConfig() {
  const [taxa, setTaxa] = useState<Taxa>({ tipo: "percentual", valor_pct: 10, valor_fixo_centavos: 0, ativo: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("plano_taxa_plataforma")
        .select("*")
        .eq("ativo", true)
        .order("vigencia_inicio", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setTaxa(data as Taxa);
      setLoading(false);
    })();
  }, []);

  const toReais = (c: number) => ((c || 0) / 100).toFixed(2).replace(".", ",");
  const toCentavos = (s: string) => Math.round(Number(s.replace(",", ".") || 0) * 100);

  async function salvar() {
    setSaving(true);
    try {
      // Desativar taxa anterior
      if (taxa.id) {
        await supabase.from("plano_taxa_plataforma").update({ ativo: false }).eq("id", taxa.id);
      }
      // Criar nova
      const { error } = await supabase.from("plano_taxa_plataforma").insert({
        tipo: taxa.tipo,
        valor_pct: taxa.valor_pct,
        valor_fixo_centavos: taxa.valor_fixo_centavos,
        ativo: true,
      });
      if (error) throw error;
      toast.success("Taxa da plataforma atualizada");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Taxa da Plataforma sobre Planos de Médicos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Defina quanto a plataforma cobra sobre cada plano criado por médicos. Aplicado automaticamente no snapshot financeiro.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label>Tipo</Label>
            <Select value={taxa.tipo} onValueChange={v => setTaxa(t => ({ ...t, tipo: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percentual">Percentual (%)</SelectItem>
                <SelectItem value="fixo">Valor fixo (R$)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {taxa.tipo === "percentual" ? (
            <div>
              <Label>Percentual (%)</Label>
              <Input type="number" step="0.5" value={taxa.valor_pct} onChange={e => setTaxa(t => ({ ...t, valor_pct: Number(e.target.value) }))} />
            </div>
          ) : (
            <div>
              <Label>Valor fixo (R$)</Label>
              <Input value={toReais(taxa.valor_fixo_centavos)} onChange={e => setTaxa(t => ({ ...t, valor_fixo_centavos: toCentavos(e.target.value) }))} />
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={salvar} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Salvar taxa
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
