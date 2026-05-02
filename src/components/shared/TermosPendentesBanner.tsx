import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useSession } from "@/lib/session";
import { useAuth } from "@/lib/auth";
import {
  buscarTermosPendentes, registrarAceite, TERMO_TIPO_LABELS,
  type TermoRow,
} from "@/lib/termos";

/**
 * Verifica periodicamente se há termos pendentes de aceite e exibe
 * um banner fixo + modal de leitura/aceite para cada um.
 */
export default function TermosPendentesBanner() {
  const { session } = useSession();
  const { profileKey } = useAuth();
  const [pendentes, setPendentes] = useState<TermoRow[]>([]);
  const [current, setCurrent] = useState<TermoRow | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const categoria = profileKey === "paciente"
    ? "paciente" as const
    : profileKey === "medico"
      ? "medico" as const
      : profileKey === "empresa"
        ? "empresa" as const
        : undefined;

  const check = useCallback(async () => {
    if (!session) return;
    try {
      const data = await buscarTermosPendentes(categoria);
      setPendentes(data);
      if (data.length > 0) setDismissed(false);
    } catch {
      // silently ignore
    }
  }, [session, categoria]);

  // Check on mount and every 5 minutes
  useEffect(() => {
    check();
    const interval = setInterval(check, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [check]);

  const handleAceitar = async () => {
    if (!current) return;
    setAccepting(true);
    try {
      await registrarAceite(current.id);
      toast.success(`"${current.titulo}" aceito com sucesso!`);
      setPendentes(prev => prev.filter(t => t.id !== current.id));
      setCurrent(null);
    } catch (e: any) {
      toast.error("Erro ao registrar aceite: " + e.message);
    } finally {
      setAccepting(false);
    }
  };

  if (!session || pendentes.length === 0 || dismissed) return null;

  return (
    <>
      {/* Banner */}
      <div className="relative flex items-center gap-3 bg-warning/15 border-b border-warning/30 px-4 py-2.5 text-sm">
        <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
        <p className="flex-1">
          <span className="font-medium">
            {pendentes.length === 1
              ? "Há 1 termo pendente de aceite."
              : `Há ${pendentes.length} termos pendentes de aceite.`}
          </span>
          {" "}Revise e aceite para continuar utilizando a plataforma.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="border-warning/40 text-warning hover:bg-warning/10"
          onClick={() => setCurrent(pendentes[0])}
        >
          <FileText className="h-3.5 w-3.5 mr-1.5" /> Revisar agora
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Dispensar por agora"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Modal de aceite */}
      <Dialog open={!!current} onOpenChange={(o) => { if (!o) setCurrent(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {current?.titulo}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {current && TERMO_TIPO_LABELS[current.tipo]} • Versão {current?.versao}
            </p>
          </DialogHeader>

          <ScrollArea className="flex-1 max-h-[55vh] border rounded-md p-4">
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: current?.conteudo ?? "" }}
            />
          </ScrollArea>

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
            <p className="text-xs text-muted-foreground flex-1">
              Ao aceitar, você concorda com os termos acima. Seu aceite será registrado com data, IP e navegador.
            </p>
            <Button variant="outline" onClick={() => setCurrent(null)} disabled={accepting}>
              Ler depois
            </Button>
            <Button onClick={handleAceitar} disabled={accepting}>
              {accepting
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando…</>
                : <><CheckCircle2 className="mr-2 h-4 w-4" /> Li e aceito</>}
            </Button>
          </DialogFooter>

          {/* Next terms indicator */}
          {pendentes.length > 1 && current && (
            <p className="text-xs text-muted-foreground text-center mt-1">
              + {pendentes.filter(t => t.id !== current.id).length} termo(s) pendente(s) após este
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
