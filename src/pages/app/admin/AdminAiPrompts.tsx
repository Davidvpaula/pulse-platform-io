import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function AdminAiPrompts() {
  const [rows, setRows] = useState<any[]>([]);
  const load = () => supabase.from("ai_prompts").select("*").order("tipo").order("versao", { ascending: false }).then(({ data }) => setRows(data || []));
  useEffect(() => { load(); }, []);

  async function save(p: any) {
    const { error } = await supabase.from("ai_prompts").update({ system_prompt: p.system_prompt, nome: p.nome, ativo: p.ativo }).eq("id", p.id);
    if (error) toast.error(error.message); else { toast.success("Salvo"); load(); }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Prompts da IA Assistiva" description="Versões dos prompts usados pelo copiloto. Apenas um ativo por tipo." />
      {rows.map(p => (
        <Card key={p.id} className="p-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{p.tipo}</Badge>
            <Input className="max-w-xs" value={p.nome} onChange={e => setRows(rows.map(r => r.id === p.id ? { ...r, nome: e.target.value } : r))} />
            <span className="text-xs text-muted-foreground">v{p.versao}</span>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs">Ativo</span>
              <Switch checked={p.ativo} onCheckedChange={(v) => setRows(rows.map(r => r.id === p.id ? { ...r, ativo: v } : r))} />
              <Button size="sm" onClick={() => save(p)}>Salvar</Button>
            </div>
          </div>
          <Textarea rows={6} value={p.system_prompt} onChange={e => setRows(rows.map(r => r.id === p.id ? { ...r, system_prompt: e.target.value } : r))} />
        </Card>
      ))}
    </div>
  );
}
