import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Calendar, MessageSquareText, Wallet, FileText, Building2, User,
  Stethoscope, Phone, ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Timeline } from "@/components/Timeline";
import { pacientes, agendamentos, timelinePaciente } from "@/lib/mock";

export default function PacientePerfil() {
  const { id } = useParams();
  const paciente = pacientes.find(p => p.id === id) ?? pacientes[0];
  const consultas = agendamentos.filter(a => a.pacienteId === paciente.id);
  const eventos = timelinePaciente(paciente.id);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/app/secretaria/pacientes"><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Link>
      </Button>

      <PageHeader
        title={paciente.nome}
        description={`${paciente.id} · ${paciente.vinculo === "empresarial" ? `Empresa: ${paciente.empresa}` : "Paciente particular"}`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/app/comunicacao/conversas"><MessageSquareText className="mr-2 h-4 w-4" />Abrir conversa</Link>
            </Button>
            <Button className="bg-gradient-primary hover:opacity-90">
              <Calendar className="mr-2 h-4 w-4" />Novo agendamento
            </Button>
          </>
        }
      />

      {/* Status global */}
      <div className="card-elevated flex flex-wrap items-center gap-3 p-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status do paciente:</span>
        <StatusBadge status={paciente.status} />
        <span className="text-xs text-muted-foreground">·</span>
        <span className="text-xs text-muted-foreground">Cadastrado em {paciente.criadoEm}</span>
        {paciente.ultimaConsulta && (
          <>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">Última consulta {paciente.ultimaConsulta}</span>
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Coluna principal */}
        <div className="space-y-6">
          {/* Dados básicos */}
          <div className="card-elevated p-6">
            <h3 className="font-display text-lg font-semibold">Dados</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Info label="Vínculo" icon={paciente.vinculo === "empresarial" ? Building2 : User}>
                {paciente.vinculo === "empresarial" ? "Empresarial" : "Particular"}
              </Info>
              {paciente.empresa && <Info label="Empresa" icon={Building2}>{paciente.empresa}</Info>}
              {paciente.plano && <Info label="Plano" icon={Wallet}>{paciente.plano}</Info>}
              <Info label="ID externo (Feegow)" icon={ExternalLink}>
                {paciente.status === "feegow_sincronizado" ? "FGW-" + paciente.id.replace("P-", "") : "—"}
              </Info>
            </div>
          </div>

          {/* Consultas vinculadas */}
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Consultas</h3>
              <Button asChild size="sm" variant="ghost">
                <Link to="/app/secretaria/agendamentos">Ver agenda completa</Link>
              </Button>
            </div>
            <div className="mt-4 divide-y divide-border">
              {consultas.length === 0 && (
                <p className="py-4 text-sm text-muted-foreground">Sem consultas registradas.</p>
              )}
              {consultas.map(c => (
                <div key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.medico}</p>
                    <p className="text-xs text-muted-foreground">{c.esp} · {c.data} {c.hora} · {c.modalidade}</p>
                  </div>
                  <StatusBadge status={c.status} />
                  <Button asChild size="sm" variant="outline">
                    <Link to="/app/comunicacao/conversas"><MessageSquareText className="mr-1 h-3.5 w-3.5" />Conversa</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="card-elevated p-6">
            <h3 className="font-display text-lg font-semibold">Linha do tempo</h3>
            <p className="text-xs text-muted-foreground">Cronologia de eventos do paciente.</p>
            <div className="mt-5">
              <Timeline events={eventos} />
            </div>
          </div>
        </div>

        {/* Coluna lateral */}
        <aside className="space-y-4">
          <div className="card-elevated p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações rápidas</p>
            <div className="mt-3 grid gap-2">
              <Button size="sm" className="bg-gradient-primary hover:opacity-90 justify-start">
                <Calendar className="mr-2 h-4 w-4" />Criar agendamento
              </Button>
              <Button size="sm" variant="outline" className="justify-start" asChild>
                <Link to="/app/comunicacao/conversas"><MessageSquareText className="mr-2 h-4 w-4" />Abrir conversa</Link>
              </Button>
              <Button size="sm" variant="outline" className="justify-start">
                <Phone className="mr-2 h-4 w-4" />Enviar WhatsApp
              </Button>
              <Button size="sm" variant="outline" className="justify-start">
                <Wallet className="mr-2 h-4 w-4" />Ver financeiro
              </Button>
              <Button size="sm" variant="outline" className="justify-start">
                <ExternalLink className="mr-2 h-4 w-4" />Abrir no Feegow
              </Button>
            </div>
          </div>

          <div className="card-elevated p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Documentos</p>
            <ul className="mt-3 space-y-2 text-sm">
              {["Receita Losartana 50mg", "Atestado 2 dias", "Relatório clínico"].map(d => (
                <li key={d} className="flex items-center gap-2 rounded-lg border border-border p-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="truncate text-xs">{d}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Info({ label, icon: Icon, children }: { label: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {children}
      </p>
    </div>
  );
}
