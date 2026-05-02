import { useState, useEffect, useCallback } from "react";
import { buscarTermoAtivo, verificarAceite, type TermoTipo } from "@/lib/termos";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook que verifica se o usuário logado já aceitou a versão ativa de um termo.
 * Retorna estado e controle para exibir o dialog.
 */
export function useTermsCheck(tipo: TermoTipo) {
  const [needsAcceptance, setNeedsAcceptance] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [termoId, setTermoId] = useState<string | null>(null);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const termo = await buscarTermoAtivo(tipo);
      if (!termo) {
        setNeedsAcceptance(false);
        setLoading(false);
        return;
      }
      setTermoId(termo.id);
      const accepted = await verificarAceite(tipo, user.id);
      setNeedsAcceptance(!accepted);
    } catch {
      // se falhar, não bloqueia
      setNeedsAcceptance(false);
    } finally {
      setLoading(false);
    }
  }, [tipo]);

  useEffect(() => { check(); }, [check]);

  const promptAcceptance = useCallback(() => {
    if (needsAcceptance) setShowDialog(true);
  }, [needsAcceptance]);

  const onAccepted = useCallback(() => {
    setNeedsAcceptance(false);
    setShowDialog(false);
  }, []);

  return {
    needsAcceptance,
    showDialog,
    setShowDialog,
    promptAcceptance,
    onAccepted,
    loading,
    termoId,
    /** Re-check após aceite */
    recheck: check,
  };
}
