import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Loader2, Pencil, Trash2, Tag, Power, Filter } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  listCupons, deleteCupom, toggleCupomAtivo,
  type CupomDetalhado,
} from "@/lib/clinico";
import CupomDialog from "@/components/secretaria/CupomDialog";
import { useSession } from "@/lib/session";

function formatBRL(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatData(d?: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return d; }
}

export default function SecretariaCupons() {
  const { session } = useSession();
  const [rows, setRows] = useState<CupomDetalhado[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [editar, setEditar] = useState<CupomDetalhado | null>(null);
  const [criar, setCriar] = useState(false);
  const [excluir, setExcluir] = useState<CupomDetalhado | null>(null);

  const carregar = async () => {
    if (!session) { setRows([]); return; }
    setLoading(true);
    setRows(await listCupons());
    setLoading(false);
  };
  useEffect(() => { void carregar(); /* eslint-disable-next-line */ }, [session]);

  const lista = useMemo(() => {
    const arr = rows ?? [];
    const q = busca.trim().toLowerCase();
    if (!q) return arr;
    return arr.filter(
      (c) =>
        c.codigo.toLowerCase().includes(q) ||
        c.nome.toLowerCase().includes(q) ||
        (c.medico_nome ?? "").toLowerCase().includes(q) ||
        (c.especialidade_nome ?? "").toLowerCase().includes(q),
    );
  }, [rows, busca]);

  async function confirmarExcluir() {
    if (!excluir) return;
    try {
      await deleteCupom(excluir.id);
      toast.success("Cupom removido");
      setExcluir(null);
      void carregar();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao remover");
    }
  }

  async function alternar(c: CupomDetalhado) {
    try {
      await toggleCupomAtivo(c.id, !c.ativo);
      void carregar();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cupons de desconto"
        description="Crie cupons globais ou restritos a um médico/especialidade."
        actions={
          <Button onClick={() => setCriar(true)} className="bg-gradient-primary hover:opacity-90">
            <Plus className="mr-2 h-4 w-4" /> Novo cupom
          </Button>
        }
      />

      <div className="rounded-lg border bg-card">
        <div className="flex items-center gap-2 border-b p-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, nome, médico ou especialidade..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="border-0 focus-visible:ring-0"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-10 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : !session ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            Faça login como secretaria ou admin para gerenciar cupons.
          </p>
        ) : lista.length === 0 ? (
          <div className="p-10 text-center">
            <Tag className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhum cupom cadastrado ainda.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {lista.map((c) => {
              const escopoLabel =
                c.escopo === "global" ? "Global" :
                c.escopo === "medico" ? `Médico: ${c.medico_nome ?? "—"}` :
                `Especialidade: ${c.especialidade_nome ?? "—"}`;
              const valorLabel = c.tipo === "percentual"
                ? `${c.valor}%`
                : formatBRL(c.valor);
              const usoLabel = c.uso_maximo
                ? `${c.uso_atual}/${c.uso_maximo}`
                : `${c.uso_atual} usos`;
              return (
                <div key={c.id} className="grid grid-cols-[1fr_auto] items-start gap-3 p-4">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-primary-soft px-2 py-0.5 font-mono text-sm font-bold text-primary">
                        {c.codigo}
                      </span>
                      <span className="font-medium">{c.nome}</span>
                      <Badge variant={c.ativo ? "default" : "secondary"}>
                        {c.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    {c.descricao && (
                      <p className="text-sm text-muted-foreground">{c.descricao}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{valorLabel}</span>
                      <span>•</span>
                      <span>{escopoLabel}</span>
                      <span>•</span>
                      <span>Validade: {formatData(c.valido_ate)}</span>
                      <span>•</span>
                      <span>{usoLabel}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon" variant="ghost"
                      onClick={() => alternar(c)}
                      title={c.ativo ? "Desativar" : "Ativar"}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon" variant="ghost"
                      onClick={() => setEditar(c)}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon" variant="ghost"
                      onClick={() => setExcluir(c)}
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CupomDialog
        open={criar}
        onOpenChange={setCriar}
        onSaved={carregar}
      />
      <CupomDialog
        open={!!editar}
        onOpenChange={(v) => { if (!v) setEditar(null); }}
        cupom={editar}
        onSaved={carregar}
      />

      <AlertDialog open={!!excluir} onOpenChange={(v) => { if (!v) setExcluir(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cupom {excluir?.codigo}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Considere apenas desativar o cupom
              se ele já foi divulgado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExcluir}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
