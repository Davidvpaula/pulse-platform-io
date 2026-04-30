import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search, Building2, User, FileText, Eye, Loader2, Database, Calendar,
  MessageCircle, Phone, AlertCircle, Filter,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session";
import { pacientes as pacientesMock, agendamentos } from "@/lib/mock";
import { listPacientesDoMedico, type PacienteDoMedico } from "@/lib/clinico";
import { StatusBadge } from "@/components/StatusBadge";

type FiltroTipo = "todos" | "ativos" | "pendentes" | "empresariais";

const filtros: { key: FiltroTipo; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "ativos", label: "Ativos" },
  { key: "pendentes", label: "Pendentes" },
  { key: "empresariais", label: "Empresariais" },
];

function fmt(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}
function soDigitos(t: string | null | undefined) {
  return (t ?? "").replace(/\D/g, "");
}

export default function MedicoPacientes() {
  const { session } = useSession();
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<FiltroTipo>("todos");
  const [loading, setLoading] = useState(false);
  const [reais, setReais] = useState<PacienteDoMedico[] | null>(null);

  useEffect(() => {
    if (!session) { setReais(null); return; }
    setLoading(true);
    listPacientesDoMedico().then((r) => {
      setReais(r);
      setLoading(false);
    });
  }, [session]);

  const lista = useMemo(() => {
    if (!session || !reais) return [] as PacienteDoMedico[];
    const term = q.trim().toLowerCase();
    return reais.filter((p) => {
      if (filtro === "ativos" && !p.ativo) return false;
      if (filtro === "pendentes" && !p.tem_pendencia_pagamento) return false;
      if (filtro === "empresariais" && !p.empresa_id) return false;
      if (!term) return true;
      return (
        p.nome.toLowerCase().includes(term) ||
        (p.cpf ?? "").toLowerCase().includes(term) ||
        (p.empresa_nome ?? "").toLowerCase().includes(term) ||
        p.paciente_id.toLowerCase().includes(term)
      );
    });
  }, [session, reais, q, filtro]);

  // Modo demo (sem sessão) — mock antigo
  const listaDemo = useMemo(() => {
    if (session) return [];
    const term = q.trim().toLowerCase();
    return pacientesMock
      .map((p) => {
        const ags = agendamentos.filter((a) => a.pacienteId === p.id);
        const ultimo = ags.find((a) => a.status === "concluido");
        return { ...p, totalConsultas: ags.length, ultimo: ultimo?.data ?? p.ultimaConsulta ?? "—" };
      })
      .filter((p) => {
        if (!term) return true;
        return (
          p.nome.toLowerCase().includes(term) ||
          p.id.toLowerCase().includes(term) ||
          (p.empresa ?? "").toLowerCase().includes(term)
        );
      });
  }, [session, q]);

  const contadores = useMemo(() => {
    const base = reais ?? [];
    return {
      total: base.length,
      ativos: base.filter((p) => p.ativo).length,
      pendentes: base.filter((p) => p.tem_pendencia_pagamento).length,
      empresariais: base.filter((p) => p.empresa_id).length,
    };
  }, [reais]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pacientes"
        description="Pacientes que você atende ou já atendeu — busca, filtros e ações rápidas."
        actions={
          session ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
              <Database className="h-3 w-3" /> Dados em tempo real
            </span>
          ) : undefined
        }
      />

      {/* Contadores */}
      {session && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Total", value: contadores.total, tone: "text-foreground" },
            { label: "Ativos", value: contadores.ativos, tone: "text-success" },
            { label: "Pendências", value: contadores.pendentes, tone: "text-warning" },
            { label: "Empresariais", value: contadores.empresariais, tone: "text-accent" },
          ].map((c) => (
            <div key={c.label} className="card-elevated px-4 py-3">
              <p className="text-[11px] uppercase text-muted-foreground">{c.label}</p>
              <p className={cn("font-display text-xl font-bold", c.tone)}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Busca + filtros */}
      <div className="card-elevated space-y-3 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome, CPF, empresa ou ID interno…"
            className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>

        {session && (
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {filtros.map((f) => (
              <button
                key={f.key}
                onClick={() => setFiltro(f.key)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition",
                  filtro === f.key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
            <span className="ml-auto text-xs text-muted-foreground">{lista.length} paciente(s)</span>
          </div>
        )}
      </div>

      {/* Lista REAL */}
      {session && (
        <div className="card-elevated overflow-hidden">
          <div className="divide-y divide-border">
            {loading && (
              <div className="flex items-center justify-center p-10 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando pacientes…
              </div>
            )}
            {!loading && lista.length === 0 && (
              <div className="p-10 text-center text-sm text-muted-foreground">
                <User className="mx-auto mb-2 h-6 w-6 opacity-60" />
                {reais && reais.length === 0
                  ? "Você ainda não tem pacientes vinculados."
                  : "Nenhum paciente encontrado para a busca/filtro."}
              </div>
            )}

            {!loading && lista.map((p) => {
              const empresarial = !!p.empresa_id;
              const tel = soDigitos(p.telefone);
              const wppMsg = encodeURIComponent(`Olá ${p.nome.split(" ")[0]}, aqui é o seu médico.`);
              return (
                <div
                  key={p.paciente_id}
                  className="grid grid-cols-[auto_1fr_auto] items-start gap-3 p-4 hover:bg-muted/30"
                >
                  <div
                    className={cn(
                      "grid h-10 w-10 place-items-center rounded-lg",
                      empresarial ? "bg-accent/15 text-accent" : "bg-primary-soft text-primary",
                    )}
                  >
                    {empresarial ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{p.nome}</p>
                      {p.tem_pendencia_pagamento && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">
                          <AlertCircle className="h-3 w-3" /> Pendência
                        </span>
                      )}
                      {!p.ativo && (
                        <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                          Inativo
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {empresarial ? `Empresarial · ${p.empresa_nome ?? "Empresa"}` : "Particular"}
                      {" · "}
                      {p.total_consultas} consulta{p.total_consultas === 1 ? "" : "s"}
                      {" · "}
                      {p.proxima_consulta
                        ? <>próxima: <strong className="text-foreground">{fmt(p.proxima_consulta)}</strong></>
                        : <>última: {fmt(p.ultima_consulta)}</>}
                      {p.cpf ? <> · CPF {p.cpf}</> : null}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {tel && (
                      <>
                        <Button size="sm" variant="ghost" asChild title="Ligar">
                          <a href={`tel:+55${tel}`}>
                            <Phone className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button size="sm" variant="ghost" asChild title="WhatsApp">
                          <a
                            href={`https://wa.me/55${tel}?text=${wppMsg}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/app/medico/agenda?paciente=${p.paciente_id}`}>
                        <Calendar className="mr-1.5 h-3.5 w-3.5" /> Agenda
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/app/medico/pacientes/${p.paciente_id}`}>
                        <FileText className="mr-1.5 h-3.5 w-3.5" /> Prontuário
                      </Link>
                    </Button>
                    <Button size="sm" variant="ghost" asChild title="Detalhes">
                      <Link to={`/app/medico/pacientes/${p.paciente_id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista DEMO (sem sessão) */}
      {!session && (
        <div className="card-elevated overflow-hidden">
          <div className="divide-y divide-border">
            {listaDemo.length === 0 && (
              <p className="p-10 text-center text-sm text-muted-foreground">Nenhum paciente encontrado.</p>
            )}
            {listaDemo.map((p) => {
              const empresarial = p.vinculo === "empresarial";
              return (
                <div key={p.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-4 hover:bg-muted/30">
                  <div className={cn("grid h-10 w-10 place-items-center rounded-lg", empresarial ? "bg-accent/15 text-accent" : "bg-primary-soft text-primary")}>
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
      )}
    </div>
  );
}
