import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail, Phone, Inbox, CheckCheck, Archive, RefreshCw, Copy } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Feedback = {
  id: string;
  tipo: "contato" | "feedback";
  nome: string | null;
  sobrenome: string | null;
  telefone: string | null;
  email: string;
  mensagem: string | null;
  status: "novo" | "lido" | "arquivado";
  user_agent: string | null;
  created_at: string;
};

export default function AdminFeedbacks() {
  const { toast } = useToast();
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState<string>("todos");
  const [status, setStatus] = useState<string>("novo");
  const [selected, setSelected] = useState<Feedback | null>(null);

  async function load() {
    setLoading(true);
    let q = supabase.from("feedbacks_site").select("*").order("created_at", { ascending: false }).limit(200);
    if (tipo !== "todos") q = q.eq("tipo", tipo as any);
    if (status !== "todos") q = q.eq("status", status as any);
    const { data, error } = await q;
    setLoading(false);
    if (error) {
      toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
      return;
    }
    setItems((data ?? []) as Feedback[]);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tipo, status]);

  const novos = useMemo(() => items.filter((i) => i.status === "novo").length, [items]);

  async function setItemStatus(id: string, novo: Feedback["status"]) {
    const { error } = await supabase
      .from("feedbacks_site")
      .update({ status: novo, lido_em: novo === "novo" ? null : new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: novo } : i)));
    if (selected?.id === id) setSelected({ ...selected, status: novo });
  }

  return (
    <PageShell
      title="Feedbacks do site"
      subtitle="Mensagens enviadas pelos formulários de contato e feedback no FAQ."
    >
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Inbox className="h-3.5 w-3.5" /> {novos} novo{novos === 1 ? "" : "s"}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="contato">Contato</SelectItem>
              <SelectItem value="feedback">Feedback</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="novo">Novos</SelectItem>
              <SelectItem value="lido">Lidos</SelectItem>
              <SelectItem value="arquivado">Arquivados</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={load} aria-label="Recarregar">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…
        </div>
      ) : items.length === 0 ? (
        <div className="card-elevated p-10 text-center">
          <Inbox className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-semibold">Nenhuma mensagem encontrada</p>
          <p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros para ver outros registros.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <button
              key={it.id}
              onClick={() => setSelected(it)}
              className="card-elevated block w-full p-5 text-left transition hover:-translate-y-0.5 hover:shadow-elegant"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={it.tipo === "feedback" ? "bg-primary/10 text-primary border-primary/20" : "bg-success/10 text-success border-success/20"}>
                      {it.tipo === "feedback" ? "Feedback" : "Contato"}
                    </Badge>
                    {it.status === "novo" && <Badge variant="outline" className="text-warning">Novo</Badge>}
                    {it.status === "lido" && <Badge variant="outline">Lido</Badge>}
                    {it.status === "arquivado" && <Badge variant="outline" className="text-muted-foreground">Arquivado</Badge>}
                    <span className="text-xs text-muted-foreground">
                      {new Date(it.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <p className="mt-2 font-semibold">
                    {[it.nome, it.sobrenome].filter(Boolean).join(" ") || "(sem nome)"}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {it.email}</span>
                    {it.telefone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {it.telefone}</span>}
                  </p>
                  {it.mensagem && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{it.mensagem}</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {selected.tipo === "feedback" ? "Feedback recebido" : "Contato recebido"}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4 text-sm">
                <Row label="Nome" value={[selected.nome, selected.sobrenome].filter(Boolean).join(" ") || "—"} />
                <Row
                  label="E-mail"
                  value={selected.email}
                  action={
                    <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(selected.email); toast({ title: "E-mail copiado" }); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  }
                />
                {selected.telefone && <Row label="Telefone" value={selected.telefone} />}
                <Row label="Recebido em" value={new Date(selected.created_at).toLocaleString("pt-BR")} />
                {selected.mensagem && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mensagem</p>
                    <p className="whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3">{selected.mensagem}</p>
                  </div>
                )}
                {selected.user_agent && (
                  <Row label="User-Agent" value={selected.user_agent} />
                )}
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {selected.status !== "lido" && (
                  <Button onClick={() => setItemStatus(selected.id, "lido")} variant="outline">
                    <CheckCheck className="mr-2 h-4 w-4" /> Marcar como lido
                  </Button>
                )}
                {selected.status !== "arquivado" && (
                  <Button onClick={() => setItemStatus(selected.id, "arquivado")} variant="outline">
                    <Archive className="mr-2 h-4 w-4" /> Arquivar
                  </Button>
                )}
                {selected.status !== "novo" && (
                  <Button onClick={() => setItemStatus(selected.id, "novo")} variant="ghost">
                    Reabrir
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}

function Row({ label, value, action }: { label: string; value: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="break-all">{value}</p>
      </div>
      {action}
    </div>
  );
}
