import { useState } from "react";
import { User, Stethoscope, Calendar, Video, Bell, Save } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const semana = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
  <div>
    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
    <div className="mt-1.5">{children}</div>
    {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className={cn("w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary", p.className)} />
);

const Section = ({ icon: Icon, title, children }: { icon: typeof User; title: string; children: React.ReactNode }) => (
  <section className="card-elevated p-6">
    <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="font-display text-lg font-semibold">{title}</h3>
    </div>
    <div className="grid gap-4 md:grid-cols-2">{children}</div>
  </section>
);

export default function MedicoConfiguracoes() {
  const [diasAtivos, setDiasAtivos] = useState(["Seg", "Ter", "Qua", "Qui", "Sex"]);
  const [notif, setNotif] = useState({ lembretes: true, alertas: true, resumoDiario: false });

  const toggleDia = (d: string) =>
    setDiasAtivos(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Perfil, atendimento, agenda, Google Meet e notificações."
        actions={
          <Button className="bg-gradient-primary hover:opacity-90" onClick={() => toast("Configurações salvas")}>
            <Save className="mr-2 h-4 w-4" /> Salvar alterações
          </Button>
        }
      />

      <Section icon={User} title="Perfil">
        <Field label="Nome completo"><Input defaultValue="Dr. Rafael Lasmar" /></Field>
        <Field label="CRM"><Input defaultValue="CRM/MG 12345" /></Field>
        <Field label="Especialidade principal"><Input defaultValue="Cardiologia" /></Field>
        <Field label="Foto de perfil"><Input type="file" accept="image/*" /></Field>
        <div className="md:col-span-2">
          <Field label="Bio">
            <textarea
              rows={3}
              defaultValue="Cardiologista com 12 anos de atuação clínica. Foco em prevenção e telemedicina."
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Field>
        </div>
      </Section>

      <Section icon={Stethoscope} title="Atendimento">
        <Field label="Tipos de consulta">
          <div className="flex flex-wrap gap-2">
            {["Particular", "Pronto atendimento", "Retorno", "Empresarial"].map(t => (
              <span key={t} className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">{t}</span>
            ))}
          </div>
        </Field>
        <Field label="Duração padrão (min)"><Input type="number" defaultValue={30} /></Field>
      </Section>

      <Section icon={Calendar} title="Agenda">
        <div className="md:col-span-2">
          <Field label="Dias da semana">
            <div className="flex flex-wrap gap-2">
              {semana.map(d => {
                const ativo = diasAtivos.includes(d);
                return (
                  <button key={d} onClick={() => toggleDia(d)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium border transition",
                      ativo ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/40",
                    )}
                  >{d}</button>
                );
              })}
            </div>
          </Field>
        </div>
        <Field label="Início"><Input type="time" defaultValue="08:00" /></Field>
        <Field label="Fim"><Input type="time" defaultValue="18:00" /></Field>
      </Section>

      <Section icon={Video} title="Google Meet">
        <div className="md:col-span-2">
          <Field label="Link fixo de atendimento" hint="Em breve: integração com Google Agenda para link dinâmico por consulta.">
            <Input defaultValue="https://meet.google.com/dr-rafael-lasmar" />
          </Field>
        </div>
        <Field label="Tipo de link">
          <select className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option>Fixo</option>
            <option disabled>Dinâmico (Google Agenda) — em breve</option>
          </select>
        </Field>
        <Field label="Google Calendar conectado">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-xs text-warning">Não conectado</span>
        </Field>
      </Section>

      <Section icon={Bell} title="Notificações">
        {Object.entries({
          lembretes: "Lembretes de consulta (10 min antes)",
          alertas: "Alertas operacionais (Feegow, pagamentos)",
          resumoDiario: "Resumo diário por e-mail",
        }).map(([key, label]) => (
          <label key={key} className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer">
            <span className="text-sm">{label}</span>
            <input
              type="checkbox"
              checked={(notif as any)[key]}
              onChange={e => setNotif({ ...notif, [key]: e.target.checked })}
              className="h-4 w-4 accent-primary"
            />
          </label>
        ))}
      </Section>
    </div>
  );
}
