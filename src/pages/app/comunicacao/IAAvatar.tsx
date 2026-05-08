import { useEffect, useState, useCallback } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sparkles, ShieldAlert, BookOpen, ArrowRightLeft, UserSearch, Settings2,
  Plus, Trash2, Loader2, Send, Sliders, Activity,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { AiAvatarSupervisorDashboard } from "@/components/comunicacao/avatar/AiAvatarSupervisorDashboard";

const PROVIDERS = [
  { value: "lovable", label: "Lovable AI Gateway (Gemini/GPT-5)" },
];

const MODELS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-pro",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
];

const DEFAULT_PROMPT = `Você é o assistente virtual da Lasmar Telemed.

Seu objetivo é:
- Ajudar o paciente com dúvidas
- Sugerir soluções de forma simples
- Conduzir naturalmente para agendamento quando fizer sentido
- Nunca forçar venda
- Nunca dar diagnóstico médico

Regras:
- Seja cordial, breve e claro
- Use linguagem humana
- Evite respostas longas
- Sempre tente resolver antes de transferir
- Só transfira quando necessário
- Nunca acessar dados sensíveis
- Nunca inventar informações`;

const REGRAS_PADRAO = `1. Nunca diagnosticar ou prescrever.
2. Em caso de dor intensa, risco de vida, sangramento, falta de ar, ideação suicida ou emergência: orientar pronto-atendimento e transferir para humano imediatamente.
3. Nunca acessar prontuário, dados clínicos ou financeiros sigilosos.
4. Nunca falar em nome de médico sem instrução explícita.
5. Nunca iniciar conversa — só responder quando o paciente já escreveu.
6. Em dúvida, sempre transferir para humano.`;

type HandoffRule = {
  id?: string;
  ai_settings_id?: string;
  keyword: string;
  intent: string;
  level: "urgente" | "moderado" | "baixo";
  action: string;
  sort_order: number;
  active: boolean;
};

