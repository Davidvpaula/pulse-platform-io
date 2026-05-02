import { useEffect, useMemo, useState } from "react";
import {
  Building2, Users, Calendar, Loader2, Search, BadgeCheck, User,
  Send, DollarSign, Percent, CheckCircle2, XCircle, Clock, FileText,
  MessageSquareText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSession } from "@/lib/session";
import { getMedicoAtual } from "@/lib/clinico";
import { cn } from "@/lib/utils";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtData = (d: string) => new Date(d).toLocaleDateString("pt-BR");
const fmtDataHora = (d: string) => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const STATUS_COLORS: Record<string, string> = {
  agendada: "bg-blue-500/15 text-blue-700",
  confirmada: "bg-emerald-500/15 text-emerald-700",
  em_andamento: "bg-amber-500/15 text-amber-700",
  concluida: "bg-success/15 text-success",
  cancelada: "bg-destructive/15 text-destructive",
  no_show: "bg-muted text-muted-foreground",
};

const VINCULO_COLORS: Record<string, string> = {
  ativo: "bg-emerald-500/15 text-emerald-700",
  inativo: "bg-muted text-muted-foreground",
  afastado: "bg-amber-500/15 text-amber-700",
  desligado: "bg-destructive/15 text-destructive",
};

type Origem = "todas" | "empresa" | "particular";
type VinculoStatus = "todos" | "ativo" | "inativo" | "afastado" | "desligado";

