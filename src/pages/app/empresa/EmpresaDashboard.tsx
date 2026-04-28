import { Users, Calendar, FileBarChart, Wallet, Building2, Lock, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { empresaFuncionarios, agendamentos } from "@/lib/mock";

export default function EmpresaDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Construtora Horizonte"
        description="Gestão de saúde corporativa · Plano Corporativo Premium"
        actions={<Button className="bg-gradient-primary hover:opacity-90"><Users className="mr-2 h-4 w-4" />Adicionar funcionário</Button>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Funcionários" value="86" icon={Users} hint="3 setores" />
        <StatCard label="Consultas no mês" value="142" icon={Calendar} hint="média 1.6 / pessoa" />
        <StatCard label="Relatórios liberados" value="38" icon={FileBarChart} hint="visíveis ao RH" />
        <StatCard label="Investimento mensal" value="R$ 9.480" icon={Wallet} hint="Ciclo de Abril" />
      </div>

      <div className="card-elevated p-4 flex items-start gap-3 border-warning/30 bg-warning/5">
        <Lock className="mt-0.5 h-4 w-4 text-warning" />
        <p className="text-sm text-warning-foreground">
          <strong>Privacidade:</strong> a empresa não tem acesso ao prontuário completo dos funcionários — apenas a relatórios e documentos liberados com permissão.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card-elevated p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Funcionários</h3>
            <Button variant="ghost" size="sm">Ver todos</Button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 pr-4">Nome</th>
                  <th className="pb-2 pr-4">Setor</th>
                  <th className="pb-2 pr-4">Consultas</th>
                  <th className="pb-2 pr-4">Última</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {empresaFuncionarios.map((f, i) => (
                  <tr key={i} className="hover:bg-muted/50">
                    <td className="py-3 pr-4 font-medium">{f.nome}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{f.setor}</td>
                    <td className="py-3 pr-4">{f.consultas}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{f.ultima}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h3 className="font-display text-lg font-semibold">Por unidade</h3>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            {[
              { n: "Obra Centro", v: 32, p: 60 },
              { n: "Obra Sul", v: 28, p: 45 },
              { n: "Administrativo", v: 26, p: 40 },
            ].map(u => (
              <li key={u.n}>
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{u.n}</span>
                  <span className="text-muted-foreground">{u.v} consultas</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-primary" style={{ width: `${u.p}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
