import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, FileEdit } from "lucide-react";
import { toast } from "sonner";

type Template = {
  id: string;
  name: string;
  category: string;
  content: string;
  variables: string[];
  whatsapp_status: string;
  active: boolean;
};

const VARIAVEIS = ["{nome}", "{data}", "{horario}", "{medico}", "{especialidade}", "{link_consulta}", "{valor}", "{empresa}", "{protocolo}"];
const CATEGORIAS = [
  "confirmacao", "lembrete_24h", "lembrete_1h", "link_meet", "cobranca",
  "pos_consulta", "documento", "retorno", "empresa", "suporte", "outro",
];

export default function Templates() {
  const [items, setItems] = useState<Template[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<Template>>({});

  async function load() {
    const { data } = await supabase.from("message_templates").select("*").order("category").order("name");
    setItems((data || []) as Template[]);
  }
  useEffect(() => { load(); }, []);

  function novo() {
    setEdit({ name: "", category: "outro", content: "", variables: [], whatsapp_status: "rascunho", active: true });
    setOpen(true);
  }
  function editar(t: Template) { setEdit(t); setOpen(true); }

  async function salvar() {
    if (!edit.name?.trim() || !edit.content?.trim()) { toast.error("Nome e conteúdo obrigatórios"); return; }
    const variaveis = VARIAVEIS.filter(v => edit.content!.includes(v));
    const payload = {
      name: edit.name,
      category: edit.category as any || "outro",
      content: edit.content,
      variables: variaveis,
      whatsapp_status: (edit.whatsapp_status as any) || "rascunho",
      active: edit.active ?? true,
    };
    const { error } = edit.id
      ? await supabase.from("message_templates").update(payload).eq("id", edit.id)
      : await supabase.from("message_templates").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Template salvo");
    setOpen(false);
    load();
  }

  async function remover(id: string) {
    if (!confirm("Remover template?")) return;
    await supabase.from("message_templates").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Templates" description="Mensagens reaproveitáveis para WhatsApp e automações." />

      <div className="flex justify-end">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button onClick={novo}><Plus className="mr-2 h-4 w-4" />Novo template</Button>
          </SheetTrigger>
          <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
            <SheetHeader><SheetTitle>{edit.id ? "Editar" : "Novo"} template</SheetTitle></SheetHeader>
            <div className="mt-6 space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input value={edit.name || ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={edit.category} onValueChange={(v) => setEdit({ ...edit, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Conteúdo *</Label>
                <Textarea rows={6} value={edit.content || ""} onChange={(e) => setEdit({ ...edit, content: e.target.value })} placeholder="Olá {nome}, sua consulta com {medico} está confirmada para {data} às {horario}." />
                <div className="mt-2 flex flex-wrap gap-1">
                  {VARIAVEIS.map(v => (
                    <button key={v} type="button" onClick={() => setEdit({ ...edit, content: (edit.content || "") + " " + v })} className="text-[11px] rounded-md border px-2 py-0.5 hover:bg-muted">
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Status WhatsApp</Label>
                <Select value={edit.whatsapp_status} onValueChange={(v) => setEdit({ ...edit, whatsapp_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="rejeitado">Rejeitado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={edit.active ?? true} onCheckedChange={(v) => setEdit({ ...edit, active: v })} />
                <Label>Ativo</Label>
              </div>
              <Button className="w-full" onClick={salvar}>Salvar</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.length === 0 && (
          <Card className="md:col-span-3"><CardContent className="py-12 text-center text-muted-foreground">Nenhum template cadastrado.</CardContent></Card>
        )}
        {items.map(t => (
          <Card key={t.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm">{t.name}</CardTitle>
                <Badge variant={t.whatsapp_status === "aprovado" ? "default" : "outline"} className="text-[10px]">{t.whatsapp_status}</Badge>
              </div>
              <Badge variant="secondary" className="text-[10px] w-fit">{t.category}</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{t.content}</p>
              <div className="mt-3 flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => editar(t)}><FileEdit className="h-3 w-3" /></Button>
                <Button variant="ghost" size="sm" onClick={() => remover(t.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                {!t.active && <Badge variant="outline" className="ml-auto text-[10px]">inativo</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
