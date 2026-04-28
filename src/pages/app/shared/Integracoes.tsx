import { ExternalLink, RefreshCw, FileText, UserPlus, Calendar, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { integracoes } from "@/lib/mock";

export default function Integracoes() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrações"
        description="Status e configuração das conexões externas."
      />

      {/* Feegow em destaque */}
      <div className="card-elevated overflow-hidden">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center gradient-soft">
          <div>
            <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">Aguardando configuração</span>
            <h2 className="mt-2 font-display text-2xl font-bold">Feegow · Prontuário eletrônico</h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              O prontuário eletrônico completo será gerenciado externamente via API Feegow.
              A arquitetura interna está reservada para um futuro módulo próprio.
            </p>
          </div>
          <Button variant="outline">Configurar credenciais</Button>
        </div>

        <div className="grid gap-4 border-t border-border p-6 md:grid-cols-2">
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">ID do paciente na Feegow</p>
            <p className="mt-1 font-mono text-sm">— não vinculado —</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">ID do agendamento na Feegow</p>
            <p className="mt-1 font-mono text-sm">— não vinculado —</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border p-6">
          <Button variant="outline" disabled><UserPlus className="mr-2 h-4 w-4" />Enviar paciente para Feegow</Button>
          <Button variant="outline" disabled><Calendar className="mr-2 h-4 w-4" />Enviar agendamento</Button>
          <Button variant="outline" disabled><ExternalLink className="mr-2 h-4 w-4" />Abrir prontuário</Button>
          <Button variant="outline" disabled><RefreshCw className="mr-2 h-4 w-4" />Sincronizar documentos</Button>
        </div>

        <div className="flex items-start gap-2 border-t border-border bg-warning/5 p-4 text-xs text-muted-foreground">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <span>Ações desabilitadas até a integração ser ativada nas configurações da plataforma.</span>
        </div>
      </div>

      {/* Outras integrações */}
      <div className="grid gap-4 md:grid-cols-2">
        {integracoes.filter(i => i.nome !== "Feegow").map(i => (
          <div key={i.nome} className="card-elevated p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{i.nome}</p>
                <p className="text-xs text-muted-foreground">{i.desc}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                i.cor === "warning" ? "bg-warning/10 text-warning" :
                i.cor === "info" ? "bg-info/10 text-info" : "bg-muted text-muted-foreground"
              }`}>{i.status}</span>
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1">Configurar</Button>
              <Button size="sm" variant="ghost"><FileText className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
