import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus, Trash2, ChevronRight, Bot, Copy, Play } from "lucide-react";
import { toast } from "sonner";

type Flow = {
  id: string;
  name: string;
  description: string | null;
  channel: string;
  active: boolean;
  is_default: boolean;
  version: number;
  trigger_keywords: string[];
};
type Step = {
  id: string;
  flow_id: string;
  type: string;
  label: string | null;
  content: string | null;
  options: any;
  next_step_id: string | null;
  order_index: number;
};

const TIPOS = [
  "mensagem", "escolha", "condicao", "delay", "coletar_dado",
  "validar_cpf", "consultar_agendamento", "enviar_link", "encaminhar_humano", "finalizar",
];

export default function BotConfig() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [activeFlow, setActiveFlow] = useState<Flow | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [openFlow, setOpenFlow] = useState(false);
  const [openStep, setOpenStep] = useState(false);
  const [editFlow, setEditFlow] = useState<Partial<Flow>>({});
  const [editStep, setEditStep] = useState<Partial<Step>>({});

  async function loadFlows() {
    const { data } = await supabase.from("bot_flows").select("*").order("name");
    setFlows((data || []) as Flow[]);
  }
  async function loadSteps(flowId: string) {
    const { data } = await supabase.from("bot_steps").select("*").eq("flow_id", flowId).order("order_index");
    setSteps((data || []) as Step[]);
  }

  useEffect(() => { loadFlows(); }, []);
  useEffect(() => { if (activeFlow) loadSteps(activeFlow.id); else setSteps([]); }, [activeFlow]);

  async function salvarFlow() {
    if (!editFlow.name?.trim()) { toast.error("Nome obrigatório"); return; }
    const payload = {
      name: editFlow.name,
      description: editFlow.description || null,
      channel: (editFlow.channel as any) || "whatsapp",
      active: editFlow.active ?? false,
      trigger_keywords: editFlow.trigger_keywords || [],
    };
    const { error } = editFlow.id
      ? await supabase.from("bot_flows").update(payload).eq("id", editFlow.id)
      : await supabase.from("bot_flows").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Fluxo salvo");
    setOpenFlow(false);
    loadFlows();
  }

  async function duplicarFlow(f: Flow) {
    const { data: novo, error } = await supabase.from("bot_flows").insert({
      name: f.name + " (cópia)", description: f.description, channel: f.channel as any,
      active: false, version: f.version + 1, trigger_keywords: f.trigger_keywords,
    }).select().single();
    if (error || !novo) { toast.error(error?.message || "Erro"); return; }
    const { data: src } = await supabase.from("bot_steps").select("*").eq("flow_id", f.id);
    if (src && src.length) {
      await supabase.from("bot_steps").insert(src.map(s => ({
        flow_id: novo.id, type: s.type, label: s.label, content: s.content,
        options: s.options, conditions: s.conditions, order_index: s.order_index,
      })));
    }
    toast.success("Fluxo duplicado");
    loadFlows();
  }

  async function removerFlow(id: string) {
    if (!confirm("Remover fluxo e todos seus passos?")) return;
    await supabase.from("bot_flows").delete().eq("id", id);
    if (activeFlow?.id === id) setActiveFlow(null);
    loadFlows();
  }

  async function salvarStep() {
    if (!activeFlow) return;
    const payload = {
      flow_id: activeFlow.id,
      type: (editStep.type as any) || "mensagem",
      label: editStep.label || null,
      content: editStep.content || null,
      options: editStep.options || [],
      order_index: editStep.order_index ?? steps.length,
    };
    const { error } = editStep.id
      ? await supabase.from("bot_steps").update(payload).eq("id", editStep.id)
      : await supabase.from("bot_steps").insert(payload);
    if (error) { toast.error(error.message); return; }
    setOpenStep(false);
    loadSteps(activeFlow.id);
  }

  async function removerStep(id: string) {
    await supabase.from("bot_steps").delete().eq("id", id);
    if (activeFlow) loadSteps(activeFlow.id);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Bot" description="Fluxos automáticos para responder pacientes via WhatsApp." />

      <Tabs defaultValue="fluxos">
        <TabsList>
          <TabsTrigger value="fluxos">Fluxos</TabsTrigger>
          <TabsTrigger value="config">Configuração geral</TabsTrigger>
        </TabsList>

        <TabsContent value="fluxos" className="space-y-4">
          <div className="flex justify-end">
            <Sheet open={openFlow} onOpenChange={setOpenFlow}>
              <SheetTrigger asChild>
                <Button onClick={() => setEditFlow({ channel: "whatsapp", active: false, trigger_keywords: [] })}>
                  <Plus className="mr-2 h-4 w-4" />Novo fluxo
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[480px] sm:max-w-[480px]">
                <SheetHeader><SheetTitle>{editFlow.id ? "Editar" : "Novo"} fluxo</SheetTitle></SheetHeader>
                <div className="mt-6 space-y-4">
                  <div><Label>Nome *</Label><Input value={editFlow.name || ""} onChange={(e) => setEditFlow({ ...editFlow, name: e.target.value })} /></div>
                  <div><Label>Descrição</Label><Textarea value={editFlow.description || ""} onChange={(e) => setEditFlow({ ...editFlow, description: e.target.value })} /></div>
                  <div><Label>Palavras-gatilho (separadas por vírgula)</Label>
                    <Input value={(editFlow.trigger_keywords || []).join(", ")} onChange={(e) => setEditFlow({ ...editFlow, trigger_keywords: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} />
                  </div>
                  <div className="flex items-center gap-2"><Switch checked={editFlow.active ?? false} onCheckedChange={(v) => setEditFlow({ ...editFlow, active: v })} /><Label>Ativo</Label></div>
                  <Button className="w-full" onClick={salvarFlow}>Salvar</Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="grid lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5 space-y-2">
              {flows.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Nenhum fluxo.</CardContent></Card>}
              {flows.map(f => (
                <Card key={f.id} className={`cursor-pointer transition-colors ${activeFlow?.id === f.id ? "border-primary" : ""}`} onClick={() => setActiveFlow(f)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm flex items-center gap-2"><Bot className="h-4 w-4" />{f.name}</CardTitle>
                        <CardDescription className="text-xs">v{f.version} · {f.channel}</CardDescription>
                      </div>
                      <Badge variant={f.active ? "default" : "outline"} className="text-[10px]">{f.active ? "ativo" : "inativo"}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 flex gap-1">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditFlow(f); setOpenFlow(true); }}>Editar</Button>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); duplicarFlow(f); }}><Copy className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removerFlow(f.id); }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="lg:col-span-7">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{activeFlow ? `Passos de "${activeFlow.name}"` : "Selecione um fluxo"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {!activeFlow && <p className="text-sm text-muted-foreground">Selecione um fluxo à esquerda.</p>}
                  {activeFlow && (
                    <>
                      <Sheet open={openStep} onOpenChange={setOpenStep}>
                        <SheetTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => setEditStep({ type: "mensagem", order_index: steps.length })}>
                            <Plus className="mr-2 h-3 w-3" />Adicionar passo
                          </Button>
                        </SheetTrigger>
                        <SheetContent className="w-[480px] sm:max-w-[480px]">
                          <SheetHeader><SheetTitle>{editStep.id ? "Editar" : "Novo"} passo</SheetTitle></SheetHeader>
                          <div className="mt-6 space-y-4">
                            <div><Label>Tipo</Label>
                              <Select value={editStep.type} onValueChange={(v) => setEditStep({ ...editStep, type: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div><Label>Rótulo interno</Label><Input value={editStep.label || ""} onChange={(e) => setEditStep({ ...editStep, label: e.target.value })} /></div>
                            <div><Label>Conteúdo (mensagem ao paciente)</Label><Textarea rows={4} value={editStep.content || ""} onChange={(e) => setEditStep({ ...editStep, content: e.target.value })} /></div>
                            <div><Label>Ordem</Label><Input type="number" value={editStep.order_index ?? 0} onChange={(e) => setEditStep({ ...editStep, order_index: Number(e.target.value) })} /></div>
                            <Button className="w-full" onClick={salvarStep}>Salvar</Button>
                          </div>
                        </SheetContent>
                      </Sheet>

                      {steps.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">Sem passos ainda.</p>}
                      <div className="space-y-1">
                        {steps.map((s, i) => (
                          <div key={s.id} className="flex items-start gap-2 rounded-md border p-2 text-sm">
                            <span className="text-xs text-muted-foreground mt-0.5 w-5">{i + 1}.</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px]">{s.type}</Badge>
                                {s.label && <span className="text-xs font-medium">{s.label}</span>}
                              </div>
                              {s.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.content}</p>}
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => { setEditStep(s); setOpenStep(true); }}>Editar</Button>
                            <Button variant="ghost" size="sm" onClick={() => removerStep(s.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t mt-4">
                        <Button variant="outline" size="sm" disabled><Play className="mr-2 h-3 w-3" />Simular conversa (em breve)</Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader><CardTitle className="text-sm">Regras gerais</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                ⚠️ Bot e IA Avatar nunca respondem ao mesmo tempo numa conversa. Quando a IA está ativa, o bot é pausado naquela conversa, e vice-versa.
              </p>
              <p className="text-muted-foreground">
                Os fluxos padrão recomendados são: <strong>Agendar consulta</strong>, <strong>Remarcar</strong>, <strong>Financeiro</strong>, <strong>Documentos</strong>, <strong>Sou empresa</strong>, <strong>Sou médico</strong>, <strong>Falar com atendente</strong>.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
