import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

type Template = {
  id: string;
  name: string;
  category: string;
  language: string;
  content: string;
  variables: string[];
  whatsapp_status: string;
  whatsapp_template_name: string | null;
  active: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId?: string;
  defaultTo?: string;
  onSent?: () => void;
};

export function EnviarTemplateDialog({ open, onOpenChange, conversationId, defaultTo, onSent }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const [to, setTo] = useState(defaultTo || "");
  const [vars, setVars] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("message_templates")
      .select("*")
      .eq("active", true)
      .order("category")
      .order("name")
      .then(({ data }) => {
        setTemplates((data || []) as Template[]);
        setLoading(false);
      });
  }, [open]);

  useEffect(() => { setTo(defaultTo || ""); }, [defaultTo, open]);

  const tpl = useMemo(() => templates.find(t => t.id === selectedId), [templates, selectedId]);

  const preview = useMemo(() => {
    if (!tpl) return "";
    let out = tpl.content;
    (tpl.variables || []).forEach(v => {
      out = out.replaceAll(v, vars[v] || v);
    });
    return out;
  }, [tpl, vars]);

  async function enviar() {
    if (!tpl) return;
    if (!to.trim()) { toast.error("Telefone obrigatório"); return; }
    const variables = (tpl.variables || []).map(v => vars[v] || "");
    if (variables.some(v => !v)) {
      toast.error("Preencha todas as variáveis");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-template-send", {
        body: { template_id: tpl.id, to, conversation_id: conversationId, variables },
      });
      if (error) throw error;
      if ((data as any)?.ok === false) {
        toast.error((data as any).detail || (data as any).error || "Falha no envio");
        return;
      }
      toast.success("Template enviado");
      onSent?.();
      onOpenChange(false);
      setSelectedId("");
      setVars({});
    } catch (e: any) {
      toast.error(e?.message || "Erro ao enviar template");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Enviar template oficial</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Template</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger>
                <SelectValue placeholder={loading ? "Carregando…" : "Selecione um template"} />
              </SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    <div className="flex items-center gap-2">
                      <span>{t.name}</span>
                      <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                      {t.whatsapp_status === "aprovado" && (
                        <Badge variant="default" className="text-[10px]">Meta ✓</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
                {!templates.length && !loading && (
                  <div className="px-2 py-3 text-xs text-muted-foreground">Nenhum template ativo</div>
                )}
              </SelectContent>
            </Select>
          </div>

          {tpl && (
            <>
              <div>
                <Label>Telefone destino</Label>
                <Input value={to} onChange={e => setTo(e.target.value)} placeholder="5511999999999" />
              </div>

              {(tpl.variables || []).length > 0 && (
                <div className="space-y-2">
                  <Label>Variáveis</Label>
                  {tpl.variables.map(v => (
                    <div key={v} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground w-24 shrink-0">{v}</span>
                      <Input
                        value={vars[v] || ""}
                        onChange={e => setVars({ ...vars, [v]: e.target.value })}
                        placeholder={`Valor para ${v}`}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div>
                <Label>Preview</Label>
                <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                  {preview}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>Cancelar</Button>
          <Button onClick={enviar} disabled={!tpl || sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Enviar template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
