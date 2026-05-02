import { useEffect, useMemo, useState } from "react";
import {
  Building2, Users, Calendar, Loader2, Search, Eye, FileText, BadgeCheck,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

export default function MedicoCorporativo() {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [medicoId, setMedicoId] = useState<string | null>(null);
  const [consultas, setConsultas] = useState<any[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState("todas");

  useEffect(() => {
    (async () => {
      if (!session) { setLoading(false); return; }
      try {
        const med = await getMedicoAtual();
        if (!med) { setLoading(false); return; }
        setMedicoId(med.id);

        // Consultas corporativas (com empresa_id preenchido)
        const { data: cons } = await supabase
          .from("consultas")
          .select("*, empresa:empresas(id, razao_social, nome_fantasia), paciente:pacientes(id, nome_completo)")
          .eq("medico_id", med.id)
          .not("empresa_id", "is", null)
          .order("inicio", { ascending: false })
          .limit(200);

        setConsultas(cons ?? []);

        // Pacientes únicos dessas consultas
        const pacMap = new Map<string, any>();
        (cons ?? []).forEach((c: any) => {
          if (c.paciente && !pacMap.has(c.paciente_id)) {
            pacMap.set(c.paciente_id, {
              ...c.paciente,
              empresa: c.empresa,
              totalConsultas: 0,
              ultimaConsulta: c.inicio,
            });
          }
          const p = pacMap.get(c.paciente_id);
          if (p) p.totalConsultas++;
        });
        setPacientes(Array.from(pacMap.values()));
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
      if (q) {
        const blob = `${c.paciente?.nome_completo ?? ""} ${c.empresa?.razao_social ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [consultas, busca, filtroEmpresa]);

  const pacientesFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return pacientes.filter(p => {
      if (filtroEmpresa !== "todas" && p.empresa?.id !== filtroEmpresa) return false;
      if (q && !p.nome_completo?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [pacientes, busca, filtroEmpresa]);

  const kpis = useMemo(() => ({
    totalConsultas: consultas.length,
    totalPacientes: pacientes.length,
    empresasAtendidas: empresas.length,
    concluidas: consultas.filter(c => c.status === "concluida").length,
  }), [consultas, pacientes, empresas]);

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
        description="Consultas e pacientes vinculados a empresas parceiras."
        actions={
          <Badge variant="outline" className="border-primary/30 text-primary">
            <Building2 className="mr-1.5 h-3.5 w-3.5" /> B2B
          </Badge>
        }
      />

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Consultas corporativas" value={String(kpis.totalConsultas)} icon={Calendar} />
        <StatCard label="Pacientes empresa" value={String(kpis.totalPacientes)} icon={Users} />
        <StatCard label="Empresas atendidas" value={String(kpis.empresasAtendidas)} icon={Building2} />
        <StatCard label="Concluídas" value={String(kpis.concluidas)} icon={BadgeCheck} />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar paciente ou empresa…" value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
          </div>
        </div>
        <Select value={filtroEmpresa} onValueChange={setFiltroEmpresa}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Empresa" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as empresas</SelectItem>
            {empresas.map(e => (
              <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="consultas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="consultas">Consultas ({consultasFiltradas.length})</TabsTrigger>
          <TabsTrigger value="pacientes">Pacientes ({pacientesFiltrados.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="consultas">
          {consultasFiltradas.length === 0 ? (
            <div className="card-elevated p-12 text-center text-muted-foreground">
              Nenhuma consulta corporativa encontrada.
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
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-primary/60" />
                          <span className="text-sm">{c.empresa?.nome_fantasia || c.empresa?.razao_social || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{fmtDataHora(c.inicio)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[c.status] ?? "")}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
                          Empresa
                        </Badge>
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
              Nenhum paciente corporativo encontrado.
            </div>
          ) : (
            <div className="card-elevated overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead className="text-right">Total consultas</TableHead>
                    <TableHead>Última consulta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pacientesFiltrados.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nome_completo}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-primary/60" />
                          <span className="text-sm">{p.empresa?.nome_fantasia || p.empresa?.razao_social || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{p.totalConsultas}</TableCell>
                      <TableCell className="text-sm">{p.ultimaConsulta ? fmtData(p.ultimaConsulta) : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
