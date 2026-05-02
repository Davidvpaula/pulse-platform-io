import { useEffect, useMemo, useState } from "react";
import { brl } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, CheckCircle, XCircle, Search, Filter,
  FileText, Clock, ShieldCheck, ShieldX, Stethoscope,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  rascunho: { label: "Rascunho", variant: "secondary" },
  ativo: { label: "Ativo", variant: "default" },
  inativo: { label: "Inativo", variant: "destructive" },
  arquivado: { label: "Arquivado", variant: "secondary" },
  encerramento_pendente: { label: "Encerramento pendente", variant: "outline" },
  encerrado: { label: "Encerrado", variant: "destructive" },
};

export default function AdminPlanosMedicos() {
  const [planos, setPlanos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroAprovacao, setFiltroAprovacao] = useState("todos");

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("planos")
      .select("*, medicos!planos_medico_id_fkey(nome, especialidade)")
      .eq("nivel", "medico" as any)
      .order("created_at", { ascending: false });
    setPlanos(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const lista = useMemo(() => {
    let arr = planos;
    if (filtroStatus !== "todos") arr = arr.filter(p => p.status === filtroStatus);
    if (filtroAprovacao === "aprovado") arr = arr.filter(p => p.aprovado_admin);
    if (filtroAprovacao === "pendente") arr = arr.filter(p => !p.aprovado_admin);
    if (busca.trim()) {
      const q = busca.toLowerCase();
      arr = arr.filter(p =>
        p.nome?.toLowerCase().includes(q) ||
        (p.medicos as any)?.nome?.toLowerCase().includes(q) ||
        (p.medicos as any)?.especialidade?.toLowerCase().includes(q)
      );
    }
    return arr;
  }, [planos, filtroStatus, filtroAprovacao, busca]);

  const kpis = useMemo(() => {
    const ativos = planos.filter(p => p.status === "ativo");
    const pendentes = planos.filter(p => !p.aprovado_admin);
    const valorTotal = ativos.reduce((s, p) => s + (p.valor_mensal_centavos ?? 0), 0);
    return {
      total: planos.length,
      ativos: ativos.length,
      pendentes: pendentes.length,
      valorTotal,
    };
  }, [planos]);

  async function toggleAprovacao(p: any) {
    const novo = !p.aprovado_admin;
    const { error } = await supabase.from("planos").update({ aprovado_admin: novo }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(novo ? "Plano aprovado pelo Admin" : "Aprovação revogada");
    await load();
  }

  async function toggleAtivo(p: any) {
    const novo = p.status === "ativo" ? "inativo" : "ativo";
    const { error } = await supabase.from("planos").update({ status: novo as any }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(`Plano ${novo}`);
    await load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planos de Médicos"
        description="Planos personalizados criados pelos médicos — aprovação e controle."
      />

      {/* KPIs */}
      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Total", value: kpis.total, icon: FileText, color: "" },
          { label: "Ativos", value: kpis.ativos, icon: CheckCircle, color: "text-green-600 dark:text-green-400" },
          { label: "Pendentes aprovação", value: kpis.pendentes, icon: Clock, color: "text-yellow-600 dark:text-yellow-400" },
          { label: "Receita mensal (ativos)", value: brl(kpis.valorTotal), icon: Stethoscope, color: "text-primary" },
        ].map(k => (
          <div key={k.label} className="card-elevated flex items-center gap-3 p-4">
            <k.icon className={`h-5 w-5 ${k.color || "text-muted-foreground"}`} />
            <div>
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card-elevated p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar plano, médico ou especialidade…" value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-[160px]">
              <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
              <SelectItem value="arquivado">Arquivado</SelectItem>
              <SelectItem value="encerrado">Encerrado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroAprovacao} onValueChange={setFiltroAprovacao}>
            <SelectTrigger className="w-[160px]">
              <ShieldCheck className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas aprovações</SelectItem>
              <SelectItem value="aprovado">Aprovados</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{lista.length} resultado(s)</span>
        </div>
      </div>

      {/* Table */}
      <div className="card-elevated overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Plano</th>
              <th className="text-left px-3 py-3">Médico</th>
              <th className="text-left px-3 py-3">Especialidade</th>
              <th className="text-right px-3 py-3">Valor mensal</th>
              <th className="text-left px-3 py-3">Status</th>
              <th className="text-left px-3 py-3">Aprovação</th>
              <th className="text-left px-3 py-3">Criado em</th>
              <th className="text-right px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr><td colSpan={8} className="py-16 text-center text-muted-foreground">Nenhum plano encontrado.</td></tr>
            )}
            {lista.map(p => {
              const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.rascunho;
              return (
                <tr key={p.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{p.nome}</td>
                  <td className="px-3 py-3">{(p.medicos as any)?.nome ?? "—"}</td>
                  <td className="px-3 py-3 text-muted-foreground">{(p.medicos as any)?.especialidade ?? "—"}</td>
                  <td className="px-3 py-3 text-right tabular-nums font-medium">{brl(p.valor_mensal_centavos)}</td>
                  <td className="px-3 py-3">
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    {p.aprovado_admin ? (
                      <Badge variant="default" className="gap-1">
                        <ShieldCheck className="h-3 w-3" /> Aprovado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-300 dark:text-yellow-400 dark:border-yellow-600">
                        <Clock className="h-3 w-3" /> Pendente
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant={p.aprovado_admin ? "destructive" : "default"}
                        onClick={() => toggleAprovacao(p)}
                      >
                        {p.aprovado_admin ? <ShieldX className="h-3.5 w-3.5 mr-1" /> : <ShieldCheck className="h-3.5 w-3.5 mr-1" />}
                        {p.aprovado_admin ? "Revogar" : "Aprovar"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleAtivo(p)}>
                        {p.status === "ativo" ? "Desativar" : "Ativar"}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
