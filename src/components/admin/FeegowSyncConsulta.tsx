import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface Props {
  consultaId: string;
  pacienteNome?: string;
  medicoNome?: string;
  inicio: string;
  feegowAgendamentoId?: string | null;
  feegowSyncStatus?: string | null;
  onSuccess?: () => void;
}

export function FeegowSyncConsulta({
  consultaId, pacienteNome, medicoNome, inicio,
  feegowAgendamentoId, feegowSyncStatus, onSuccess,
}: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);

  const jaEnviado = !!feegowAgendamentoId;
  const temErro = feegowSyncStatus === "erro";

  async function enviar() {
    setSending(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("feegow-criar-agendamento", {
        body: { consulta_id: consultaId },
      });
      if (error) throw error;
      if (data?.error) {
        setResult({ ok: false, ...data });
        toast({ title: "Erro Feegow", description: data.error, variant: "destructive" });
      } else {
        setResult({ ok: true, ...data });
        toast({ title: "Agendamento enviado", description: `ID Feegow: ${data.feegow_agendamento_id}` });
        onSuccess?.();
      }
    } catch (e: any) {
      setResult({ ok: false, error: e?.message || "Erro desconhecido" });
      toast({ title: "Falha", description: e?.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  function statusBadge() {
    if (jaEnviado) return <Badge variant="outline" className="border-success/40 text-success gap-1"><CheckCircle2 className="h-3 w-3" /> Feegow #{feegowAgendamentoId}</Badge>;
    if (temErro) return <Badge variant="outline" className="border-destructive/40 text-destructive gap-1"><XCircle className="h-3 w-3" /> Erro sync</Badge>;
    return null;
  }

  return (
    <>
      {statusBadge()}
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-xs"
        disabled={jaEnviado && !temErro}
        onClick={() => setOpen(true)}
      >
        <Upload className="h-3.5 w-3.5" />
        {temErro ? "Reenviar Feegow" : jaEnviado ? "Já enviado" : "Enviar p/ Feegow"}
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); setResult(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Enviar agendamento para Feegow
            </DialogTitle>
            <DialogDescription>
              Ação manual e controlada. Será criado um agendamento na Feegow para esta consulta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Paciente</span><span className="font-medium">{pacienteNome || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Médico</span><span className="font-medium">{medicoNome || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Data/hora</span><span className="font-medium">{new Date(inicio).toLocaleString("pt-BR")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Consulta</span><span className="font-mono text-xs">{consultaId.slice(0, 8)}…</span></div>
            {feegowSyncStatus && (
              <div className="flex justify-between"><span className="text-muted-foreground">Status atual</span><span>{feegowSyncStatus}</span></div>
            )}
          </div>

          {result && (
            <div className={`rounded-md border p-3 text-xs ${result.ok ? "border-success/40 bg-success/5" : "border-destructive/40 bg-destructive/5"}`}>
              <p className="font-medium mb-1">{result.ok ? "✅ Sucesso" : "❌ Erro"}</p>
              {result.feegow_agendamento_id && <p>ID Feegow: <span className="font-mono">{result.feegow_agendamento_id}</span></p>}
              {result.error && <p className="text-destructive">{result.error}</p>}
              {result.detalhe && <p className="text-muted-foreground mt-1">{result.detalhe}</p>}
              {result.duracao_ms && <p className="text-muted-foreground">Duração: {result.duracao_ms}ms</p>}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setResult(null); }}>
              Fechar
            </Button>
            <Button onClick={enviar} disabled={sending || (result?.ok)}>
              {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {result?.ok ? "Enviado" : "Confirmar envio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
