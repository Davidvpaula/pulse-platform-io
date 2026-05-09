import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, RefreshCw, X, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  medicoId: string;
}

const DISMISS_KEY = (id: string) => `lembrete_link_sala_dismiss_${id}`;
const DISMISS_DIAS = 7;
const RECOMENDA_TROCAR_DIAS = 30;

export function LembreteTrocarLinkSala({ medicoId }: Props) {
  const [linkSala, setLinkSala] = useState<string | null>(null);
  const [atualizadoEm, setAtualizadoEm] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!medicoId) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("medicos")
        .select("link_sala_padrao, link_sala_padrao_atualizado_em" as any)
        .eq("id", medicoId)
        .maybeSingle();
      if (!active) return;
      setLinkSala((data as any)?.link_sala_padrao ?? null);
      setAtualizadoEm((data as any)?.link_sala_padrao_atualizado_em ?? null);
      setLoaded(true);
    })();

    // Verifica dismiss local
    try {
      const raw = localStorage.getItem(DISMISS_KEY(medicoId));
      if (raw) {
        const ts = Number(raw);
        if (!Number.isNaN(ts) && Date.now() - ts < DISMISS_DIAS * 86400_000) {
          setDismissed(true);
        }
      }
    } catch (_) { /* noop */ }

    return () => { active = false; };
  }, [medicoId]);

  if (!loaded) return null;

  const semLink = !linkSala || linkSala.trim().length === 0;
  const diasDesdeTroca = atualizadoEm
    ? Math.floor((Date.now() - new Date(atualizadoEm).getTime()) / 86400_000)
    : null;
  const recomendaTrocar = !semLink && diasDesdeTroca !== null && diasDesdeTroca >= RECOMENDA_TROCAR_DIAS;

  // Caso 1: sem link → bloqueante (vermelho), não pode dispensar
  if (semLink) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-destructive">Configure o link da sua sala virtual</p>
          <p className="text-xs text-muted-foreground mt-1">
            Sem link de sala você não pode oferecer horários online. Configure agora — leva menos de 1 minuto.
          </p>
        </div>
        <Button asChild size="sm" className="bg-destructive text-destructive-foreground hover:opacity-90">
          <Link to="/app/medico/configuracoes"><Video className="mr-1.5 h-3.5 w-3.5" />Configurar</Link>
        </Button>
      </div>
    );
  }

  // Caso 2: link antigo (>30d) → sugestão (amarelo), pode dispensar 7d
  if (recomendaTrocar && !dismissed) {
    const handleDismiss = () => {
      try { localStorage.setItem(DISMISS_KEY(medicoId), String(Date.now())); } catch (_) { /* noop */ }
      setDismissed(true);
    };
    return (
      <div className={cn("rounded-xl border border-warning/30 bg-warning/5 p-4 flex items-start gap-3")}>
        <RefreshCw className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-warning-foreground">Recomendamos trocar o link da sua sala</p>
          <p className="text-xs text-muted-foreground mt-1">
            Seu link de sala não é alterado há {diasDesdeTroca} dias. Por segurança, recomendamos trocar a cada 30 dias.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/app/medico/configuracoes"><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Atualizar</Link>
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDismiss} aria-label="Lembrar depois">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