export default function MedicoCorporativo() {
  const { session } = useSession();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [consultas, setConsultas] = useState<any[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [vinculos, setVinculos] = useState<Map<string, any>>(new Map());
  const [propostasB2B, setPropostasB2B] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState("todas");
  const [filtroOrigem, setFiltroOrigem] = useState<Origem>("todas");
  const [filtroVinculo, setFiltroVinculo] = useState<VinculoStatus>("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  useEffect(() => {
    (async () => {
      if (!session) { setLoading(false); return; }
      try {
        const med = await getMedicoAtual();
        if (!med) { setLoading(false); return; }

        // All consultas for this doctor — both corporate and private
        const { data: cons } = await supabase
          .from("consultas")
          .select("*, empresa:empresas(id, razao_social, nome_fantasia), paciente:pacientes(id, nome_completo)")
          .eq("medico_id", med.id)
          .order("inicio", { ascending: false })
          .limit(500);

        setConsultas(cons ?? []);

        // Build unique pacientes map
        const pacMap = new Map<string, any>();
        (cons ?? []).forEach((c: any) => {
          if (!c.paciente) return;
          if (!pacMap.has(c.paciente_id)) {
            pacMap.set(c.paciente_id, {
              ...c.paciente,
              empresa: c.empresa,
              empresa_id: c.empresa_id,
              totalConsultas: 0,
              consultasEmpresa: 0,
              consultasParticular: 0,
              ultimaConsulta: c.inicio,
            });
          }
          const p = pacMap.get(c.paciente_id)!;
          p.totalConsultas++;
          if (c.empresa_id) {
            p.consultasEmpresa++;
            if (!p.empresa) { p.empresa = c.empresa; p.empresa_id = c.empresa_id; }
          } else {
            p.consultasParticular++;
          }
        });
        setPacientes(Array.from(pacMap.values()));

        // Fetch vínculo status for all pacientes from empresas_funcionarios
        const pacIds = Array.from(pacMap.keys());
        if (pacIds.length > 0) {
          const { data: funcs } = await supabase
            .from("empresas_funcionarios")
            .select("paciente_id, status, empresa_id, empresa:empresas(id, razao_social, nome_fantasia)")
            .in("paciente_id", pacIds);
          const vMap = new Map<string, any>();
          (funcs ?? []).forEach((f: any) => {
            vMap.set(f.paciente_id, f);
          });
          setVinculos(vMap);
        }
      } catch (e: any) {
        toast.error("Erro: " + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [session]);

  const empresas = useMemo(() => {
    const set = new Map<string, string>();
    consultas.forEach(c => {
      if (c.empresa) set.set(c.empresa.id, c.empresa.nome_fantasia || c.empresa.razao_social);
    });
    return Array.from(set.entries()).map(([id, nome]) => ({ id, nome }));
  }, [consultas]);

  const consultasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return consultas.filter(c => {
      if (filtroEmpresa !== "todas" && c.empresa_id !== filtroEmpresa) return false;
      if (filtroOrigem === "empresa" && !c.empresa_id) return false;
      if (filtroOrigem === "particular" && c.empresa_id) return false;
      if (filtroStatus !== "todos" && c.status !== filtroStatus) return false;
      if (q) {
        const blob = `${c.paciente?.nome_completo ?? ""} ${c.empresa?.razao_social ?? ""} ${c.empresa?.nome_fantasia ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [consultas, busca, filtroEmpresa, filtroOrigem, filtroStatus]);

  const pacientesFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return pacientes.filter(p => {
      if (filtroEmpresa !== "todas" && p.empresa_id !== filtroEmpresa) return false;
      if (filtroOrigem === "empresa" && !p.empresa_id) return false;
      if (filtroOrigem === "particular" && p.empresa_id) return false;
      if (filtroVinculo !== "todos") {
        const v = vinculos.get(p.id);
        if (!v || v.status !== filtroVinculo) return false;
      }
      if (q && !p.nome_completo?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [pacientes, busca, filtroEmpresa, filtroOrigem, filtroVinculo, vinculos]);

  const kpis = useMemo(() => ({
    totalConsultas: consultas.filter(c => c.empresa_id).length,
    totalParticulares: consultas.filter(c => !c.empresa_id).length,
    totalPacientes: pacientes.length,
    empresasAtendidas: empresas.length,
  }), [consultas, pacientes, empresas]);

  const clearFilters = () => {
    setBusca("");
    setFiltroEmpresa("todas");
    setFiltroOrigem("todas");
    setFiltroVinculo("todos");
    setFiltroStatus("todos");
  };

  const hasActiveFilters = busca || filtroEmpresa !== "todas" || filtroOrigem !== "todas" || filtroVinculo !== "todos" || filtroStatus !== "todos";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando módulo corporativo…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Corporativo"
        description="Consultas e pacientes vinculados a empresas parceiras e particulares."
        actions={
          <Badge variant="outline" className="border-primary/30 text-primary">
            <Building2 className="mr-1.5 h-3.5 w-3.5" /> B2B / B2C
          </Badge>
        }
      />

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Consultas empresa" value={String(kpis.totalConsultas)} icon={Building2} />
        <StatCard label="Consultas particular" value={String(kpis.totalParticulares)} icon={User} />
        <StatCard label="Pacientes únicos" value={String(kpis.totalPacientes)} icon={Users} />
        <StatCard label="Empresas atendidas" value={String(kpis.empresasAtendidas)} icon={BadgeCheck} />
      </div>

      {/* Filtros avançados */}
      <div className="card-elevated p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Filtros avançados</h3>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs text-primary hover:underline">
              Limpar filtros
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px] max-w-sm">
            <label className="text-xs text-muted-foreground mb-1 block">Busca</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Paciente ou empresa…" value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
            </div>
          </div>

          <div className="w-[180px]">
            <label className="text-xs text-muted-foreground mb-1 block">Empresa</label>
            <Select value={filtroEmpresa} onValueChange={setFiltroEmpresa}>
              <SelectTrigger><SelectValue placeholder="Empresa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {empresas.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[160px]">
            <label className="text-xs text-muted-foreground mb-1 block">Origem</label>
            <Select value={filtroOrigem} onValueChange={v => setFiltroOrigem(v as Origem)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="empresa">Empresa (B2B)</SelectItem>
                <SelectItem value="particular">Particular (B2C)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-[160px]">
            <label className="text-xs text-muted-foreground mb-1 block">Vínculo</label>
            <Select value={filtroVinculo} onValueChange={v => setFiltroVinculo(v as VinculoStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="afastado">Afastado</SelectItem>
                <SelectItem value="desligado">Desligado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-[160px]">
            <label className="text-xs text-muted-foreground mb-1 block">Status consulta</label>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="agendada">Agendada</SelectItem>
                <SelectItem value="confirmada">Confirmada</SelectItem>
                <SelectItem value="em_andamento">Em andamento</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
                <SelectItem value="no_show">No-show</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Tabs defaultValue="consultas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="consultas">Consultas ({consultasFiltradas.length})</TabsTrigger>
          <TabsTrigger value="pacientes">Pacientes ({pacientesFiltrados.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="consultas">
          {consultasFiltradas.length === 0 ? (
            <div className="card-elevated p-12 text-center text-muted-foreground">
              Nenhuma consulta encontrada com os filtros aplicados.
            </div>
          ) : (
            <div className="card-elevated overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consultasFiltradas.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.paciente?.nome_completo ?? "—"}</TableCell>
                      <TableCell>
                        {c.empresa ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-primary/60" />
                            <span className="text-sm">{c.empresa.nome_fantasia || c.empresa.razao_social}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{fmtDataHora(c.inicio)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[c.status] ?? "")}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {c.empresa_id ? (
                          <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
                            <Building2 className="mr-1 h-2.5 w-2.5" /> Empresa
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-accent/30 text-accent-foreground text-[10px]">
                            <User className="mr-1 h-2.5 w-2.5" /> Particular
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{brl(c.valor_centavos)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pacientes">
          {pacientesFiltrados.length === 0 ? (
            <div className="card-elevated p-12 text-center text-muted-foreground">
              Nenhum paciente encontrado com os filtros aplicados.
            </div>
          ) : (
            <div className="card-elevated overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Vínculo</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead className="text-right">Consultas</TableHead>
                    <TableHead>Última consulta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pacientesFiltrados.map(p => {
                    const vinculo = vinculos.get(p.id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.nome_completo}</TableCell>
                        <TableCell>
                          {p.empresa ? (
                            <div className="flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-primary/60" />
                              <span className="text-sm">{p.empresa.nome_fantasia || p.empresa.razao_social}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sem vínculo</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {vinculo ? (
                            <Badge variant="secondary" className={cn("text-xs capitalize", VINCULO_COLORS[vinculo.status] ?? "")}>
                              {vinculo.status}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {p.consultasEmpresa > 0 && (
                              <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
                                B2B ({p.consultasEmpresa})
                              </Badge>
                            )}
                            {p.consultasParticular > 0 && (
                              <Badge variant="outline" className="border-accent/30 text-accent-foreground text-[10px]">
                                B2C ({p.consultasParticular})
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{p.totalConsultas}</TableCell>
                        <TableCell className="text-sm">{p.ultimaConsulta ? fmtData(p.ultimaConsulta) : "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
