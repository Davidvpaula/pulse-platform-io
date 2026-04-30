import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus, Trash2, Zap, Activity } from "lucide-react";
import { toast } from "sonner";

type Rule = {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  action_type: string;
  template_id: string | null;
  channel: string;
  active: boolean;
  delay_seconds: number;
  last_executed_at: string | null;
  success_count: number;
  failure_count: number;
};

const TRIGGERS = [
  "appointment.created", "appointment.confirmed",
  "appointment.payment_pending", "appointment.payment_approved",
  "appointment.starts_soon_24h", "appointment.starts_soon_1h",
  "appointment.starts_soon_30min", "appointment.starts_soon_5min",
  "appointment.finished", "appointment.no_show",
  "document.available", "payment.refunded",
  "conversation.received", "conversation.assigned", "conversation.closed",
];
const ACTIONS = ["send_template", "send_message", "assign_conversation", "transfer_sector", "create_task", "notify_user", "webhook"];

export default function Automacoes() {
  const [items, setItems] = useState<Rule[]>([]);
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<Rule>>({});

  async function load() {
    const { data } = await supabase.from("automation_rules").select("*").order("trigger");
    setItems((data || []) as Rule[]);
    const { data: t } = await supabase.from("message_templates").select("id,name").eq("active", true);
    setTemplates(t || []);
  }
  useEffect(() => { load(); }, []);

  async function salvar() {
    if (!edit.name?.trim() || !edit.trigger || !edit.action_type) { toast.error("Nome, gatilho e ação são obrigatórios"); return; }
    const payload = {
      name: edit.name,
      description: edit.description || null,
      trigger: edit.trigger as any,
      action_type: edit.action_type as any,
      template_id: edit.template_id || null,
      channel: (edit.channel as any) || "whatsapp",
      active: edit.active ?? false,
      delay_seconds: edit.delay_seconds ?? 0,
    };
    const { error } = edit.id
      ? await supabase.from("automation_rules").update(payload).eq("id", edit.id)
      : await supabase.from("automation_rules").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Automação salva");
    setOpen(false);
    load();
  }

  async function remover(id: string) {
    if (!confirm("Remover automação?")) return;
    await supabase.from("automation_rules").delete().eq("id", id);
    load();
  }

  async function toggle(r: Rule) {
    await supabase.from("automation_rules").update({ active: !r.active }).eq("id", r.id);
    load();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Automações" description="Eventos do sistema disparam mensagens, transferências ou tarefas." />

      <div className="flex justify-end">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button onClick={() => setEdit({ channel: "whatsapp", active: false, delay_seconds: 0, action_type: "send_template" })}>
              <Plus className="mr-2 h-4 w-4" />Nova automação
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
            <SheetHeader><SheetTitle>{edit.id ? "Editar" : "Nova"} automação</SheetTitle></SheetHeader>
            <div className="mt-6 space-y-4">
              <div><Label>Nome *</Label><Input value={edit.name || ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
              <div><Label>Descrição</Label><Input value={edit.description || ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
              <div><Label>Gatilho *</Label>
                <Select value={edit.trigger} onValueChange={(v) => setEdit({ ...edit, trigger: v })}>
                  <SelectTrigger><SelectValue placeholder="Escolha o evento" /></SelectTrigger>
                  <SelectContent>{TRIGGERS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Ação *</Label>
                <Select value={edit.action_type} onValueChange={(v) => setEdit({ ...edit, action_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ACTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {edit.action_type === "send_template" && (
                <div><Label>Template</Label>
                  <Select value={edit.template_id || ""} onValueChange={(v) => setEdit({ ...edit, template_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Escolha um template" /></SelectTrigger>
                    <SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div><Label>Atraso (segundos)</Label><Input type="number" value={edit.delay_seconds ?? 0} onChange={(e) => setEdit({ ...edit, delay_seconds: Number(e.target.value) })} /></div>
              <div className="flex items-center gap-2"><Switch checked={edit.active ?? false} onCheckedChange={(v) => setEdit({ ...edit, active: v })} /><Label>Ativa</Label></div>
              <Button className="w-full" onClick={salvar}>Salvar</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid gap-3">
        {items.length === 0 && <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma automação configurada.</CardContent></Card>}
        {items.map(r => (
          <Card key={r.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4" />{r.name}</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Quando <code className="bg-muted px-1 rounded">{r.trigger}</code> → <code className="bg-muted px-1 rounded">{r.action_type}</code>
                    {r.delay_seconds > 0 && <> · espera {r.delay_seconds}s</>}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">✓ {r.success_count}</Badge>
                  <Badge variant="outline" className="text-[10px]">✗ {r.failure_count}</Badge>
                  <Switch checked={r.active} onCheckedChange={() => toggle(r)} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 flex gap-1 text-xs">
              <Button variant="ghost" size="sm" onClick={() => { setEdit(r); setOpen(true); }}>Editar</Button>
              <Button variant="ghost" size="sm" onClick={() => remover(r.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
              {r.last_executed_at && <span className="ml-auto text-muted-foreground self-center"><Activity className="inline h-3 w-3 mr-1" />{new Date(r.last_executed_at).toLocaleString("pt-BR")}</span>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