const LEVEL_META: Record<string, { label: string; color: string; emoji: string }> = {
  urgente: { label: "Urgente", color: "bg-red-500/10 text-red-500 border-red-500/30", emoji: "🔴" },
  moderado: { label: "Moderado", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30", emoji: "🟡" },
  baixo: { label: "Baixo", color: "bg-green-500/10 text-green-500 border-green-500/30", emoji: "🟢" },
};

export default function IAAvatar() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Handoff rules
  const [rules, setRules] = useState<HandoffRule[]>([]);
  const [ruleDialog, setRuleDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<HandoffRule | null>(null);

  // Simulation
  const [simInput, setSimInput] = useState("");
  const [simOutput, setSimOutput] = useState("");
  const [simLoading, setSimLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ai_settings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const s = data || {
      provider: "lovable",
      model: "google/gemini-2.5-flash",
      active: false,
      base_prompt: DEFAULT_PROMPT,
      knowledge_base: "",
      safety_rules: REGRAS_PADRAO,
      max_tokens: 1024,
      temperature: 0.4,
      handoff_keywords: [],
      sugestao_medicos_ativa: false,
      sugestao_prioridade: { avaliacao: 0.5, disponibilidade: 0.3, custo: 0.2 },
    };
    setSettings(s);

    if (data?.id) {
      const { data: rulesData } = await supabase
        .from("ai_handoff_rules")
        .select("*")
        .eq("ai_settings_id", data.id)
        .order("sort_order");
      setRules((rulesData as any[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function salvar() {
    if (!settings) return;
    setSaving(true);
    const payload = {
      provider: settings.provider,
      model: settings.model,
      active: settings.active,
      base_prompt: settings.base_prompt,
      knowledge_base: settings.knowledge_base,
      safety_rules: settings.safety_rules,
      max_tokens: settings.max_tokens,
      temperature: settings.temperature,
      handoff_keywords: settings.handoff_keywords || [],
      sugestao_medicos_ativa: settings.sugestao_medicos_ativa,
      sugestao_prioridade: settings.sugestao_prioridade,
    };
    const { error } = settings.id
      ? await supabase.from("ai_settings").update(payload).eq("id", settings.id)
      : await supabase.from("ai_settings").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Configurações salvas");
    load();
  }

  // Handoff rules CRUD
  async function salvarRegra() {
    if (!editingRule || !settings?.id) return;
    const payload = {
      ai_settings_id: settings.id,
      keyword: editingRule.keyword,
      intent: editingRule.intent || null,
      level: editingRule.level,
      action: editingRule.action,
      sort_order: editingRule.sort_order,
      active: editingRule.active,
    };
    const { error } = editingRule.id
      ? await supabase.from("ai_handoff_rules").update(payload).eq("id", editingRule.id)
      : await supabase.from("ai_handoff_rules").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Regra salva");
    setRuleDialog(false);
    setEditingRule(null);
    load();
  }

  async function removerRegra(id: string) {
    const { error } = await supabase.from("ai_handoff_rules").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Regra removida");
    load();
  }

  // Real simulation
  async function simular() {
    if (!simInput.trim()) return;
    setSimLoading(true);
    setSimOutput("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-respond", {
        body: { message: simInput, simulate: true },
      });
      if (error) throw error;
      setSimOutput(data?.response || "Sem resposta");
    } catch (e: any) {
      setSimOutput(`Erro: ${e.message || "Falha ao chamar IA"}`);
    } finally {
      setSimLoading(false);
    }
  }

  function openNewRule() {
    if (!settings?.id) {
      toast.error("Salve as configurações primeiro para adicionar regras.");
      return;
    }
    setEditingRule({
      keyword: "", intent: "", level: "moderado", action: "transferir",
      sort_order: rules.length, active: true,
    });
    setRuleDialog(true);
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="IA Avatar"
        description="Atendente virtual inteligente. Configure prompt, transferência, segurança, modos operacionais e supervisão."
      />

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config"><Settings2 className="h-3 w-3 mr-1" />Configuração</TabsTrigger>
          <TabsTrigger value="operacao"><Sliders className="h-3 w-3 mr-1" />Operação</TabsTrigger>
          <TabsTrigger value="supervisor"><Activity className="h-3 w-3 mr-1" />Supervisor</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">

      {/* Card 1 — Configuração Geral */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" />
                Configuração Geral
              </CardTitle>
              <CardDescription>Provider, modelo, parâmetros e ativação.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={settings?.active || false}
                onCheckedChange={(v) => setSettings({ ...settings, active: v })}
              />
              <Badge variant={settings?.active ? "default" : "outline"}>
                {settings?.active ? "Ativa" : "Inativa"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Provider</Label>
              <Select value={settings?.provider} onValueChange={(v) => setSettings({ ...settings, provider: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Modelo</Label>
              <Select value={settings?.model || "google/gemini-2.5-flash"} onValueChange={(v) => setSettings({ ...settings, model: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODELS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Max tokens</Label>
              <Input type="number" value={settings?.max_tokens || 1024}
                onChange={(e) => setSettings({ ...settings, max_tokens: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Temperatura</Label>
              <Input type="number" step="0.1" value={settings?.temperature || 0.4}
                onChange={(e) => setSettings({ ...settings, temperature: Number(e.target.value) })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Card 2 — Prompt Base */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              Prompt Base
            </CardTitle>
            <CardDescription>Personalidade e instruções gerais da IA.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea rows={12} value={settings?.base_prompt || ""}
              onChange={(e) => setSettings({ ...settings, base_prompt: e.target.value })} />
          </CardContent>
        </Card>

        {/* Card 3 — Base de Conhecimento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Base de Conhecimento
            </CardTitle>
            <CardDescription>FAQ, serviços, políticas, horários. A IA consulta isso antes de responder.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea rows={12} value={settings?.knowledge_base || ""}
              onChange={(e) => setSettings({ ...settings, knowledge_base: e.target.value })}
              placeholder="Ex.: Horário de atendimento: seg-sex 8h-18h. Retorno gratuito em até 30 dias..." />
          </CardContent>
        </Card>

        {/* Card 4 — Transferência Inteligente */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-orange-500" />
                  Transferência Inteligente
                </CardTitle>
                <CardDescription>Regras por nível de urgência para transferir para humano.</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={openNewRule}>
                <Plus className="h-3 w-3 mr-1" /> Regra
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {rules.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma regra cadastrada. Adicione regras de transferência.</p>
            ) : (
              <div className="space-y-2">
                {rules.map((r) => {
                  const meta = LEVEL_META[r.level];
                  return (
                    <div key={r.id} className="flex items-center justify-between p-2 rounded-md border bg-card">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Badge variant="outline" className={`text-xs ${meta.color}`}>
                          {meta.emoji} {meta.label}
                        </Badge>
                        <span className="text-sm font-medium truncate">{r.keyword}</span>
                        {r.intent && (
                          <span className="text-xs text-muted-foreground truncate hidden sm:inline">— {r.intent}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7"
                          onClick={() => { setEditingRule({ ...r } as HandoffRule); setRuleDialog(true); }}>
                          <Settings2 className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                          onClick={() => r.id && removerRegra(r.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 5 — Sugestão Inteligente de Médicos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <UserSearch className="h-4 w-4 text-blue-500" />
                  Sugestão Inteligente de Médicos
                </CardTitle>
                <CardDescription>Permite que a IA recomende médicos com base em especialidade, avaliação e disponibilidade.</CardDescription>
              </div>
              <Switch
                checked={settings?.sugestao_medicos_ativa || false}
                onCheckedChange={(v) => setSettings({ ...settings, sugestao_medicos_ativa: v })}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {settings?.sugestao_medicos_ativa && (
              <>
                <p className="text-xs text-muted-foreground">
                  A IA vai consultar a base de médicos, ranking e agenda para sugerir profissionais automaticamente.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Peso: Avaliação</Label>
                    <Input type="number" step="0.1" min="0" max="1"
                      value={settings?.sugestao_prioridade?.avaliacao ?? 0.5}
                      onChange={(e) => setSettings({
                        ...settings,
                        sugestao_prioridade: { ...settings.sugestao_prioridade, avaliacao: Number(e.target.value) }
                      })} />
                  </div>
                  <div>
                    <Label className="text-xs">Peso: Disponibilidade</Label>
                    <Input type="number" step="0.1" min="0" max="1"
                      value={settings?.sugestao_prioridade?.disponibilidade ?? 0.3}
                      onChange={(e) => setSettings({
                        ...settings,
                        sugestao_prioridade: { ...settings.sugestao_prioridade, disponibilidade: Number(e.target.value) }
                      })} />
                  </div>
                  <div>
                    <Label className="text-xs">Peso: Custo</Label>
                    <Input type="number" step="0.1" min="0" max="1"
                      value={settings?.sugestao_prioridade?.custo ?? 0.2}
                      onChange={(e) => setSettings({
                        ...settings,
                        sugestao_prioridade: { ...settings.sugestao_prioridade, custo: Number(e.target.value) }
                      })} />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Card 6 — Segurança */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-500" />
            Regras de Segurança
          </CardTitle>
          <CardDescription>Limites obrigatórios da IA. Edite com cuidado.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea rows={8} value={settings?.safety_rules || ""}
            onChange={(e) => setSettings({ ...settings, safety_rules: e.target.value })} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={salvar} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar configurações
        </Button>
      </div>

      {/* Simulação Real */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Send className="h-4 w-4" />
            Simular Resposta (Real)
          </CardTitle>
          <CardDescription>Envia a mensagem para a IA com todas as configurações ativas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Mensagem do paciente</Label>
            <Textarea rows={3} value={simInput} onChange={(e) => setSimInput(e.target.value)}
              placeholder="Ex.: Quero marcar uma consulta com pediatra" />
          </div>
          <Button size="sm" variant="outline" onClick={simular} disabled={simLoading || !settings?.active}>
            {simLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {simLoading ? "Consultando IA…" : "Simular"}
          </Button>
          {!settings?.active && (
            <p className="text-xs text-muted-foreground">Ative a IA para simular respostas reais.</p>
          )}
          {simOutput && (
            <div className="bg-muted p-4 rounded-md prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{simOutput}</ReactMarkdown>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="operacao" className="space-y-4">
          <OperacaoTab settings={settings} setSettings={setSettings} salvar={salvar} saving={saving} />
        </TabsContent>

        <TabsContent value="supervisor">
          <AiAvatarSupervisorDashboard />
        </TabsContent>
      </Tabs>

      {/* Dialog para adicionar/editar regra de handoff */}
      <Dialog open={ruleDialog} onOpenChange={setRuleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule?.id ? "Editar" : "Nova"} Regra de Transferência</DialogTitle>
          </DialogHeader>
          {editingRule && (
            <div className="space-y-4">
              <div>
                <Label>Palavra-chave ou intenção</Label>
                <Input value={editingRule.keyword}
                  onChange={(e) => setEditingRule({ ...editingRule, keyword: e.target.value })}
                  placeholder="Ex.: dor no peito, emergência, suicídio" />
              </div>
              <div>
                <Label>Descrição da intenção (opcional)</Label>
                <Input value={editingRule.intent}
                  onChange={(e) => setEditingRule({ ...editingRule, intent: e.target.value })}
                  placeholder="Ex.: Paciente relata risco de vida" />
              </div>
              <div>
                <Label>Nível</Label>
                <Select value={editingRule.level}
                  onValueChange={(v) => setEditingRule({ ...editingRule, level: v as HandoffRule["level"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgente">🔴 Urgente — Transferir imediatamente</SelectItem>
                    <SelectItem value="moderado">🟡 Moderado — IA tenta, depois transfere</SelectItem>
                    <SelectItem value="baixo">🟢 Baixo — IA resolve</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ação</Label>
                <Input value={editingRule.action}
                  onChange={(e) => setEditingRule({ ...editingRule, action: e.target.value })}
                  placeholder="Ex.: transferir, alertar, resolver" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editingRule.active}
                  onCheckedChange={(v) => setEditingRule({ ...editingRule, active: v })} />
                <Label>Regra ativa</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialog(false)}>Cancelar</Button>
            <Button onClick={salvarRegra} disabled={!editingRule?.keyword?.trim()}>Salvar Regra</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
