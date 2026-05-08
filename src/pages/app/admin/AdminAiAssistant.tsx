import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const MODELS = [
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-pro",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
];

export default function AdminAiAssistant() {
  const [s, setS] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("ai_assistant_settings").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setS(data));
  }, []);

  async function save() {
    if (!s) return;
    setSaving(true);
    const { error } = await supabase.from("ai_assistant_settings").update({
      enabled: s.enabled, provider: s.provider, model: s.model,
      temperature: s.temperature, max_tokens: s.max_tokens,
      auto_summary: s.auto_summary, auto_intent_detection: s.auto_intent_detection,
      auto_urgency_detection: s.auto_urgency_detection, auto_reply_suggestion: s.auto_reply_suggestion,
      daily_token_budget: s.daily_token_budget,
    }).eq("id", s.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Configuração salva");
  }

  if (!s) return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-4">
      <PageHeader title="IA Assistiva" description="Copiloto operacional para o Inbox. Sugere, resume e alerta — sem enviar mensagens automaticamente." />
      <Card className="p-4 space-y-4 max-w-2xl">
        <div className="flex items-center justify-between">
          <div><Label>Habilitar IA Assistiva</Label><p className="text-xs text-muted-foreground">Quando desligada, nenhuma chamada é feita.</p></div>
          <Switch checked={s.enabled} onCheckedChange={(v) => setS({ ...s, enabled: v })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Modelo</Label>
            <Select value={s.model} onValueChange={(v) => setS({ ...s, model: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MODELS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Temperatura</Label><Input type="number" step="0.1" value={s.temperature} onChange={e => setS({ ...s, temperature: Number(e.target.value) })} /></div>
          <div><Label>Max tokens</Label><Input type="number" value={s.max_tokens} onChange={e => setS({ ...s, max_tokens: Number(e.target.value) })} /></div>
          <div><Label>Orçamento diário (tokens)</Label><Input type="number" value={s.daily_token_budget} onChange={e => setS({ ...s, daily_token_budget: Number(e.target.value) })} /></div>
        </div>
        <div className="space-y-2">
          {[
            ["auto_summary", "Auto resumo ao abrir conversa"],
            ["auto_intent_detection", "Auto detecção de intenção"],
            ["auto_urgency_detection", "Auto detecção de urgência"],
            ["auto_reply_suggestion", "Auto sugestão de resposta"],
          ].map(([k, l]) => (
            <div key={k} className="flex items-center justify-between">
              <Label className="text-sm">{l}</Label>
              <Switch checked={!!s[k as string]} onCheckedChange={(v) => setS({ ...s, [k as string]: v })} />
            </div>
          ))}
        </div>
        <Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
      </Card>
      <p className="text-xs text-muted-foreground">Prompts: <a className="underline" href="/app/admin/ia-assistiva/prompts">gerenciar</a> · Métricas: <a className="underline" href="/app/admin/ia-assistiva/operacao">dashboard</a></p>
    </div>
  );
}
