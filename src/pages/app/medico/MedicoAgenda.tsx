import { useEffect, useMemo, useState } from "react";
import { Play, Filter, Database } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { agendamentos } from "@/lib/mock";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session";
import {
  listConsultasDoMedico,
  formatDataBR,
  formatHora,
  toStatusBadge,
  type ConsultaDetalhada,
} from "@/lib/clinico";
import type { Status } from "@/lib/mock";

type Periodo = "hoje" | "semana" | "todos";

const periodOptions: { key: Periodo; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "semana", label: "Semana" },
  { key: "todos", label: "Todos" },
];

const statusOptions = ["todos", "confirmado", "em_andamento", "agendamento_criado", "concluido", "no_show"] as const;

type Item = {
  id: string;
  data: string;
  hora: string;
  paciente: string;
  esp: string;
  modalidade: string;
  canal: string;
  status: Status;
};

export default function MedicoAgenda() {
  const { session } = useSession();
  const [periodo, setPeriodo] = useState<Periodo>("hoje");
  const [status, setStatus] = useState<(typeof statusOptions)[number]>("todos");

  const [dbConsultas, setDbConsultas] = useState<ConsultaDetalhada[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session) { setDbConsultas(null); return; }
    setLoading(true);
    listConsultasDoMedico().then((data) => {
      setDbConsultas(data);
      setLoading(false);
    });
  }, [session]);

  // Origem dos dados: banco (sessão real) ou mock (demo)
  const items: Item[] = useMemo(() => {
    if (session && dbConsultas) {
      return dbConsultas.map((c) => ({
        id: c.id,
        data: formatDataBR(c.inicio),
        hora: formatHora(c.inicio),
        paciente: c.paciente_nome ?? "Paciente",
        esp: c.especialidade_nome ?? "—",
        modalidade: c.modalidade,
        canal: c.modalidade === "online" ? "telemedicina" : "presencial",
        status: toStatusBadge(c.status),
      }));
    }
    return agendamentos
      .filter((a) => a.medico === "Dr. Rafael Lasmar")
      .map((a) => ({
        id: String(a.id),
        data: a.data,
        hora: a.hora,
        paciente: a.paciente,
        esp: a.esp,
        modalidade: a.modalidade,
        canal: a.canal,
        status: a.status as Status,
      }));
  }, [session, dbConsultas]);

  const filtered = useMemo(() => {
    return items.filter((a) => {
      if (periodo === "hoje" && a.data !== "Hoje") return false;
      if (periodo === "semana" && !["Hoje", "28/Abr", "28 abr.", "29 abr.", "30 abr."].includes(a.data)) return false;
      if (status !== "todos" && a.status !== status) return false;
      return true;
    });
  }, [items, periodo, status]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda"
        description="Sua agenda com filtros rápidos e ações de início direto."
        actions={
          session ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
              <Database className="h-3 w-3" /> Dados em tempo real
            </span>
          ) : undefined
        }
      />

      {/* Filtros */}
      <div className="card-elevated flex flex-wrap items-center gap-3 p-4">
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          {periodOptions.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriodo(p.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition",
                periodo === p.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s === "todos" ? "Todos os status" : s.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>

        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} consulta(s)</span>
      </div>

      {/* Lista */}
      <div className="card-elevated overflow-hidden">
        <div className="divide-y divide-border">
          {loading && (
            <p className="p-10 text-center text-sm text-muted-foreground">Carregando…</p>
          )}
          {!loading && filtered.length === 0 && (
            <p className="p-10 text-center text-sm text-muted-foreground">
              {session && dbConsultas?.length === 0
                ? "Nenhuma consulta cadastrada ainda."
                : "Nada encontrado para o filtro atual."}
            </p>
          )}
          {!loading && filtered.map((a) => (
            <div key={a.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 p-4 hover:bg-muted/30">
              <div className="grid h-12 w-16 place-items-center rounded-lg bg-primary-soft text-primary">
                <div className="text-center">
                  <p className="font-mono text-sm font-bold">{a.hora}</p>
                  <p className="text-[10px] uppercase">{a.data}</p>
                </div>
              </div>

              <div className="min-w-0">
                <p className="truncate font-semibold">{a.paciente}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {a.esp} · {a.modalidade} · {a.canal}
                </p>
                <div className="mt-1.5"><StatusBadge status={a.status} /></div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline">Detalhes</Button>
                <Button size="sm" className="bg-gradient-primary hover:opacity-90">
                  <Play className="mr-1.5 h-3.5 w-3.5" /> Iniciar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
