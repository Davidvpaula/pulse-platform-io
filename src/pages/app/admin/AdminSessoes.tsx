import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLoading, AdminError, AdminEmpty } from "@/components/admin/AdminStates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { ShieldOff, RefreshCw, Search } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SessionRow {
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
}

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

function useSessoes(showRevoked: boolean) {
  return useQuery<SessionRow[]>({
    queryKey: ["admin", "sessoes", showRevoked],
    queryFn: async () => {
      let q = supabase
        .from("user_sessions")
        .select("id,user_id,ip_address,user_agent,device_label,created_at,last_seen_at,revoked_at")
        .order("last_seen_at", { ascending: false })
        .limit(200);
      if (!showRevoked) q = q.is("revoked_at", null);
      const { data, error } = await q;
      if (error) throw error;
      const ids = Array.from(new Set((data ?? []).map((r: Record<string, unknown>) => r.user_id as string)));
      const { data: cols } = await supabase
        .from("colaboradores")
        .select("user_id,nome_completo,email")
        .in("user_id", ids);
      const map = new Map((cols ?? []).map((c: Record<string, unknown>) => [c.user_id as string, c]));
      return (data ?? []).map((r: Record<string, unknown>) => ({
        ...r,
        nome: (map.get(r.user_id as string) as Record<string, string> | undefined)?.nome_completo,
        email: (map.get(r.user_id as string) as Record<string, string> | undefined)?.email,
      })) as SessionRow[];
    },
    staleTime: 30_000,
    retry: 2,
  });
}

export default function AdminSessoes() {
  const [search, setSearch] = useState("");
  const [showRevoked, setShowRevoked] = useState(false);
  const queryClient = useQueryClient();
  const { data: rows = [], isLoading, error, refetch } = useSessoes(showRevoked);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "sessoes"] });

  async function revoke(id: string) {
    const { error } = await supabase.rpc("session_revoke" as never, { _session_id: id, _reason: "Revogado pelo admin" } as never);
    if (error) { toast({ title: "Erro ao revogar", description: (error as Error).message, variant: "destructive" }); return; }
    toast({ title: "Sessão revogada" });
    invalidate();
  }

  async function revokeAll() {
    const ativas = rows.filter(r => !r.revoked_at);
    if (ativas.length === 0) return;
    let ok = 0;
    for (const r of ativas) {
      const { error } = await supabase.rpc("session_revoke" as never, { _session_id: r.id, _reason: "Revogação em massa pelo admin" } as never);
      if (!error) ok++;
    }
    toast({ title: `${ok} sessão(ões) revogada(s)` });
    invalidate();
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

  if (error) return <AdminError message={(error as Error).message} onRetry={() => refetch()} />;

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
              <Input placeholder="Buscar por usuário, IP, dispositivo" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-72" />
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowRevoked((v) => !v)}>
              {showRevoked ? "Esconder revogadas" : "Mostrar revogadas"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={rows.filter(r => !r.revoked_at).length === 0}>
                  <ShieldOff className="h-4 w-4 mr-1" /> Revogar todas
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Revogar TODAS as sessões ativas?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso deslogará {rows.filter(r => !r.revoked_at).length} usuário(s) em até 1 minuto. Use apenas em emergências.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={revokeAll}>Revogar todas</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <AdminLoading rows={6} /> : (
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
