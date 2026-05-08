import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  conversationId: string;
  onTransferred?: () => void;
};

type UserOption = { id: string; nome: string | null; email: string | null };

const SETORES = ["recepcao", "financeiro", "clinico", "comercial", "suporte"];

export function TransferirConversaDialog({ open, onOpenChange, conversationId, onTransferred }: Props) {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [destino, setDestino] = useState<{ tipo: "user" | "setor"; valor: string }>({ tipo: "user", valor: "" });
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, nome, email")
        .order("nome")
        .limit(100);
      setUsers((data || []) as UserOption[]);
    })();
  }, [open]);

  async function transferir() {
    if (!destino.valor) {
      toast.error("Selecione um destino");
      return;
    }
    setLoading(true);
    const params: Record<string, string | null> = {
      p_conversation_id: conversationId,
      p_to_user_id: destino.tipo === "user" ? destino.valor : null,
      p_to_sector: destino.tipo === "setor" ? destino.valor : null,
      p_reason: motivo.trim() || null,
    };
    const { error } = await supabase.rpc("transferir_conversa", params as never);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Conversa transferida");
    setMotivo("");
    setDestino({ tipo: "user", valor: "" });
    onOpenChange(false);
    onTransferred?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir conversa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tipo de destino</Label>
            <Select
              value={destino.tipo}
              onValueChange={(v) => setDestino({ tipo: v as "user" | "setor", valor: "" })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuário</SelectItem>
                <SelectItem value="setor">Setor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{destino.tipo === "user" ? "Usuário" : "Setor"}</Label>
            <Select value={destino.valor} onValueChange={(v) => setDestino((d) => ({ ...d, valor: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {destino.tipo === "user"
                  ? users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nome || u.email || u.id.slice(0, 8)}
                      </SelectItem>
                    ))
                  : SETORES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Motivo (opcional)</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Ex.: paciente solicita falar com o financeiro"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={transferir} disabled={loading || !destino.valor}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Transferir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
