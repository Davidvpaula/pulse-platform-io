import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2, UserPlus, Phone, Lightbulb } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Paciente = {
  id: string;
  nome_completo: string;
  cpf: string | null;
  telefone: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  conversationId: string;
  contactPhone: string | null;
  onLinked?: () => void;
};

export function VincularPacienteDialog({
  open,
  onOpenChange,
  conversationId,
  contactPhone,
  onLinked,
}: Props) {
  const [busca, setBusca] = useState("");
  const [results, setResults] = useState<Paciente[]>([]);
  const [suggestion, setSuggestion] = useState<Paciente | null>(null);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);

  // Sugestão por telefone
  useEffect(() => {
    if (!open || !contactPhone) {
      setSuggestion(null);
      return;
    }
    const phoneDigits = contactPhone.replace(/\D/g, "").slice(-9);
    if (!phoneDigits) return;
    supabase
      .from("pacientes")
      .select("id, nome_completo, cpf, telefone")
      .ilike("telefone", `%${phoneDigits}%`)
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setSuggestion(data[0] as Paciente);
      });
  }, [open, contactPhone]);

  // Busca debounced
  useEffect(() => {
    if (!open) return;
    const q = busca.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from("pacientes")
        .select("id, nome_completo, cpf, telefone")
        .or(`nome_completo.ilike.%${q}%,cpf.ilike.%${q}%,telefone.ilike.%${q}%`)
        .limit(10);
      setResults((data || []) as Paciente[]);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [busca, open]);

  async function vincular(pac: Paciente, origem: "manual" | "telefone_match") {
    setLinking(pac.id);
    const { error } = await supabase.rpc("vincular_paciente_conversa", {
      p_conversation_id: conversationId,
      p_paciente_id: pac.id,
      p_parentesco: null,
      p_origem: origem,
    });
    setLinking(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${pac.nome_completo} vinculado (aguarda confirmação)`);
    onLinked?.();
    onOpenChange(false);
    setBusca("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular paciente</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {suggestion && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-primary mb-1">
                <Lightbulb className="h-3 w-3" /> Sugestão por telefone
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{suggestion.nome_completo}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {suggestion.telefone}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => vincular(suggestion, "telefone_match")}
                  disabled={linking === suggestion.id}
                >
                  {linking === suggestion.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <UserPlus className="h-3 w-3 mr-1" />
                  )}
                  Vincular
                </Button>
              </div>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, CPF ou telefone…"
              className="pl-8"
            />
          </div>

          <div className="max-h-72 overflow-y-auto -mx-1">
            {loading && (
              <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Buscando…
              </div>
            )}
            {!loading && busca.trim().length >= 2 && results.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-4">
                Nenhum paciente encontrado.
              </div>
            )}
            <ul className="divide-y">
              {results.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 px-1 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.nome_completo}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      {p.telefone && <span>{p.telefone}</span>}
                      {p.cpf && <Badge variant="outline" className="text-[9px] py-0">{p.cpf}</Badge>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => vincular(p, "manual")}
                    disabled={linking === p.id}
                  >
                    {linking === p.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Vincular"
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
