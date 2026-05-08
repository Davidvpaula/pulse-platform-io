import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, RefreshCw } from "lucide-react";
import { EventoSeveridadeBadge } from "@/components/comunicacao/producao/EventoSeveridadeBadge";
import { format } from "date-fns";

type Evento = {
  id: string;
  created_at: string;
  modulo: string;
  evento: string;
  severity: string;
  conversation_id: string | null;
  user_id: string | null;
  metadata: any;
};

const PAGE_SIZE = 50;

export default function AdminObservabilidade() {
  const [rows, setRows] = useState<Evento[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modulo, setModulo] = useState<string>("all");
  const [severity, setSeverity] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const [canExport, setCanExport] = useState(false);

  async function checkPerm() {
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return;
    const { data } = await supabase.rpc("has_permission" as any, {
      _user_id: u.user.id,
      _key: "observabilidade.exportar",
    });
    setCanExport(!!data);
  }

  async function load() {
    setLoading(true);
    try {
      let q = supabase
        .from("observabilidade_eventos")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (modulo !== "all") q = q.eq("modulo", modulo);
      if (severity !== "all") q = q.eq("severity", severity);
      if (search) q = q.ilike("evento", `%${search}%`);
      const { data, count, error } = await q;
      if (error) throw error;
      setRows((data ?? []) as Evento[]);
      setTotal(count ?? 0);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao carregar eventos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { checkPerm(); }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, modulo, severity]);

  async function exportCsv() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "10000");
      if (modulo !== "all") params.set("modulo", modulo);
      if (severity !== "all") params.set("severity", severity);

      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/observabilidade-export?${params.toString()}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${r.status}`);
      }
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `observabilidade_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("CSV exportado");
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao exportar");
    } finally {
      setExporting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Observabilidade"
        description="Eventos de comunicação, IA e produção registrados em tempo real."
        actions={
          <Button
            size="sm"
            onClick={exportCsv}
            disabled={exporting || !canExport}
            title={canExport ? "" : "Requer permissão observabilidade.exportar"}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Exportar CSV
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <Select value={modulo} onValueChange={(v) => { setModulo(v); setPage(0); }}>
            <SelectTrigger><SelectValue placeholder="Módulo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os módulos</SelectItem>
              <SelectItem value="whatsapp">whatsapp</SelectItem>
              <SelectItem value="ia_assistente">ia_assistente</SelectItem>
              <SelectItem value="ia_avatar">ia_avatar</SelectItem>
              <SelectItem value="observabilidade">observabilidade</SelectItem>
            </SelectContent>
          </Select>
          <Select value={severity} onValueChange={(v) => { setSeverity(v); setPage(0); }}>
            <SelectTrigger><SelectValue placeholder="Severidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="info">info</SelectItem>
              <SelectItem value="warn">warn</SelectItem>
              <SelectItem value="error">error</SelectItem>
              <SelectItem value="critical">critical</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Buscar evento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (setPage(0), load())}
          />
          <Button variant="outline" onClick={() => { setPage(0); load(); }} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Aplicar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4"><Skeleton className="h-48 w-full" /></div>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">Nenhum evento encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Quando</TableHead>
                  <TableHead className="w-[120px]">Módulo</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead className="w-[90px]">Sev.</TableHead>
                  <TableHead>Metadata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">
                      {format(new Date(r.created_at), "dd/MM HH:mm:ss")}
                    </TableCell>
                    <TableCell><Badge variant="outline">{r.modulo}</Badge></TableCell>
                    <TableCell className="text-sm">{r.evento}</TableCell>
                    <TableCell><EventoSeveridadeBadge severity={r.severity} /></TableCell>
                    <TableCell>
                      <code className="text-[10px] text-muted-foreground line-clamp-1">
                        {r.metadata ? JSON.stringify(r.metadata) : ""}
                      </code>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Total: {total} eventos</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-xs self-center">Página {page + 1} de {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
}
