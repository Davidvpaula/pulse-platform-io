import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Loader2, ShieldOff, RefreshCw, Search } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type SessionRow = {
  id: string;
  user_id: string;
  ip_address: string | null;
  user_agent: string | null;
  device_label: string | null;
  created_at: string;
  last_seen_at: string;
  revoked_at: string | null;
  email?: string;
  nome?: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h atrás`;
  const d = Math.floor(h / 24);
  return `${d} d atrás`;
}

export default function AdminSessoes() {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showRevoked, setShowRevoked] = useState(false);

  async function load() {
    setLoading(true);
    let q = supabase
      .from("user_sessions")
      .select("id,user_id,ip_address,user_agent,device_label,created_at,last_seen_at,revoked_at")
      .order("last_seen_at", { ascending: false })
      .limit(200);
    if (!showRevoked) q = q.is("revoked_at", null);
    const { data, error } = await q;
    if (error) {
      toast({ title: "Erro ao carregar sessões", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const ids = Array.from(new Set((data ?? []).map((r: any) => r.user_id)));
    const { data: cols } = await supabase
      .from("colaboradores")
      .select("user_id,nome,email")
      .in("user_id", ids);
    const map = new Map((cols ?? []).map((c: any) => [c.user_id, c]));
    setRows((data ?? []).map((r: any) => ({
      ...r,
      nome: map.get(r.user_id)?.nome,
      email: map.get(r.user_id)?.email,
    })));
    setLoading(false);
  }

  useEffect(() => { load(); }, [showRevoked]);

  async function revoke(id: string) {
    const { error } = await supabase.rpc("session_revoke", { _session_id: id, _reason: "Revogado pelo admin" });
    if (error) {
      toast({ title: "Erro ao revogar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Sessão revogada" });
    load();
  }

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      (r.email ?? "").toLowerCase().includes(t) ||
      (r.nome ?? "").toLowerCase().includes(t) ||
      (r.ip_address ?? "").toLowerCase().includes(t) ||
      (r.device_label ?? "").toLowerCase().includes(t),
    );
  }, [rows, search]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Sessões ativas</h1>
        <p className="text-muted-foreground">Monitore e revogue sessões de usuários em qualquer dispositivo.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{filtered.length} sessões</CardTitle>
            <CardDescription>{showRevoked ? "Incluindo revogadas" : "Apenas ativas"}</CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuário, IP, dispositivo"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 w-72"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowRevoked((v) => !v)}>
              {showRevoked ? "Esconder revogadas" : "Mostrar revogadas"}
            </Button>
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Dispositivo</TableHead>
                    <TableHead>Criada</TableHead>
                    <TableHead>Último acesso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma sessão</TableCell></TableRow>
                  ) : filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.nome ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.email ?? r.user_id.slice(0, 8)}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.ip_address ?? "—"}</TableCell>
                      <TableCell>
                        <div className="text-sm">{r.device_label ?? "—"}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{r.user_agent ?? ""}</div>
                      </TableCell>
                      <TableCell className="text-xs">{timeAgo(r.created_at)}</TableCell>
                      <TableCell className="text-xs">{timeAgo(r.last_seen_at)}</TableCell>
                      <TableCell>
                        {r.revoked_at
                          ? <Badge variant="destructive">Revogada</Badge>
                          : <Badge variant="default">Ativa</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        {!r.revoked_at && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <ShieldOff className="h-4 w-4 mr-1" /> Revogar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revogar sessão?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  O usuário {r.nome ?? r.email} será deslogado em até 1 minuto.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => revoke(r.id)}>Revogar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
