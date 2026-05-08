import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, MessageSquarePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { openOrCreatePacienteConversation } from "@/lib/comunicacao/openOrCreateConversation";

type Paciente = {
  id: string;
  nome_completo: string | null;
  telefone: string | null;
  cpf: string | null;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (conversationId: string) => void;
}

export function NovaConversaDialog({ open, onOpenChange, onCreated }: Props) {
  const [busca, setBusca] = useState("");
  const [results, setResults] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    if (!open) { setBusca(""); setResults([]); return; }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = busca.trim();
    if (q.length < 2) { setResults([]); return; }
    let alive = true;
    setLoading(true);
    const t = setTimeout(async () => {
      const digits = q.replace(/\D/g, "");
      let query = supabase
        .from("pacientes")
        .select("id, nome_completo, telefone, cpf")
        .limit(15);
      if (digits.length >= 3) {
        query = query.or(
          `nome_completo.ilike.%${q}%,telefone.ilike.%${digits}%,cpf.ilike.%${digits}%`
        );
      } else {
        query = query.ilike("nome_completo", `%${q}%`);
      }
      const { data, error } = await query;
      if (!alive) return;
      if (error) { toast.error("Erro ao buscar pacientes"); setResults([]); }
      else setResults((data || []) as Paciente[]);
      setLoading(false);
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [busca, open]);

  async function abrir(p: Paciente) {
    if (!p.telefone) { toast.error("Paciente sem telefone cadastrado."); return; }
    setSubmitting(p.id);
    try {
      const convId = await openOrCreatePacienteConversation({
        pacienteId: p.id,
        telefone: p.telefone,
        nome: p.nome_completo,
      });
      onCreated(convId);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível abrir a conversa");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5" /> Nova conversa
          </DialogTitle>
          <DialogDescription>
            Busque um paciente por nome, telefone, CPF ou e-mail para abrir/retomar a conversa.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Nome, telefone, CPF ou e-mail…"
            className="pl-8"
          />
        </div>

        <ScrollArea className="max-h-72">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Buscando…
            </div>
          ) : results.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-6">
              {busca.trim().length < 2 ? "Digite ao menos 2 caracteres." : "Nenhum paciente encontrado."}
            </div>
          ) : (
            <div className="space-y-1">
              {results.map(p => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-md border p-2 hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{p.nome_completo || "Sem nome"}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.telefone || "sem telefone"} · {p.cpf || "sem CPF"}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => abrir(p)}
                    disabled={submitting === p.id || !p.telefone}
                  >
                    {submitting === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Abrir"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
