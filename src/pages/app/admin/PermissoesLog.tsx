import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Search, Download, ArrowLeft, FileJson, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { FUNCOES, ROLES } from "@/lib/permissions/constants";

interface LogRow {
  id: string;
  scope: "perfil" | "funcao" | "colaborador";
  target_role: string | null;
  target_funcao: string | null;
  target_user_id: string | null;
  permission_key: string | null;
  acao: string;
  valor_antes: any;
  valor_depois: any;
  motivo: string | null;
  changed_by: string | null;
  created_at: string;
}

interface UserMap { [uid: string]: { nome: string; email: string } }

const PAGE_SIZE = 50;
const ACOES = ["concedida", "revogada", "alterada", "criada", "removida"];

const ACAO_BADGE: Record<string, string> = {
  concedida: "bg-success/15 text-success",
  criada: "bg-success/15 text-success",
  revogada: "bg-destructive/15 text-destructive",
  removida: "bg-destructive/15 text-destructive",
  alterada: "bg-info/15 text-info",
};

const SCOPE_LABEL: Record<string, string> = {
  perfil: "Perfil base",
  funcao: "Função interna",
  colaborador: "Colaborador",
};

export default function PermissoesLog() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserMap>({});

  // filtros
  const [busca, setBusca] = useState("");
  const [scope, setScope] = useState<string>("todos");
  const [acao, setAcao] = useState<string>("todos");
  const [target, setTarget] = useState<string>("todos");
  const [dias, setDias] = useState<string>("30");

  // paginação
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const [detalhe, setDetalhe] = useState<LogRow | null>(null);

  async function carregar() {
    setLoading(true);
    const desde = new Date(Date.now() - parseInt(dias) * 86400_000).toISOString();

    let q = supabase
      .from("permission_audit_logs")
      .select("*", { count: "exact" })
      .gte("created_at", desde)
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (scope !== "todos") q = q.eq("scope", scope);
    if (acao !== "todos") q = q.eq("acao", acao);
    if (target !== "todos") {
      if (scope === "perfil") q = q.eq("target_role", target as any);
      else if (scope === "funcao") q = q.eq("target_funcao", target as any);
    }

    const { data, error, count } = await q;
    if (error) {
      toast.error("Erro ao carregar logs: " + error.message);
      setRows([]);
      setTotal(0);
    } else {
      let list = (data as LogRow[]) || [];
      if (busca) {
        const b = busca.toLowerCase();
        list = list.filter(r =>
          (r.permission_key || "").toLowerCase().includes(b) ||
          (r.motivo || "").toLowerCase().includes(b) ||
          (r.target_user_id || "").toLowerCase().includes(b) ||
          (r.changed_by || "").toLowerCase().includes(b),
        );
      }
      setRows(list);
      setTotal(count || 0);

      // Buscar nomes dos usuários envolvidos
      const uids = Array.from(new Set(
        list.flatMap(r => [r.target_user_id, r.changed_by]).filter(Boolean),
      )) as string[];
      const faltantes = uids.filter(u => !users[u]);
      if (faltantes.length > 0) {
        const { data: cs } = await supabase
          .from("colaboradores")
          .select("user_id,nome_completo,email")
          .in("user_id", faltantes);
        const novo: UserMap = { ...users };
        (cs || []).forEach(c => {
          novo[c.user_id] = { nome: c.nome_completo, email: c.email };
        });
        setUsers(novo);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, scope, acao, target, dias]);

  // Reset página ao mudar filtros
  useEffect(() => { setPage(0); }, [scope, acao, target, dias, busca]);

  function nomeUsuario(uid: string | null): string {
    if (!uid) return "—";
    return users[uid]?.nome || users[uid]?.email || uid.slice(0, 8) + "…";
  }

  function nomeAlvo(r: LogRow): string {
    if (r.scope === "perfil") return ROLES.find(x => x.key === r.target_role)?.label || r.target_role || "—";
    if (r.scope === "funcao") return FUNCOES.find(x => x.key === r.target_funcao)?.label || r.target_funcao || "—";
    if (r.scope === "colaborador") return nomeUsuario(r.target_user_id);
    return "—";
  }

  function exportarCSV() {
    if (rows.length === 0) { toast.info("Nada para exportar"); return; }
    const head = ["Quando", "Escopo", "Alvo", "Permissão", "Ação", "Por", "Motivo"];
    const linhas = rows.map(r => [
      new Date(r.created_at).toLocaleString("pt-BR"),
      SCOPE_LABEL[r.scope] || r.scope,
      nomeAlvo(r),
      r.permission_key || "",
      r.acao,
      nomeUsuario(r.changed_by),
      (r.motivo || "").replace(/\n/g, " "),
    ]);
    const csv = [head, ...linhas]
      .map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `permissoes-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  }

  // Opções de "alvo" dependem do escopo
  const targetOptions = useMemo(() => {
    if (scope === "perfil") return ROLES.map(r => ({ key: r.key, label: r.label }));
    if (scope === "funcao") return FUNCOES.map(f => ({ key: f.key, label: f.label }));
    return [];
  }, [scope]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Histórico de permissões"
        description="Auditoria completa de quem alterou o quê, quando e por quê. Use os filtros para investigar mudanças específicas."
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/app/admin/permissoes"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
        </Button>
        <Button variant="outline" size="sm" onClick={carregar}>
          <RefreshCw className="mr-1 h-4 w-4" /> Atualizar
        </Button>
        <Button variant="outline" size="sm" onClick={exportarCSV}>
          <Download className="mr-1 h-4 w-4" /> Exportar CSV
        </Button>
        <div className="ml-auto text-xs text-muted-foreground">
          {total} registro{total === 1 ? "" : "s"} no período
        </div>
      </div>

      {/* Filtros */}
      <div className="card-elevated p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Buscar permissão, motivo, ID..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              onKeyDown={e => e.key === "Enter" && carregar()}
            />
          </div>
          <Select value={dias} onValueChange={setDias}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Últimas 24h</SelectItem>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <Select value={scope} onValueChange={v => { setScope(v); setTarget("todos"); }}>
            <SelectTrigger><SelectValue placeholder="Escopo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os escopos</SelectItem>
              <SelectItem value="perfil">Perfil base</SelectItem>
              <SelectItem value="funcao">Função interna</SelectItem>
              <SelectItem value="colaborador">Colaborador</SelectItem>
            </SelectContent>
          </Select>
          <Select value={target} onValueChange={setTarget} disabled={targetOptions.length === 0}>
            <SelectTrigger><SelectValue placeholder="Alvo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os alvos</SelectItem>
              {targetOptions.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={acao} onValueChange={setAcao}>
            <SelectTrigger><SelectValue placeholder="Ação" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as ações</SelectItem>
              {ACOES.map(a => <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela */}
      <div className="card-elevated overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Nenhum registro encontrado para os filtros aplicados
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="p-3 text-left font-semibold">Quando</th>
                <th className="p-3 text-left font-semibold">Escopo</th>
                <th className="p-3 text-left font-semibold">Alvo</th>
                <th className="p-3 text-left font-semibold">Permissão</th>
                <th className="p-3 text-left font-semibold">Ação</th>
                <th className="p-3 text-left font-semibold">Por</th>
                <th className="p-3 text-left font-semibold">Motivo</th>
                <th className="p-3 text-right font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="p-3 text-xs">{SCOPE_LABEL[r.scope] || r.scope}</td>
                  <td className="p-3 text-xs font-medium">{nomeAlvo(r)}</td>
                  <td className="p-3 font-mono text-[11px]">{r.permission_key || "—"}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${ACAO_BADGE[r.acao] || "bg-muted text-muted-foreground"}`}>
                      {r.acao}
                    </span>
                  </td>
                  <td className="p-3 text-xs">{nomeUsuario(r.changed_by)}</td>
                  <td className="p-3 text-xs text-muted-foreground max-w-[240px] truncate" title={r.motivo || ""}>
                    {r.motivo || "—"}
                  </td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setDetalhe(r)}>
                      <FileJson className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Página {page + 1} de {totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              Anterior
            </Button>
            <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Detalhe */}
      <Dialog open={!!detalhe} onOpenChange={o => !o && setDetalhe(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhe da alteração</DialogTitle>
          </DialogHeader>
          {detalhe && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Info label="Quando" value={new Date(detalhe.created_at).toLocaleString("pt-BR")} />
                <Info label="Escopo" value={SCOPE_LABEL[detalhe.scope]} />
                <Info label="Alvo" value={nomeAlvo(detalhe)} />
                <Info label="Permissão" value={detalhe.permission_key || "—"} mono />
                <Info label="Ação" value={detalhe.acao} />
                <Info label="Realizada por" value={nomeUsuario(detalhe.changed_by)} />
              </div>
              {detalhe.motivo && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Motivo</p>
                  <p className="mt-1 rounded-md bg-muted/40 p-2 text-sm">{detalhe.motivo}</p>
                </div>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                <DiffBox label="Antes" value={detalhe.valor_antes} />
                <DiffBox label="Depois" value={detalhe.valor_depois} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 ${mono ? "font-mono text-xs" : "text-sm"}`}>{value}</p>
    </div>
  );
}

function DiffBox({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <pre className="mt-1 max-h-48 overflow-auto rounded-md bg-muted/40 p-2 text-[11px]">
        {value == null ? "—" : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
