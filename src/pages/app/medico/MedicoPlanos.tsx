import { useEffect, useState } from "react";
import { brl } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit2, Eye, FileText, Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PlanoBuilder } from "@/components/planos/PlanoBuilder";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

const STATUS_COLORS: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  ativo: "bg-success/10 text-success",
  inativo: "bg-destructive/10 text-destructive",
  arquivado: "bg-muted text-muted-foreground",
  encerramento_pendente: "bg-orange-100 text-orange-800",
  encerrado: "bg-red-100 text-red-800",
};

export default function MedicoPlanos() {
  const { session } = useSession();
  const uid = session?.user?.id;
  const [planos, setPlanos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showTermos, setShowTermos] = useState(false);
  const [termos, setTermos] = useState("");
  // Cancellation state
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState("");
  const [cancelTermosAceitos, setCancelTermosAceitos] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelInfo, setCancelInfo] = useState<{ pacientes: number; valor: number } | null>(null);
  const [termosCancelamento, setTermosCancelamento] = useState("");

  async function load() {
    if (!uid) return;
    setLoading(true);
    const { data } = await supabase
      .from("planos")
      .select("*")
      .eq("medico_id", uid)
      .eq("nivel", "medico" as any)
      .order("created_at", { ascending: false });
    setPlanos(data ?? []);
    setLoading(false);
  }

  async function loadTermos() {
    const [{ data: t1 }, { data: t2 }] = await Promise.all([
      supabase.from("app_settings").select("value").eq("key", "termos_plano_medico").maybeSingle(),
      supabase.from("app_settings").select("value").eq("key", "termos_cancelamento_plano_medico").maybeSingle(),
    ]);
    setTermos((t1?.value as string) ?? "Ao criar um plano personalizado, você concorda com os termos de uso da plataforma.");
    setTermosCancelamento(
      (t2?.value as string) ??
      "Ao solicitar o encerramento do plano, você se compromete a manter o atendimento dos pacientes ativos até o final do ciclo de pagamento vigente. " +
      "A plataforma pode intervir em caso de conflito e forçar reembolsos se necessário. " +
      "Cancelamento não pode prejudicar o paciente."
    );
  }

  useEffect(() => { load(); loadTermos(); }, [uid]);

  function novoPlano() { setShowTermos(true); }
  function aceitarTermos() { setShowTermos(false); setEditId(null); setBuilderOpen(true); }

  async function openCancelDialog(p: any) {
    setCancelTarget(p);
    setCancelMotivo("");
    setCancelTermosAceitos(false);
    setCancelInfo(null);
    // Load active subscriptions count and value
    const { data: subs } = await supabase
      .from("assinaturas")
      .select("id, valor_cobrado_centavos")
      .eq("plano_id", p.id)
      .eq("status", "ativa" as any);
    const pacientes = subs?.length ?? 0;
    const valor = (subs ?? []).reduce((acc: number, s: any) => acc + (s.valor_cobrado_centavos || 0), 0);
    setCancelInfo({ pacientes, valor });
  }

  async function confirmarCancelamento() {
    if (!cancelTarget || !uid) return;
    setCancelLoading(true);
    try {
      // Create cancellation event
      const { error: evtErr } = await supabase.from("plano_cancelamento_evento").insert({
        plano_id: cancelTarget.id,
        medico_id: uid,
        total_pacientes: cancelInfo?.pacientes ?? 0,
        valor_total_comprometido_centavos: cancelInfo?.valor ?? 0,
        tipo_encerramento: "cumprir_ciclo",
        motivo: cancelMotivo,
        termos_aceitos: true,
      });
      if (evtErr) throw evtErr;

      // Update plan status
      const { error: plErr } = await supabase.from("planos").update({
        status: "encerramento_pendente" as any,
      }).eq("id", cancelTarget.id);
      if (plErr) throw plErr;

      toast.success("Solicitação de cancelamento enviada. O Admin revisará em breve.");
      setCancelTarget(null);
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCancelLoading(false);
    }
  }

  const toReais = (c: number) => `R$ ${((c || 0) / 100).toFixed(2).replace(".", ",")}`;

  const canCancel = (p: any) => ["ativo", "inativo"].includes(p.status);

  return (
    <PageShell title="Meus Planos" subtitle="Crie e gerencie planos personalizados para seus pacientes">
      <div className="flex justify-end mb-4">
        <Button onClick={novoPlano}>
          <Plus className="h-4 w-4 mr-1" /> Novo plano
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : planos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Você ainda não criou nenhum plano.</p>
            <p className="text-sm mt-1">Crie um plano personalizado para oferecer aos seus pacientes.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {planos.map(p => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{p.nome}</CardTitle>
                  <Badge className={STATUS_COLORS[p.status] ?? ""}>{p.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {p.descricao_comercial && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{p.descricao_comercial}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">{toReais(p.valor_mensal_centavos)}<span className="text-xs font-normal text-muted-foreground">/mês</span></span>
                  <div className="flex gap-1">
                    {!["encerramento_pendente", "encerrado"].includes(p.status) && (
                      <Button size="icon" variant="ghost" onClick={() => { setEditId(p.id); setBuilderOpen(true); }}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                    {canCancel(p) && (
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => openCancelDialog(p)} title="Encerrar plano">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {p.aprovado_admin && (
                  <Badge variant="outline" className="text-[10px] bg-success/10 text-success">
                    Aprovado pelo Admin
                  </Badge>
                )}
                {p.publicado_site && (
                  <Badge variant="outline" className="text-[10px]">
                    <Eye className="h-3 w-3 mr-1" /> Visível no perfil
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Termos de criação */}
      <Dialog open={showTermos} onOpenChange={setShowTermos}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Termos e Condições</DialogTitle>
            <DialogDescription>Leia e aceite antes de criar seu plano.</DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto rounded border p-3 text-sm whitespace-pre-wrap">
            {termos}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTermos(false)}>Cancelar</Button>
            <Button onClick={aceitarTermos}>Aceitar e continuar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de cancelamento */}
      <Dialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Encerrar plano
            </DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita facilmente. Leia com atenção.
            </DialogDescription>
          </DialogHeader>
          {cancelTarget && (
            <div className="space-y-4">
              {/* Aviso jurídico */}
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm space-y-2">
                <p className="font-semibold text-destructive">⚠️ Aviso Legal</p>
                <p className="whitespace-pre-wrap">{termosCancelamento}</p>
              </div>

              {/* Resumo */}
              <div className="rounded border p-3 text-sm space-y-1">
                <p><strong>Plano:</strong> {cancelTarget.nome}</p>
                <p><strong>Pacientes ativos:</strong> {cancelInfo?.pacientes ?? "..."}</p>
                <p><strong>Valor comprometido:</strong> {cancelInfo ? toReais(cancelInfo.valor) : "..."}</p>
              </div>

              <div>
                <label className="text-sm font-medium">Motivo do cancelamento</label>
                <Textarea
                  value={cancelMotivo}
                  onChange={e => setCancelMotivo(e.target.value)}
                  placeholder="Explique o motivo..."
                  rows={3}
                />
              </div>

              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={cancelTermosAceitos}
                  onCheckedChange={(v) => setCancelTermosAceitos(!!v)}
                  className="mt-0.5"
                />
                <span>Estou ciente das responsabilidades e aceito cumprir o atendimento até o final do ciclo de todos os pacientes ativos.</span>
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Voltar</Button>
            <Button
              variant="destructive"
              onClick={confirmarCancelamento}
              disabled={cancelLoading || !cancelTermosAceitos || !cancelMotivo.trim()}
            >
              {cancelLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Confirmar encerramento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Builder */}
      <PlanoBuilder
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        planoId={editId}
        onSaved={load}
        medicoMode
      />
    </PageShell>
  );
}
