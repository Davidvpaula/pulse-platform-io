import { ExternalLink, AlertTriangle, CheckCircle2, Lock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { feegowConnection } from "@/lib/feegow";

export default function MedicoIntegracoes() {
  const conn = feegowConnection;
  const conectado = conn.status === "conectado";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrações"
        description="Visão limitada: você pode visualizar o status e abrir prontuários. Configurações globais ficam com o Admin."
      />

      <div className="card-elevated overflow-hidden">
        <div className="gradient-soft p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                conectado
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-warning/30 bg-warning/10 text-warning"
              }`}>
                {conectado ? "Conectado" : "Pendente"}
              </span>
              <h2 className="mt-2 font-display text-2xl font-bold">Feegow · Prontuário eletrônico</h2>
              <p className="text-sm text-muted-foreground">Ambiente: {conn.ambiente} · Modo: {conn.modo}</p>
            </div>
            <Button variant="outline" disabled={!conectado}>
              <ExternalLink className="mr-2 h-4 w-4" /> Abrir prontuário do paciente atual
            </Button>
          </div>
        </div>

        <div className="grid gap-4 border-t border-border p-6 md:grid-cols-3">
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Status</p>
            <p className="mt-1 inline-flex items-center gap-1.5 font-semibold">
              {conectado
                ? <><CheckCircle2 className="h-4 w-4 text-success" /> Conectado</>
                : <><AlertTriangle className="h-4 w-4 text-warning" /> Pendente</>}
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Última sincronização</p>
            <p className="mt-1 font-semibold">{conn.ultima_sincronizacao ?? "—"}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Token</p>
            <p className="mt-1 font-semibold">{conn.token_configurado ? "Configurado" : "Não configurado"}</p>
          </div>
        </div>

        <div className="flex items-start gap-2 border-t border-border bg-muted/40 p-4 text-xs text-muted-foreground">
          <Lock className="h-4 w-4 shrink-0" />
          <span>
            Configuração de credenciais, WhatsApp Business API e pagamentos são gerenciadas
            exclusivamente pelo perfil <strong>Admin</strong>.
          </span>
        </div>
      </div>
    </div>
  );
}
