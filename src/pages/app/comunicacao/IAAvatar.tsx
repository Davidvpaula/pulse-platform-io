import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ShieldAlert, BookOpen } from "lucide-react";
import { toast } from "sonner";

const PROVIDERS = [
  { value: "lovable", label: "Lovable AI Gateway (Gemini/GPT-5)" },
  { value: "openai", label: "OpenAI (futuro)" },
  { value: "anthropic", label: "Anthropic (futuro)" },
  { value: "gemini", label: "Gemini direto (futuro)" },
];

const REGRAS_PADRAO = `1. Nunca diagnosticar ou prescrever.
2. Em caso de dor intensa, risco de vida, sangramento, falta de ar, ideação suicida ou emergência: orientar pronto-atendimento e transferir para humano imediatamente.
3. Nunca acessar prontuário, dados clínicos ou financeiros sigilosos.
4. Nunca falar em nome de médico sem instrução explícita.
5. Nunca iniciar conversa — só responder quando o paciente já escreveu.
6. Em dúvida, sempre transferir para humano.`;

export default function IAAvatar() {
  const [settings, setSettings] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [simInput, setSimInput] = useState("");
  const [simOutput, setSimOutput] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("ai_settings").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
    setSettings(data || {
      provider: "lovable", model: "google/gemini-2.5-flash", active: false,
      base_prompt: "Você é o atendente virtual da Lasmar Telemed. Responda de forma cordial, breve e em português brasileiro.",
      knowledge_base: "", safety_rules: REGRAS_PADRAO, max_tokens: 1024, temperature: 0.4,
      handoff_keywords: ["humano", "atendente", "urgência", "emergência"],
    });
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function salvar() {
    if (!settings) return;
    const payload = {
      provider: settings.provider, model: settings.model, active: settings.active,
      base_prompt: settings.base_prompt, knowledge_base: settings.knowledge_base,
      safety_rules: settings.safety_rules, max_tokens: settings.max_tokens,
      temperature: settings.temperature, handoff_keywords: settings.handoff_keywords || [],
    };
    const { error } = settings.id
      ? await supabase.from("ai_settings").update(payload).eq("id", settings.id)
      : await supabase.from("ai_settings").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Configurações salvas");
    load();
  }

  function simular() {
    if (!simInput.trim()) return;
    setSimOutput("⚠️ Simulação real ficará disponível quando ativarmos a edge function `ai-respond` com o Lovable AI Gateway.\n\n[Pré-visualização do prompt]\n\n" +
      `Prompt base: ${settings?.base_prompt}\n\nMensagem do paciente: "${simInput}"\n\nA IA seria instruída a respeitar as regras de segurança e responder de forma cordial.`);
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="IA Avatar" description="Atendente virtual com IA. Configure provider, prompt, base de conhecimento e limites de segurança." />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-purple-500" />IA Avatar</CardTitle>
              <CardDescription>Quando ativa, responde mensagens de pacientes em fluxos liberados.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={settings.active} onCheckedChange={(v) => setSettings({ ...settings, active: v })} />
              <Badge variant={settings.active ? "default" : "outline"}>{settings.active ? "Ativa" : "Inativa"}</Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Provider e modelo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Provider</Label>
              <Select value={settings.provider} onValueChange={(v) => setSettings({ ...settings, provider: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROVIDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Modelo</Label>
              <Input value={settings.model || ""} onChange={(e) => setSettings({ ...settings, model: e.target.value })} placeholder="ex.: google/gemini-2.5-flash" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Max tokens</Label><Input type="number" value={settings.max_tokens || 1024} onChange={(e) => setSettings({ ...settings, max_tokens: Number(e.target.value) })} /></div>
              <div><Label>Temperatura</Label><Input type="number" step="0.1" value={settings.temperature || 0.4} onChange={(e) => setSettings({ ...settings, temperature: Number(e.target.value) })} /></div>
            </div>
            <div><Label>Palavras de transferência para humano (vírgula)</Label>
              <Input value={(settings.handoff_keywords || []).join(", ")} onChange={(e) => setSettings({ ...settings, handoff_keywords: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Prompt base</CardTitle></CardHeader>
          <CardContent>
            <Textarea rows={10} value={settings.base_prompt || ""} onChange={(e) => setSettings({ ...settings, base_prompt: e.target.value })} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4" />Base de conhecimento</CardTitle>
            <CardDescription>FAQ, regras de retorno, formas de pagamento, horários, instruções, links úteis, políticas, serviços.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea rows={10} value={settings.knowledge_base || ""} onChange={(e) => setSettings({ ...settings, knowledge_base: e.target.value })} placeholder="Ex.: Horário de atendimento: seg-sex 8h-18h. Retorno gratuito em até 30 dias..." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-red-500" />Regras de segurança</CardTitle>
            <CardDescription>Limites obrigatórios da IA. Editar com cuidado.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea rows={10} value={settings.safety_rules || ""} onChange={(e) => setSettings({ ...settings, safety_rules: e.target.value })} />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={salvar}>Salvar configurações</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Simular resposta</CardTitle><CardDescription>Pré-visualização sem chamar o provider real.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Mensagem do paciente</Label><Textarea rows={3} value={simInput} onChange={(e) => setSimInput(e.target.value)} /></div>
          <Button size="sm" variant="outline" onClick={simular}>Simular</Button>
          {simOutput && <pre className="text-xs bg-muted p-3 rounded whitespace-pre-wrap font-mono">{simOutput}</pre>}
        </CardContent>
      </Card>
    </div>
  );
}
