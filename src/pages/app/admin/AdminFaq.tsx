import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical, Eye, EyeOff } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

type Faq = {
  id: string;
  pergunta: string;
  resposta: string;
  categoria: string | null;
  ordem: number;
  ativo: boolean;
};

const empty: Omit<Faq, "id"> = { pergunta: "", resposta: "", categoria: "", ordem: 0, ativo: true };

export default function AdminFaq() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Faq | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("faqs")
      .select("*")
      .order("ordem", { ascending: true });
    setFaqs((data as Faq[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty, ordem: faqs.length + 1 });
    setDialogOpen(true);
  };

  const openEdit = (f: Faq) => {
    setEditing(f);
    setForm({ pergunta: f.pergunta, resposta: f.resposta, categoria: f.categoria ?? "", ordem: f.ordem, ativo: f.ativo });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.pergunta.trim() || !form.resposta.trim()) {
      toast.error("Pergunta e resposta são obrigatórias");
      return;
    }
    setSaving(true);
    const payload = { ...form, categoria: form.categoria?.trim() || null };

    if (editing) {
      const { error } = await supabase.from("faqs").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("FAQ atualizado");
    } else {
      const { error } = await supabase.from("faqs").insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("FAQ criado");
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Deseja realmente excluir este FAQ?")) return;
    const { error } = await supabase.from("faqs").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("FAQ excluído");
    load();
  };

  const toggleAtivo = async (f: Faq) => {
    const { error } = await supabase.from("faqs").update({ ativo: !f.ativo }).eq("id", f.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const moveUp = async (idx: number) => {
    if (idx === 0) return;
    const a = faqs[idx];
    const b = faqs[idx - 1];
    await Promise.all([
      supabase.from("faqs").update({ ordem: b.ordem }).eq("id", a.id),
      supabase.from("faqs").update({ ordem: a.ordem }).eq("id", b.id),
    ]);
    load();
  };

  const moveDown = async (idx: number) => {
    if (idx >= faqs.length - 1) return;
    const a = faqs[idx];
    const b = faqs[idx + 1];
    await Promise.all([
      supabase.from("faqs").update({ ordem: b.ordem }).eq("id", a.id),
      supabase.from("faqs").update({ ordem: a.ordem }).eq("id", b.id),
    ]);
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader heading="FAQ do Site" text="Gerencie as perguntas frequentes exibidas na página pública." />

      <div className="flex justify-end">
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Novo FAQ</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      ) : faqs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum FAQ cadastrado. Clique em "Novo FAQ" para começar.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {faqs.map((f, idx) => (
            <Card key={f.id} className={!f.ativo ? "opacity-50" : ""}>
              <CardContent className="flex items-start gap-4 py-4">
                <div className="flex flex-col gap-1 pt-1">
                  <button onClick={() => moveUp(idx)} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30" title="Mover para cima">▲</button>
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <button onClick={() => moveDown(idx)} disabled={idx === faqs.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30" title="Mover para baixo">▼</button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{f.pergunta}</p>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{f.resposta}</p>
                  {f.categoria && <span className="mt-1 inline-block text-xs bg-muted px-2 py-0.5 rounded">{f.categoria}</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggleAtivo(f)} title={f.ativo ? "Desativar" : "Ativar"} className="text-muted-foreground hover:text-foreground">
                    {f.ativo ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(f)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(f.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar FAQ" : "Novo FAQ"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Pergunta *</Label>
              <Input value={form.pergunta} onChange={e => setForm(p => ({ ...p, pergunta: e.target.value }))} placeholder="Ex: Como funciona a telemedicina?" />
            </div>
            <div>
              <Label>Resposta *</Label>
              <Textarea rows={4} value={form.resposta} onChange={e => setForm(p => ({ ...p, resposta: e.target.value }))} placeholder="Resposta exibida ao expandir…" />
            </div>
            <div>
              <Label>Categoria (opcional)</Label>
              <Input value={form.categoria ?? ""} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))} placeholder="Ex: Pagamentos, Consultas" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.ativo} onCheckedChange={v => setForm(p => ({ ...p, ativo: v }))} />
              <Label>Ativo (visível no site)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
