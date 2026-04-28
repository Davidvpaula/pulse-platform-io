import { Video, Users, FileText, Wallet, ExternalLink, Link2, Play, Calendar, Stethoscope } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { agendaMedico } from "@/lib/mock";

export default function MedicoDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Bom dia, Dr. Rafael"
        description="Você tem 6 atendimentos hoje · Receita estimada: R$ 1.500"
        actions={
          <>
            <Button variant="outline"><ExternalLink className="mr-2 h-4 w-4" />Abrir prontuário (Feegow)</Button>
            <Button className="bg-gradient-primary hover:opacity-90"><Video className="mr-2 h-4 w-4" />Iniciar consulta</Button>
          </>
        }
      />

      {/* Alertas de consulta */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="card-elevated flex items-start gap-3 border-l-4 border-l-warning p-4">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-warning/10 text-warning">
            <Calendar className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Próxima consulta em 12 min</p>
            <p className="text-xs text-muted-foreground">Renata Lima · Empresarial · Construtora Horizonte</p>
          </div>
        </div>
        <div className="card-elevated flex items-start gap-3 border-l-4 border-l-info p-4">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-info/10 text-info">
            <Users className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">2 pacientes aguardando pagamento</p>
            <p className="text-xs text-muted-foreground">Confirmação automática após quitação</p>
          </div>
        </div>
        <div className="card-elevated flex items-start gap-3 border-l-4 border-l-destructive p-4">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive">
            <ExternalLink className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Feegow desconectado</p>
            <p className="text-xs text-muted-foreground">Prontuário em modo offline · admin notificado</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Consultas hoje" value="6" icon={Calendar} hint="2 telemedicina" />
        <StatCard label="Pacientes ativos" value="184" icon={Users} hint="+8 este mês" trend={{ value: "+4.5%", positive: true }} />
        <StatCard label="Documentos emitidos" value="42" icon={FileText} hint="Mês atual" />
        <StatCard label="Receita do mês" value="R$ 18.450" icon={Wallet} trend={{ value: "+12%", positive: true }} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Agenda do dia */}
        <div className="card-elevated p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Agenda de hoje</h3>
            <span className="text-xs text-muted-foreground">Terça, 28 de Abril</span>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 pr-4">Hora</th>
                  <th className="pb-2 pr-4">Paciente</th>
                  <th className="pb-2 pr-4">Modalidade</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {agendaMedico.map((a, i) => (
                  <tr key={i} className="hover:bg-muted/50">
                    <td className="py-3 pr-4 font-mono text-xs">{a.hora}</td>
                    <td className="py-3 pr-4 font-medium">{a.paciente}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{a.tipo}</td>
                    <td className="py-3 pr-4"><StatusBadge status={a.status} /></td>
                    <td className="py-3 text-right">
                      <Button size="sm" variant={a.status === "em_andamento" ? "default" : "outline"} className={a.status === "em_andamento" ? "bg-gradient-primary hover:opacity-90" : ""}>
                        <Play className="mr-1 h-3.5 w-3.5" /> {a.status === "em_andamento" ? "Continuar" : "Iniciar"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Meet + perfil */}
        <div className="space-y-6">
          <div className="card-elevated p-6">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" />
              <h3 className="font-display text-base font-semibold">Sala Google Meet</h3>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Link fixo de atendimento</p>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-xs">
              <Link2 className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate font-mono">meet.google.com/dr-rafael-lasmar</span>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1">Editar link</Button>
              <Button size="sm" className="flex-1 bg-gradient-primary hover:opacity-90">Copiar</Button>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Em breve: integração com Google Agenda para link dinâmico por consulta.
            </p>
          </div>

          <div className="card-elevated p-6">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              <h3 className="font-display text-base font-semibold">Modalidades ativas</h3>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Consulta particular", "Pronto atendimento", "Retorno", "Empresarial"].map(m => (
                <span key={m} className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">{m}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
