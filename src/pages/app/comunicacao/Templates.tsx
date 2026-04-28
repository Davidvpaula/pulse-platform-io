import { useState } from "react";
import { FileText, Plus, Pencil, Trash2, Copy, Tag } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Categoria =
  | "Confirmação"
  | "Lembrete"
  | "Link Meet"
  | "Pós-consulta"
  | "Financeiro";

type Template = {
  id: string;
  nome: string;
  categoria: Categoria;
  body: string;
  ativo: boolean;
};

const VARS = ["{nome}", "{data}", "{horario}", "{medico}", "{link_consulta}"];

const initial: Template[] = [
  { id: "T-01", nome: "Confirmação de consulta", categoria: "Confirmação", ativo: true,
    body: "Olá {nome}! Sua consulta com {medico} está confirmada para {data} às {horario}. Aguardamos você 💙" },
  { id: "T-02", nome: "Lembrete 24h antes", categoria: "Lembrete", ativo: true,
    body: "Oi {nome}, lembrando que sua consulta com {medico} é amanhã ({data}) às {horario}." },
  { id: "T-03", nome: "Lembrete 1h antes", categoria: "Lembrete", ativo: true,
    body: "Olá {nome}! Sua consulta começa em 1 hora. Prepare-se 🩺" },
  { id: "T-04", nome: "Link Google Meet", categoria: "Link Meet", ativo: true,
    body: "Aqui está o link da sua videoconsulta com {medico}: {link_consulta}" },
  { id: "T-05", nome: "Pós-consulta", categoria: "Pós-consulta", ativo: true,
    body: "Olá {nome}! Como foi sua consulta com {medico}? Conte sua experiência 💚" },
  { id: "T-06", nome: "Cobrança Pix", categoria: "Financeiro", ativo: true,
    body: "Olá {nome}, segue o Pix da sua consulta de {data}. Qualquer dúvida, é só responder." },
];

const catTone: Record<Categoria, string> = {
  "Confirmação": "bg-success/10 text-success",
  "Lembrete": "bg-warning/10 text-warning",
  "Link Meet": "bg-info/10 text-info",
  "Pós-consulta": "bg-accent/10 text-accent",
  "Financeiro": "bg-primary-soft text-primary",
};

export default function Templates() {
  const [items, setItems] = useState<Template[]>(initial);
  const [filter, setFilter] = useState<Categoria | "Todos">("Todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);

  const filtered = items.filter(t => filter === "Todos" || t.categoria === filter);

  const startNew = () => {
    setEditing({ id: `T-${String(items.length + 1).padStart(2, "0")}`, nome: "", categoria: "Confirmação", body: "", ativo: true });
    setOpen(true);
  };

  const startEdit = (t: Template) => { setEditing(t); setOpen(true); };

  const save = () => {
    if (!editing || !editing.nome.trim()) return;
    setItems(its => its.some(i => i.id === editing.id)
      ? its.map(i => i.id === editing.id ? editing : i)
      : [editing, ...its]);
    setOpen(false);
    setEditing(null);
    toast.success("Template salvo");
  };

  const insertVar = (v: string) => {
    if (!editing) return;
    setEditing({ ...editing, body: editing.body + " " + v });
  };

  const remove = (id: string) => {
    setItems(its => its.filter(i => i.id !== id));
    toast("Template removido");
  };

  const duplicate = (t: Template) => {
    const id = `T-${String(items.length + 1).padStart(2, "0")}`;
    setItems(its => [{ ...t, id, nome: t.nome + " (cópia)" }, ...its]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Templates de mensagem"
        description="Mensagens prontas com variáveis dinâmicas. Aprovação para WhatsApp Business API será feita futuramente."
        actions={<Button onClick={startNew}><Plus className="mr-2 h-4 w-4" />Novo template</Button>}
      />

      <div className="flex flex-wrap gap-1.5">
        {(["Todos","Confirmação","Lembrete","Link Meet","Pós-consulta","Financeiro"] as const).map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filter === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >{c}</button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map(t => (
          <div key={t.id} className="card-elevated flex flex-col p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold truncate">{t.nome}</p>
                <p className="text-[11px] text-muted-foreground">{t.id}</p>
              </div>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", catTone[t.categoria])}>
                {t.categoria}
              </span>
            </div>
            <p className="mt-3 flex-1 rounded-lg bg-muted/40 p-3 text-sm text-foreground/80">
              {t.body}
            </p>
            <div className="mt-3 flex flex-wrap gap-1">
              {VARS.filter(v => t.body.includes(v)).map(v => (
                <span key={v} className="rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-mono text-primary">{v}</span>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className={cn("inline-flex items-center gap-1 text-xs", t.ativo ? "text-success" : "text-muted-foreground")}>
                <span className={cn("h-1.5 w-1.5 rounded-full", t.ativo ? "bg-success" : "bg-muted-foreground")} />
                {t.ativo ? "Ativo" : "Inativo"}
              </span>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => duplicate(t)}><Copy className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing && items.some(i => i.id === editing.id) ? "Editar template" : "Novo template"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Input
                placeholder="Nome"
                value={editing.nome}
                onChange={e => setEditing({ ...editing, nome: e.target.value })}
              />
              <div className="flex flex-wrap gap-1.5">
                {(["Confirmação","Lembrete","Link Meet","Pós-consulta","Financeiro"] as Categoria[]).map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditing({ ...editing, categoria: c })}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs",
                      editing.categoria === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >{c}</button>
                ))}
              </div>
              <Textarea
                rows={5}
                placeholder="Corpo da mensagem… use variáveis como {nome}, {data}, {medico}"
                value={editing.body}
                onChange={e => setEditing({ ...editing, body: e.target.value })}
              />
              <div>
                <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                  <Tag className="h-3 w-3" />Inserir variável
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {VARS.map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVar(v)}
                      className="rounded border border-border bg-card px-2 py-0.5 font-mono text-xs hover:border-primary"
                    >{v}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
