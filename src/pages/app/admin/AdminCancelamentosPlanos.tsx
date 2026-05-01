import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageShell from "@/components/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, XCircle, AlertTriangle, Ban } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  aprovado_admin: "bg-blue-100 text-blue-800",
  em_encerramento: "bg-orange-100 text-orange-800",
  finalizado: "bg-muted text-muted-foreground",
  cancelado: "bg-red-100 text-red-800",
};

const toReais = (c: number) => `R$ ${((c || 0) / 100).toFixed(2).replace(".", ",")}`;

export default function AdminCancelamentosPlanos() {
  const [eventos, setEventos] = useState<any[]>([]);
  const [reembolsos, setReembolsos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState<any | null>(null);
  const [actionType, setActionType] = useState<string>("");
  const [nota, setNota] = useState("");
  const [processing, setProcessing] = useState(false);
  const [tab, setTab] = useState("cancelamentos");

  async function load() {
    setLoading(true);
    const [{ data: evts }, { data: reemb }] = await Promise.all([
      supabase
        .from("plano_cancelamento_evento")
        .select("*, plano:planos(id, nome, medico_id, medicos!planos_medico_id_fkey(nome))")
        .order("created_at", { ascending: false }),
      supabase
        .from("reembolso_planos")
        .select("*, plano:planos(id, nome)")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    setEventos(evts ?? []);
    setReembolsos(reemb ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAction() {
    if (!actionTarget) return;
    setProcessing(true);
    try {
      if (actionType === "aprovar") {
        await supabase.from("plano_cancelamento_evento").update({
          status: "em_encerramento",
          admin_acao: `Aprovado: ${nota}`,
          admin_id: (await supabase.auth.getUser()).data.user?.id,
          admin_acao_em: new Date().toISOString(),
        }).eq("id", actionTarget.id);
        // Block renewals on all active subscriptions for this plan
        await supabase.from("assinaturas").update({
          renovacao_bloqueada: true,
        }).eq("plano_id", actionTarget.plano_id).eq("status", "ativa" as any);
        toast.success("Cancelamento aprovado — renovações bloqueadas");
      } else if (actionType === "rejeitar") {
        await supabase.from("plano_cancelamento_evento").update({
          status: "cancelado",
          admin_acao: `Rejeitado: ${nota}`,
          admin_id: (await supabase.auth.getUser()).data.user?.id,
          admin_acao_em: new Date().toISOString(),
        }).eq("id", actionTarget.id);
        // Restore plan status
        await supabase.from("planos").update({ status: "ativo" as any }).eq("id", actionTarget.plano_id);
        toast.success("Cancelamento rejeitado — plano restaurado");
      } else if (actionType === "finalizar") {
        await supabase.from("plano_cancelamento_evento").update({
          status: "finalizado",
          admin_acao: `Finalizado: ${nota}`,
          admin_id: (await supabase.auth.getUser()).data.user?.id,
          admin_acao_em: new Date().toISOString(),
        }).eq("id", actionTarget.id);
        await supabase.from("planos").update({ status: "encerrado" as any }).eq("id", actionTarget.plano_id);
        toast.success("Plano encerrado definitivamente");
      }
      setActionTarget(null);
      setNota("");
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessing(false);
    }
  }

  function openAction(evt: any, type: string) {
    setActionTarget(evt);
    setActionType(type);
    setNota("");
  }

  return (
    <PageShell title="Cancelamentos de Planos" subtitle="Gerencie solicitações de encerramento de planos de médicos">
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="cancelamentos">Cancelamentos ({eventos.length})</TabsTrigger>
            <TabsTrigger value="reembolsos">Reembolsos ({reembolsos.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="cancelamentos">
            {eventos.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma solicitação de cancelamento.</CardContent></Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Médico</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Pacientes</TableHead>
                      <TableHead>Valor comprometido</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventos.map(evt => (
                      <TableRow key={evt.id}>
                        <TableCell>{(evt.plano?.medicos as any)?.nome ?? "—"}</TableCell>
                        <TableCell className="font-medium">{evt.plano?.nome ?? "—"}</TableCell>
                        <TableCell>{evt.total_pacientes}</TableCell>
                        <TableCell>{toReais(evt.valor_total_comprometido_centavos)}</TableCell>
                        <TableCell><Badge variant="outline">{evt.tipo_encerramento}</Badge></TableCell>
                        <TableCell><Badge className={STATUS_COLORS[evt.status] ?? ""}>{evt.status}</Badge></TableCell>
                        <TableCell className="text-sm">{new Date(evt.created_at).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {evt.status === "pendente" && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => openAction(evt, "aprovar")}>
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> Aprovar
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => openAction(evt, "rejeitar")}>
                                  <XCircle className="h-3.5 w-3.5 mr-1" /> Rejeitar
                                </Button>
                              </>
                            )}
                            {evt.status === "em_encerramento" && (
                              <Button size="sm" variant="outline" onClick={() => openAction(evt, "finalizar")}>
                                <Ban className="h-3.5 w-3.5 mr-1" /> Finalizar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reembolsos">
            {reembolsos.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum reembolso registrado.</CardContent></Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plano</TableHead>
                      <TableHead>Valor original</TableHead>
                      <TableHead>Valor proporcional</TableHead>
                      <TableHead>Dias restantes</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reembolsos.map(r => (
                      <TableRow key={r.id}>
                        <TableCell>{r.plano?.nome ?? "—"}</TableCell>
                        <TableCell>{toReais(r.valor_centavos)}</TableCell>
                        <TableCell className="font-medium">{toReais(r.valor_proporcional_centavos)}</TableCell>
                        <TableCell>{r.dias_restantes}/{r.dias_total_ciclo}</TableCell>
                        <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                        <TableCell className="text-sm">{new Date(r.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Action Dialog */}
      <Dialog open={!!actionTarget} onOpenChange={(o) => !o && setActionTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "aprovar" ? "Aprovar cancelamento" : actionType === "rejeitar" ? "Rejeitar cancelamento" : "Finalizar encerramento"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "aprovar"
                ? "Renovações serão bloqueadas. Pacientes mantêm acesso até o fim do ciclo."
                : actionType === "rejeitar"
                ? "O plano voltará ao status ativo."
                : "O plano será marcado como encerrado definitivamente."}
            </DialogDescription>
          </DialogHeader>
          {actionTarget && (
            <div className="space-y-3">
              <div className="rounded border p-3 text-sm space-y-1">
                <p><strong>Plano:</strong> {actionTarget.plano?.nome}</p>
                <p><strong>Pacientes afetados:</strong> {actionTarget.total_pacientes}</p>
                <p><strong>Valor comprometido:</strong> {toReais(actionTarget.valor_total_comprometido_centavos)}</p>
                {actionTarget.motivo && <p><strong>Motivo do médico:</strong> {actionTarget.motivo}</p>}
              </div>
              <div>
                <label className="text-sm font-medium">Observação do Admin</label>
                <Textarea value={nota} onChange={e => setNota(e.target.value)} placeholder="Nota opcional..." rows={3} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionTarget(null)}>Cancelar</Button>
            <Button
              variant={actionType === "rejeitar" ? "destructive" : "default"}
              onClick={handleAction}
              disabled={processing}
            >
              {processing && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
