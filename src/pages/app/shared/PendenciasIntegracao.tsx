import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertTriangle, RefreshCw, Calendar, User } from "lucide-react";
import { pendenciasFeegow, integrationLogsMock, type IntegrationLog } from "@/lib/feegow";

export default function PendenciasIntegracao() {
  const pendencias = pendenciasFeegow();
  const [logs] = useState<IntegrationLog[]>(integrationLogsMock.slice(0, 5));

  const tentar = (titulo: string) =>
    toast("Tentativa de sincronização", {
      description: `${titulo}: enviada para fila do backend (mock).`,
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pendências de integração"
        description="Pacientes e agendamentos aguardando envio para a Feegow ou com erro de sincronização."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card-elevated p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Pendentes</p>
          <p className="mt-1 text-2xl font-bold">{pendencias.length}</p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Pacientes</p>
          <p className="mt-1 text-2xl font-bold">{pendencias.filter(p => p.tipo === "paciente").length}</p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Agendamentos</p>
          <p className="mt-1 text-2xl font-bold">{pendencias.filter(p => p.tipo === "agendamento").length}</p>
        </div>
      </div>

      <div className="card-elevated">
        <div className="border-b border-border p-5">
          <h3 className="font-display text-lg font-semibold">Itens aguardando sincronização</h3>
        </div>
        <div className="divide-y divide-border">
          {pendencias.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground text-center">Nada pendente. ✨</p>
          )}
          {pendencias.map(p => (
            <div key={`${p.tipo}-${p.id}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-4">
              <div className="rounded-full bg-warning/10 p-2 text-warning">
                {p.tipo === "paciente" ? <User className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  <span className="font-mono text-xs text-muted-foreground">{p.id}</span> · {p.titulo}
                </p>
                <p className="text-xs text-muted-foreground truncate">{p.motivo}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => tentar(p.titulo)}>
                <RefreshCw className="mr-2 h-3 w-3" /> {p.acao}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="card-elevated">
        <div className="border-b border-border p-5">
          <h3 className="font-display text-lg font-semibold">Logs recentes</h3>
        </div>
        <div className="divide-y divide-border">
          {logs.map(l => (
            <div key={l.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-4 text-sm">
              <AlertTriangle className={`h-4 w-4 ${l.status === "erro" ? "text-destructive" : l.status === "pendente" ? "text-warning" : "text-success"}`} />
              <div className="min-w-0">
                <p className="font-medium truncate">{l.acao} · {l.entidade} · <span className="font-mono text-xs">{l.entidade_id_interno}</span></p>
                <p className="text-xs text-muted-foreground truncate">{l.mensagem}</p>
              </div>
              <span className="text-xs text-muted-foreground">{l.data_hora}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
