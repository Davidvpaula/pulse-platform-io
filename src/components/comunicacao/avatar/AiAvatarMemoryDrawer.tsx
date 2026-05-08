import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Trash2, Plus, Save, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/lib/permissions/usePermission";

type Memory = {
  id: string;
  patient_id: string | null;
  conversation_id: string | null;
  memory_type: string;
  content: string;
  relevance_score: number;
  expires_at: string | null;
  created_at: string;
};

const TYPES = ["preferencia", "contexto", "historico_operacional", "observacao", "pendencia"];

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  conversationId: string | null;
  patientId?: string | null;
};

export function AiAvatarMemoryDrawer({ open, onOpenChange, conversationId, patientId }: Props) {
  const { allowed: perms } = usePermission(["ia.avatar.memoria"]);
  const [items, setItems] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState({ memory_type: "contexto", content: "", expiresInDays: 30 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!conversationId && !patientId) return;
    setLoading(true);
    let q = supabase.from("ai_avatar_memory").select("*").order("created_at", { ascending: false }).limit(100);
    if (patientId) q = q.eq("patient_id", patientId);
    else if (conversationId) q = q.eq("conversation_id", conversationId);
    const { data } = await q;
    setItems((data as any) ?? []);
    setLoading(false);
  }, [conversationId, patientId]);

  useEffect(() => { if (open) load(); }, [open, load]);

  async function adicionar() {
    if (!draft.content.trim()) return;
    setSaving(true);
    const expires = draft.expiresInDays > 0
      ? new Date(Date.now() + draft.expiresInDays * 86400_000).toISOString()
      : null;
    const { error } = await supabase.from("ai_avatar_memory").insert({
      patient_id: patientId ?? null,
      conversation_id: conversationId ?? null,
      memory_type: draft.memory_type,
      content: draft.content.trim(),
      expires_at: expires,
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Memória adicionada");
    setDraft({ memory_type: "contexto", content: "", expiresInDays: 30 });
    load();
  }

  async function atualizar(id: string, patch: Partial<Memory>) {
    const { error } = await supabase.from("ai_avatar_memory").update(patch as any).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  async function remover(id: string) {
    const { error } = await supabase.from("ai_avatar_memory").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Memória removida");
    load();
  }

  const canEdit = !!perms["ia.avatar.memoria"];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><Brain className="h-4 w-4" /> Memória da IA Avatar</SheetTitle>
          <SheetDescription>
            Memórias contextuais usadas pela IA. Defina expiração para evitar acúmulo.
          </SheetDescription>
        </SheetHeader>

        {canEdit && (
          <div className="space-y-2 my-4 border rounded p-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={draft.memory_type} onValueChange={(v) => setDraft({ ...draft, memory_type: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Expira em (dias)</Label>
                <Input type="number" min={0} className="h-8 text-xs"
                  value={draft.expiresInDays}
                  onChange={(e) => setDraft({ ...draft, expiresInDays: Number(e.target.value) })} />
              </div>
            </div>
            <Textarea rows={3} value={draft.content} placeholder="Conteúdo da memória..."
              onChange={(e) => setDraft({ ...draft, content: e.target.value })} />
            <Button size="sm" className="w-full" onClick={adicionar} disabled={saving || !draft.content.trim()}>
              {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
              Adicionar memória
            </Button>
          </div>
        )}

        <div className="space-y-2">
          {loading && <p className="text-xs text-muted-foreground">Carregando…</p>}
          {!loading && items.length === 0 && (
            <p className="text-xs text-muted-foreground italic">Nenhuma memória registrada.</p>
          )}
          {items.map(m => {
            const expired = m.expires_at && new Date(m.expires_at) < new Date();
            return (
              <div key={m.id} className={`border rounded p-2 space-y-1 ${expired ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px]">{m.memory_type}</Badge>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    {m.expires_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {expired ? "expirada" : new Date(m.expires_at).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                </div>
                {canEdit ? (
                  <Textarea
                    rows={2}
                    defaultValue={m.content}
                    onBlur={(e) => {
                      if (e.target.value.trim() !== m.content) atualizar(m.id, { content: e.target.value.trim() });
                    }}
                    className="text-xs"
                  />
                ) : (
                  <p className="text-xs whitespace-pre-wrap">{m.content}</p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString("pt-BR")}</span>
                  {canEdit && (
                    <Button size="sm" variant="ghost" className="h-6 text-[11px] text-destructive" onClick={() => remover(m.id)}>
                      <Trash2 className="h-3 w-3 mr-1" /> Remover
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
