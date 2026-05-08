import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  itemKey: string;
  label: string;
  descricao?: string | null;
  obrigatorio: boolean;
  ok: boolean;
  evidencia?: string | null;
  onChange: () => void;
};

export function ChecklistGoLiveItem({
  itemKey,
  label,
  descricao,
  obrigatorio,
  ok,
  evidencia,
  onChange,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [evidText, setEvidText] = useState(evidencia ?? "");

  async function toggle(next: boolean) {
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("producao_checklist_status").upsert({
        item_key: itemKey,
        ok: next,
        evidencia: evidText || null,
        conferido_por: u?.user?.id ?? null,
        conferido_em: next ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      onChange();
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function saveEvid() {
    setSaving(true);
    try {
      const { error } = await supabase.from("producao_checklist_status").upsert({
        item_key: itemKey,
        ok,
        evidencia: evidText || null,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("Evidência salva");
      onChange();
    } catch (e: any) {
      toast.error(e.message ?? "Falha");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-3">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={ok}
          disabled={saving}
          onCheckedChange={(v) => toggle(!!v)}
          className="mt-1"
        />
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{label}</span>
            {obrigatorio && <Badge variant="outline" className="text-[10px]">Obrigatório</Badge>}
            {ok && <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px]">OK</Badge>}
          </div>
          {descricao && <p className="text-xs text-muted-foreground">{descricao}</p>}
          <div className="flex gap-2">
            <Input
              placeholder="Evidência (link, texto, ID...)"
              value={evidText}
              onChange={(e) => setEvidText(e.target.value)}
              onBlur={saveEvid}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
