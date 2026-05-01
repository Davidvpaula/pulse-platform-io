import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Regra = { id?: string; qtd_medicos_min: number; desconto_pct: number; ativo: boolean };

export function DescontoProgressivoConfig() {
  const [regras, setRegras] = useState<Regra[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("desconto_progressivo_regras")
      .select("*")
      .order("qtd_medicos_min");
    setRegras((data ?? []) as Regra[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function addRow() {
    setRegras(prev => [...prev, { qtd_medicos_min: prev.length + 2, desconto_pct: 0, ativo: true }]);
  }

  function update(i: number, patch: Partial<Regra>) {
    setRegras(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }

  function remove(i: number) {
    setRegras(prev => prev.filter((_, idx) => idx !== i));
  }

  async function salvar() {
    setSaving(true);
    try {
      // Delete all and reinsert
      await supabase.from("desconto_progressivo_regras").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (regras.length > 0) {
        const rows = regras.map(r => ({
          qtd_medicos_min: r.qtd_medicos_min,
          desconto_pct: r.desconto_pct,
          ativo: r.ativo,
        }));
        const { error } = await supabase.from("desconto_progressivo_regras").insert(rows);
        if (error) throw error;
      }
      toast.success("Regras de desconto salvas");
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Regras de Desconto Progressivo</CardTitle>
        <Button size="sm" variant="outline" onClick={addRow}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          Configure descontos automáticos quando o paciente seleciona múltiplos médicos no plano personalizado.
        </p>
        {regras.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma regra cadastrada. Adicione a primeira.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Qtd. mínima de médicos</TableHead>
                <TableHead>Desconto (%)</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {regras.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Input type="number" min={2} value={r.qtd_medicos_min} onChange={e => update(i, { qtd_medicos_min: Number(e.target.value) })} className="w-24" />
                  </TableCell>
                  <TableCell>
                    <Input type="number" step="0.5" min={0} max={100} value={r.desconto_pct} onChange={e => update(i, { desconto_pct: Number(e.target.value) })} className="w-24" />
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="flex justify-end mt-4">
          <Button onClick={salvar} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Salvar regras
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
