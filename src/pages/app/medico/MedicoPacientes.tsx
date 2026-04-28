import { useMemo, useState } from "react";
import { Search, Building2, User, FileText, Eye } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { pacientes, agendamentos } from "@/lib/mock";

export default function MedicoPacientes() {
  const [q, setQ] = useState("");

  const lista = useMemo(() => {
    const term = q.trim().toLowerCase();
    return pacientes
      .map(p => {
        const ags = agendamentos.filter(a => a.pacienteId === p.id);
        const ultimo = ags.find(a => a.status === "concluido");
        return { ...p, totalConsultas: ags.length, ultimo: ultimo?.data ?? p.ultimaConsulta ?? "—" };
      })
      .filter(p => {
        if (!term) return true;
        return (
          p.nome.toLowerCase().includes(term) ||
          p.id.toLowerCase().includes(term) ||
          (p.empresa ?? "").toLowerCase().includes(term)
        );
      });
  }, [q]);

  return (
    <div className="space-y-6">
      <PageHeader title="Pacientes" description="Busque por nome, CPF ou ID interno." />

      <div className="card-elevated p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Nome, CPF ou ID do paciente…"
            className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="card-elevated overflow-hidden">
        <div className="divide-y divide-border">
          {lista.length === 0 && (
            <p className="p-10 text-center text-sm text-muted-foreground">Nenhum paciente encontrado.</p>
          )}
          {lista.map(p => {
            const empresarial = p.vinculo === "empresarial";
            return (
              <div key={p.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-4 hover:bg-muted/30">
                <div className={`grid h-10 w-10 place-items-center rounded-lg ${empresarial ? "bg-accent/15 text-accent" : "bg-primary-soft text-primary"}`}>
                  {empresarial ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {p.nome}
                    <span className="ml-2 font-mono text-xs text-muted-foreground">{p.id}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {empresarial ? `Empresarial · ${p.empresa}` : "Particular"} · {p.totalConsultas} consulta(s) · último: {p.ultimo}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={p.status} />
                  <Button size="sm" variant="outline"><FileText className="mr-1.5 h-3.5 w-3.5" /> Histórico</Button>
                  <Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
