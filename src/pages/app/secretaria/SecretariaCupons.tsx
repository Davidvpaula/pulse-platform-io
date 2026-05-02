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
} from "@/lib/cupons";
import { formatBRL } from "@/lib/pagamentos";
import CupomDialog from "@/components/secretaria/CupomDialog";
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
  const [filtroEscopo, setFiltroEscopo] = useState<"todos" | "global" | "medico" | "especialidade">("todos");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativos" | "inativos" | "expirados" | "esgotados">("todos");

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
    const agora = Date.now();
    return arr.filter((c) => {
      if (filtroEscopo !== "todos" && c.escopo !== filtroEscopo) return false;
      const expirado = !!c.valido_ate && new Date(c.valido_ate).getTime() < agora;
      const esgotado = !!c.uso_maximo && c.uso_atual >= c.uso_maximo;
      if (filtroStatus === "ativos" && (!c.ativo || expirado || esgotado)) return false;
      if (filtroStatus === "inativos" && c.ativo) return false;
      if (filtroStatus === "expirados" && !expirado) return false;
      if (filtroStatus === "esgotados" && !esgotado) return false;
      if (!q) return true;
      return (
        c.codigo.toLowerCase().includes(q) ||
        c.nome.toLowerCase().includes(q) ||
        (c.medico_nome ?? "").toLowerCase().includes(q) ||
        (c.especialidade_nome ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, busca, filtroEscopo, filtroStatus]);

  const contadores = useMemo(() => {
    const arr = rows ?? [];
    const agora = Date.now();
    let ativos = 0, inativos = 0, expirados = 0, esgotados = 0;
    for (const c of arr) {
      const expirado = !!c.valido_ate && new Date(c.valido_ate).getTime() < agora;
      const esgotado = !!c.uso_maximo && c.uso_atual >= c.uso_maximo;
      if (expirado) expirados++;
      if (esgotado) esgotados++;
      if (!c.ativo) inativos++;
      else if (!expirado && !esgotado) ativos++;
    }
    return { total: arr.length, ativos, inativos, expirados, esgotados };
  }, [rows]);

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

      {/* Cards de contagem por status */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { key: "todos", label: "Total", value: contadores.total },
          { key: "ativos", label: "Ativos", value: contadores.ativos },
          { key: "inativos", label: "Inativos", value: contadores.inativos },
          { key: "expirados", label: "Expirados", value: contadores.expirados },
          { key: "esgotados", label: "Esgotados", value: contadores.esgotados },
        ].map((c) => (
          <button
            key={c.key}
            onClick={() => setFiltroStatus(c.key as typeof filtroStatus)}
            className={`rounded-lg border bg-card p-3 text-left transition hover:border-primary/40 ${
              filtroStatus === c.key ? "border-primary ring-2 ring-primary/20" : ""
            }`}
          >
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="text-2xl font-semibold">{c.value}</p>
          </button>
        ))}
      </div>

      <div className="rounded-lg border bg-card">
        <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, nome, médico ou especialidade..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="border-0 focus-visible:ring-0"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filtroEscopo} onValueChange={(v) => setFiltroEscopo(v as typeof filtroEscopo)}>
              <SelectTrigger className="h-9 w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os escopos</SelectItem>
                <SelectItem value="global">Global</SelectItem>
                <SelectItem value="medico">Por médico</SelectItem>
                <SelectItem value="especialidade">Por especialidade</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as typeof filtroStatus)}>
              <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos status</SelectItem>
                <SelectItem value="ativos">Ativos</SelectItem>
                <SelectItem value="inativos">Inativos</SelectItem>
                <SelectItem value="expirados">Expirados</SelectItem>
                <SelectItem value="esgotados">Esgotados</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
