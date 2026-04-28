import { Calendar, Users, MessageCircle, Wallet, ListTodo, Plus, Send, Phone, RotateCcw, X, Activity, TrendingUp, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { filaSecretaria } from "@/lib/mock";
import { useAuth } from "@/lib/auth";

export default function SecretariaDashboard() {
  const { hasCapability } = useAuth();
  const isSupervisor = hasCapability("secretaria.supervisor");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Central da Secretaria"
        description="Gerencie a fila de atendimento, comunicação e financeiro do dia."
        actions={
          <>
            <Button variant="outline"><MessageCircle className="mr-2 h-4 w-4" />Comunicação</Button>
            <Button className="bg-gradient-primary hover:opacity-90"><Plus className="mr-2 h-4 w-4" />Novo agendamento</Button>
          </>
        }
      />

      {isSupervisor && (
        <div className="card-elevated flex items-center gap-3 border-l-4 border-primary p-4">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Permissão de supervisão ativa</p>
            <p className="text-xs text-muted-foreground">Você tem acesso a indicadores da equipe, relatórios operacionais e aprovação de exceções.</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Na fila hoje" value="14" icon={Calendar} hint="3 em andamento" />
        <StatCard label="Pacientes ativos" value="932" icon={Users} hint="+12 esta semana" />
        <StatCard label="Pendências WhatsApp" value="7" icon={MessageCircle} hint="2 sem resposta há +1h" />
        <StatCard label="Pagamentos pendentes" value="R$ 1.840" icon={Wallet} hint="4 cobranças abertas" />
      </div>

      {isSupervisor && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Atendimentos hoje" value="142" icon={Activity} trend={{ value: "+12%", positive: true }} />
          <StatCard label="Tempo médio" value="3min42" icon={Phone} trend={{ value: "-18s", positive: true }} />
          <StatCard label="SLA < 5min" value="88%" icon={TrendingUp} hint="meta 90%" />
          <StatCard label="Equipe online" value="6 / 8" icon={Users} hint="2 ausentes" />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Fila de atendimento */}
        <div className="card-elevated p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Fila de atendimento</h3>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm">Filtros</Button>
              <Button variant="outline" size="sm">Exportar</Button>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 pr-4">Hora</th>
                  <th className="pb-2 pr-4">Paciente</th>
                  <th className="pb-2 pr-4">Médico</th>
                  <th className="pb-2 pr-4">Canal</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filaSecretaria.map((f, i) => (
                  <tr key={i} className="hover:bg-muted/50">
                    <td className="py-3 pr-4 font-mono text-xs">{f.hora}</td>
                    <td className="py-3 pr-4 font-medium">{f.paciente}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{f.medico}</td>
                    <td className="py-3 pr-4"><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{f.canal}</span></td>
                    <td className="py-3 pr-4"><StatusBadge status={f.status} /></td>
                    <td className="py-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button size="icon" variant="ghost" title="Enviar link"><Send className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" title="WhatsApp"><Phone className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" title="Remarcar"><RotateCcw className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" title="Cancelar"><X className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tarefas */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-primary" /> Tarefas
            </h3>
            <Button size="sm" variant="ghost">+ Nova</Button>
          </div>
          <ul className="mt-4 space-y-3">
            {[
              { t: "Confirmar 5 consultas amanhã", done: false },
              { t: "Cobrar pagamento João Almeida", done: false },
              { t: "Enviar relatório RH Construtora", done: true },
              { t: "Atualizar agenda Dr. Marcos", done: false },
              { t: "Responder e-mail suporte", done: true },
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <input type="checkbox" defaultChecked={t.done} className="mt-1 accent-primary" />
                <span className={t.done ? "line-through text-muted-foreground" : ""}>{t.t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
