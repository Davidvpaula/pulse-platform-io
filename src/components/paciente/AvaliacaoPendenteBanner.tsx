import { useEffect, useState } from "react";
import { Star, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import {
  consultasPendentesAvaliacao,
  dispensarAvaliacaoConsulta,
  type ConsultaPendenteAvaliacao,
} from "@/lib/gamificacao";
import AvaliarMedicoDialog from "./AvaliarMedicoDialog";
import { toast } from "@/hooks/use-toast";

/**
 * Banner que aparece automaticamente no dashboard do paciente
 * quando existem consultas concluídas sem avaliação.
 */
export default function AvaliacaoPendenteBanner() {
  const { session } = useSession();
  const [pendentes, setPendentes] = useState<ConsultaPendenteAvaliacao[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [avaliarItem, setAvaliarItem] = useState<ConsultaPendenteAvaliacao | null>(null);

  const carregar = async () => {
    if (!session) return;
    try {
      const data = await consultasPendentesAvaliacao();
      setPendentes(data);
    } catch {
      // silently ignore
    }
  };

  useEffect(() => { void carregar(); }, [session]);

  const visiveis = pendentes.filter((p) => !dismissed.has(p.consulta_id));
  if (!visiveis.length) return null;

  return (
    <>
      <div className="space-y-2">
        {visiveis.map((p) => (
          <div
            key={p.consulta_id}
            className="card-elevated flex flex-wrap items-center gap-3 border border-warning/30 bg-warning/5 p-4"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning/15 text-warning">
              <Star className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm">
                Como foi sua consulta com {p.medico_nome ?? "seu médico"}?
              </p>
              <p className="text-xs text-muted-foreground">
                {p.especialidade_nome ?? "Consulta"} ·{" "}
                {new Date(p.concluida_em).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <Button
              size="sm"
              className="bg-gradient-primary hover:opacity-90"
              onClick={() => setAvaliarItem(p)}
            >
              <Star className="mr-1.5 h-3.5 w-3.5" /> Avaliar agora
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground"
              title="Não quero avaliar esta consulta"
              onClick={async () => {
                setDismissed((s) => new Set(s).add(p.consulta_id));
                try {
                  await dispensarAvaliacaoConsulta(p.consulta_id);
                } catch (e: any) {
                  setDismissed((s) => {
                    const n = new Set(s);
                    n.delete(p.consulta_id);
                    return n;
                  });
                  toast({
                    title: "Não foi possível dispensar",
                    description: e?.message ?? "Tente novamente.",
                    variant: "destructive",
                  });
                }
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {avaliarItem && (
        <AvaliarMedicoDialog
          open={!!avaliarItem}
          onOpenChange={(v) => { if (!v) setAvaliarItem(null); }}
          consulta={{
            id: avaliarItem.consulta_id,
            paciente_id: avaliarItem.paciente_id,
            medico_id: avaliarItem.medico_id,
            medico_nome: avaliarItem.medico_nome,
          }}
          onAvaliado={() => {
            setAvaliarItem(null);
            void carregar();
          }}
        />
      )}
    </>
  );
}
