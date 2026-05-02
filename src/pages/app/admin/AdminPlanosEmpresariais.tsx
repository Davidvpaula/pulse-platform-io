import { useEffect, useMemo, useState } from "react";
import {
  Building2, Plus, Search, Loader2, Shield, Users, Wallet,
  Settings2, Eye, Power, Copy,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PlanoBuilder } from "@/components/planos/PlanoBuilder";
import { cn } from "@/lib/utils";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const SLA_LABELS: Record<string, string> = {
  padrao: "Padrão",
  prioritario: "Prioritário",
  vip: "VIP",
};

type PlanoEmpresarial = any;

export default function AdminPlanosEmpresariais() {
  const [loading, setLoading] = useState(true);
  const [planos, setPlanos] = useState<PlanoEmpresarial[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [especialidades, setEspecialidades] = useState<{ id: string; nome: string }[]>([]);

  async function carregar() {
    setLoading(true);
    try {
      const [{ data: ps }, { data: especs }] = await Promise.all([
        supabase
          .from("planos")
          .select("*, empresas(id, razao_social)")
          .or("publico.eq.empresa,publico.eq.ambos,categoria.eq.empresarial")
          .order("created_at", { ascending: false }),
        supabase.from("especialidades").select("id, nome").eq("ativo", true).order("nome"),
      ]);
      setPlanos(ps ?? []);
      setEspecialidades(especs ?? []);
    } catch (e: any) {
      toast.error("Erro ao carregar: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return planos.filter(p => {
      if (filtroStatus === "ativo" && p.status !== "ativo") return false;
      if (filtroStatus === "rascunho" && p.status !== "rascunho") return false;
      if (filtroStatus === "arquivado" && p.status !== "arquivado") return false;
      if (q && !p.nome.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [planos, busca, filtroStatus]);

  const kpis = useMemo(() => ({
    total: planos.length,
    ativos: planos.filter(p => p.status === "ativo").length,
    comVidas: planos.filter(p => (p.valor_por_vida_centavos ?? 0) > 0).length,
    comCoparticipacao: planos.filter(p => (p.coparticipacao_pct ?? 0) > 0).length,
  }), [planos]);

  const getEspecNomes = (ids: string[]) => {
    if (!ids?.length) return "Todas";
    return ids
      .map(id => especialidades.find(e => e.id === id)?.nome)
      .filter(Boolean)
      .join(", ") || "—";
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Planos Empresariais"
        description="Gerencie planos B2B com valor por vida, coparticipação, SLA e regras de uso por especialidade."
        actions={
          <Button onClick={() => { setEditingId(null); setBuilderOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo plano empresarial
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total de planos" value={String(kpis.total)} icon={Building2} />
        <StatCard label="Ativos" value={String(kpis.ativos)} icon={Power} />
        <StatCard label="Com valor/vida" value={String(kpis.comVidas)} icon={Users} />
        <StatCard label="Com coparticipação" value={String(kpis.comCoparticipacao)} icon={Wallet} />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar plano…" value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
          </div>
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="arquivado">Arquivados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : filtrados.length === 0 ? (
        <div className="card-elevated p-12 text-center text-muted-foreground">
          Nenhum plano empresarial encontrado.
        </div>
      ) : (
        <div className="card-elevated overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Modelo cobrança</TableHead>
                <TableHead className="text-right">Valor/vida</TableHead>
                <TableHead className="text-right">Mensal</TableHead>
                <TableHead className="text-right">Copart. %</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Especialidades</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map(p => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{p.nome}</p>
                      {p.descricao && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{p.descricao}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">
                      {p.modelo_cobranca?.replace(/_/g, " ") ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {(p.valor_por_vida_centavos ?? 0) > 0 ? brl(p.valor_por_vida_centavos) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {brl(p.valor_mensal_centavos ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {(p.coparticipacao_pct ?? 0) > 0 ? `${p.coparticipacao_pct}%` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn(
                      p.sla_prioridade === "vip" && "bg-amber-500/15 text-amber-600",
                      p.sla_prioridade === "prioritario" && "bg-primary/15 text-primary",
                    )}>
                      {SLA_LABELS[p.sla_prioridade] ?? p.sla_prioridade}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs max-w-[150px] truncate">
                    {getEspecNomes(p.especialidades_liberadas ?? [])}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.status === "ativo" ? "default" : "secondary"}
                      className={cn(p.status === "ativo" && "bg-success text-success-foreground")}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" title="Editar"
                        onClick={() => { setEditingId(p.id); setBuilderOpen(true); }}>
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Reutiliza PlanoBuilder existente */}
      {builderOpen && (
        <PlanoBuilder
          open={builderOpen}
          onClose={() => setBuilderOpen(false)}
          planoId={editingId}
          onSaved={() => { setBuilderOpen(false); carregar(); }}
        />
      )}
    </div>
  );
}
