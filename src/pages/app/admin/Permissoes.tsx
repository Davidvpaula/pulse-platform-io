import { ShieldCheck, Check, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const perfis = ["Paciente", "Pac. Empresa", "Médico", "Sec. comum", "Sec. supervisor", "Admin", "Superadmin", "Empresa/RH"];
const perms: { mod: string; vals: (boolean|"partial")[] }[] = [
  { mod: "Ver agenda própria",         vals: [true, true, true, true, true, true, true, false] },
  { mod: "Ver agenda de outros",       vals: [false, false, false, true, true, true, true, "partial"] },
  { mod: "Iniciar consulta",           vals: [true, true, true, false, false, false, false, false] },
  { mod: "Acessar prontuário Feegow",  vals: [false, false, true, false, false, true, true, false] },
  { mod: "Cancelar/remarcar consulta", vals: [true, true, true, true, true, true, true, "partial"] },
  { mod: "Gerenciar usuários",         vals: [false, false, false, false, false, true, true, false] },
  { mod: "Configurar integrações",     vals: [false, false, false, false, false, false, true, false] },
  { mod: "Ver financeiro plataforma",  vals: [false, false, false, false, true, true, true, false] },
  { mod: "Ver relatórios empresa",     vals: [false, false, false, false, false, true, true, true] },
  { mod: "WhatsApp central",           vals: [false, false, false, true, true, true, true, false] },
];

export default function Permissoes() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Matriz de permissões"
        description="Controle visual de acessos por perfil."
      />
      <div className="card-elevated overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="sticky left-0 bg-muted/50 p-3 text-left font-semibold">
                <ShieldCheck className="inline h-4 w-4 text-primary mr-1" /> Módulo
              </th>
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
                      <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">parcial</span>
                    ) : (
                      <X className="mx-auto h-4 w-4 text-muted-foreground/40" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
