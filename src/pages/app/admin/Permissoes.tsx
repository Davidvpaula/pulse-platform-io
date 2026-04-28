import { ShieldCheck, Check, X, Settings2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import { Switch } from "@/components/ui/switch";
import type { Capability } from "@/lib/abilities";

const perfis = ["Paciente", "Médico", "Secretaria", "Admin", "Empresa"];

const perms: { mod: string; vals: (boolean | "partial")[] }[] = [
  { mod: "Ver agenda própria",         vals: [true,  true,  true,  true,  false] },
  { mod: "Ver agenda de outros",       vals: [false, false, true,  true,  "partial"] },
  { mod: "Iniciar consulta",           vals: [true,  true,  false, true,  false] },
  { mod: "Acessar prontuário Feegow",  vals: [false, true,  false, true,  false] },
  { mod: "Cancelar/remarcar consulta", vals: [true,  true,  true,  true,  "partial"] },
  { mod: "Gerenciar usuários",         vals: [false, false, false, true,  false] },
  { mod: "Configurar integrações",     vals: [false, false, false, true,  false] },
  { mod: "Ver financeiro plataforma",  vals: [false, false, "partial", true, false] },
  { mod: "Ver relatórios empresa",     vals: [false, false, "partial", true, true] },
  { mod: "Acessar comunicação",        vals: [false, "partial", "partial", true, false] },
  { mod: "Gerenciar bot/templates",    vals: [false, false, false, true,  false] },
  { mod: "Aprovar reembolsos",         vals: [false, false, "partial", true, false] },
];

const capabilityGroups: { titulo: string; perfilAlvo: string; itens: { cap: Capability; label: string; desc: string }[] }[] = [
  {
    titulo: "Secretaria",
    perfilAlvo: "Liberações para o perfil Secretaria",
    itens: [
      { cap: "secretaria.supervisor", label: "Permissão de supervisão", desc: "Visão da equipe, relatórios operacionais, aprovações." },
      { cap: "secretaria.financeiro", label: "Acesso financeiro",       desc: "Cobranças e pagamentos pendentes." },
      { cap: "secretaria.reembolso",  label: "Efetuar reembolsos",      desc: "Aprovar estornos sem passar pelo Admin." },
      { cap: "comunicacao.acessar",   label: "Comunicação (Inbox)",     desc: "Atender conversas via WhatsApp." },
      { cap: "comunicacao.todas_conversas", label: "Ver todas as conversas", desc: "Não apenas as atribuídas a si." },
    ],
  },
  {
    titulo: "Médico",
    perfilAlvo: "Liberações para o perfil Médico",
    itens: [
      { cap: "medico.comunicacao", label: "Mensagens das próprias consultas", desc: "Acesso limitado, sem central geral." },
      { cap: "medico.feegow",      label: "Abrir prontuário Feegow",          desc: "Integração externa." },
      { cap: "medico.financeiro",  label: "Ver financeiro próprio",           desc: "Recebimentos e repasses." },
    ],
  },
  {
    titulo: "Empresa",
    perfilAlvo: "Liberações para o perfil Empresa",
    itens: [
      { cap: "empresa.relatorios", label: "Relatórios autorizados",     desc: "Sem acesso a prontuário clínico." },
      { cap: "empresa.financeiro", label: "Financeiro empresarial",     desc: "Faturas e contratos." },
    ],
  },
];

export default function Permissoes() {
  const { capabilities, toggleCapability } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permissões"
        description="Visão geral por perfil e ajustes finos por capacidade. O Admin libera ou bloqueia módulos sem precisar criar dashboards separados."
      />

      {/* Matriz por perfil principal */}
      <div className="card-elevated overflow-x-auto">
        <div className="flex items-center gap-2 border-b border-border p-4">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Matriz base por perfil</h2>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="sticky left-0 bg-muted/40 p-3 text-left font-semibold">Módulo</th>
              {perfis.map(p => (
                <th key={p} className="p-3 text-center text-xs font-semibold uppercase tracking-wider whitespace-nowrap">{p}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {perms.map((row, i) => (
              <tr key={i} className="border-t border-border hover:bg-muted/30">
                <td className="sticky left-0 bg-card p-3 font-medium">{row.mod}</td>
                {row.vals.map((v, j) => (
                  <td key={j} className="p-3 text-center">
                    {v === true ? (
                      <Check className="mx-auto h-4 w-4 text-success" />
                    ) : v === "partial" ? (
                      <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">via permissão</span>
                    ) : (
                      <X className="mx-auto h-4 w-4 text-muted-foreground/40" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-border p-3 text-xs text-muted-foreground">
          <strong>via permissão</strong> = ativável pelo Admin nas seções abaixo, sem alterar o dashboard do usuário.
        </p>
      </div>

      {/* Capabilities ajustáveis */}
      <div className="grid gap-6 lg:grid-cols-3">
        {capabilityGroups.map(g => (
          <div key={g.titulo} className="card-elevated p-6">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              <h3 className="font-display text-lg font-semibold">{g.titulo}</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{g.perfilAlvo}</p>
            <ul className="mt-4 space-y-3">
              {g.itens.map(item => {
                const active = capabilities.includes(item.cap);
                return (
                  <li key={item.cap} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch checked={active} onCheckedChange={() => toggleCapability(item.cap)} />
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="card-elevated p-4 text-xs text-muted-foreground">
        💡 No MVP, as permissões são salvas localmente para demonstração. Em produção,
        cada usuário terá suas próprias capabilities atribuídas pelo Admin via backend.
      </div>
    </div>
  );
}
