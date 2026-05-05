import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList, Search, Filter, Loader2, AlertCircle, Calendar as CalendarIcon,
  Phone, MessageSquare, Eye, History, UserCog,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import {
  listConsultasParaSecretaria, formatHora, toStatusBadge,
  type ConsultaDetalhada,
} from "@/lib/clinico";
import TrocarMedicoDialog from "@/components/secretaria/TrocarMedicoDialog";
import { ConsultaHistoricoDialog } from "@/components/shared/ConsultaHistoricoDialog";
import { useSession } from "@/lib/session";
import { whatsappUrl } from "@/components/FloatingWhatsApp";
import { cn } from "@/lib/utils";

const filtros = [
  { key: "todos", label: "Todos" },
  { key: "agendada", label: "Agendadas" },
  { key: "confirmada", label: "Confirmadas" },
  { key: "aguardando_pagamento", label: "Aguardando pgto." },
  { key: "em_andamento", label: "Em andamento" },
  { key: "concluida", label: "Concluídas" },
  { key: "cancelada", label: "Canceladas" },
  { key: "no_show", label: "No-show" },
] as const;

const janelas = [
  { key: "7d", label: "Próximos 7 dias", future: true, days: 7 },
  { key: "30d", label: "Próximos 30 dias", future: true, days: 30 },
  { key: "passado7", label: "Últimos 7 dias", future: false, days: 7 },
  { key: "passado30", label: "Últimos 30 dias", future: false, days: 30 },
] as const;

function formatData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}

export default function SecretariaAgendamentos() {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ConsultaDetalhada[]>([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<typeof filtros[number]["key"]>("todos");
  const [janela, setJanela] = useState<typeof janelas[number]["key"]>("7d");

  const [trocando, setTrocando] = useState<ConsultaDetalhada | null>(null);
  const [historicoCtx, setHistoricoCtx] = useState<{ id: string; resumo?: string } | null>(null);

  async function carregar() {
    if (!session) { setLoading(false); return; }
    setLoading(true);
    const cfg = janelas.find(j => j.key === janela)!;
    const now = new Date();
    let desde: Date, ate: Date;
    if (cfg.future) {
      desde = new Date(now); desde.setHours(0, 0, 0, 0);
      ate = new Date(desde); ate.setDate(ate.getDate() + cfg.days); ate.setHours(23, 59, 59, 999);
    } else {
      ate = new Date(now); ate.setHours(23, 59, 59, 999);
      desde = new Date(ate); desde.setDate(desde.getDate() - cfg.days); desde.setHours(0, 0, 0, 0);
    }
    const data = await listConsultasParaSecretaria({ desde, ate });
    setRows(data);
    setLoading(false);
  }

  useEffect(() => { void carregar(); /* eslint-disable-next-line */ }, [session, janela]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return rows.filter(c => {
      if (filtro !== "todos" && c.status !== filtro) return false;
      if (!q) return true;
      return (
        (c.paciente_nome ?? "").toLowerCase().includes(q) ||
        (c.medico_nome ?? "").toLowerCase().includes(q) ||
        (c.especialidade_nome ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, busca, filtro]);

  const grouped = useMemo(() => {
    const map = new Map<string, ConsultaDetalhada[]>();
    filtradas.forEach(c => {
      const key = new Date(c.inicio).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });
    return Array.from(map.entries());
  }, [filtradas]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agendamentos"
        description="Lista cronológica de todas as consultas — busca, filtros e ações operacionais."
        actions={
          <Button asChild className="bg-gradient-primary hover:opacity-90">
            <Link to="/app/colaborador/agenda">
              <CalendarIcon className="mr-2 h-4 w-4" /> Ver no calendário
            </Link>
          </Button>
        }
      />

      <div className="card-elevated space-y-3 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por paciente, médico ou especialidade…"
              className="pl-9"
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            {filtradas.length} de {rows.length}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {janelas.map(j => (
            <button
              key={j.key}
              onClick={() => setJanela(j.key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                janela === j.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              {j.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {filtros.map(f => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                filtro === f.key
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card-elevated overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando agendamentos…
          </div>
        ) : filtradas.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 opacity-40" />
            <p className="text-sm">Nenhum agendamento encontrado.</p>
            <Button variant="link" size="sm" asChild>
              <Link to="/app/colaborador/agenda">Abrir calendário</Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {grouped.map(([dia, consultas]) => (
              <div key={dia}>
                <div className="bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {formatData(consultas[0].inicio)} · {consultas.length} consulta{consultas.length > 1 ? "s" : ""}
                </div>
                <ul>
                  {consultas.map(c => (
                    <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-muted/30">
                      <div className="w-16 text-sm font-mono font-semibold">{formatHora(c.inicio)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{c.paciente_nome ?? "—"}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {c.modalidade === "online" ? "Online" : "Presencial"}
                          </Badge>
                          {c.servico_id == null && c.especialidade_nome && (
                            <Badge variant="secondary" className="text-[10px]">
                              {c.especialidade_nome}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Dr(a). {c.medico_nome ?? "—"}
                        </div>
                      </div>
                      <StatusBadge status={toStatusBadge(c.status)} />
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost" size="icon" title="Trocar médico"
                          onClick={() => setTrocando(c)}
                        >
                          <UserCog className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" title="Histórico da consulta"
                          onClick={() => setHistoricoCtx({ id: c.id })}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" asChild title="Ver paciente">
                          <Link to={`/app/secretaria/pacientes/${c.paciente_id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <TrocarMedicoDialog
        open={!!trocando}
        consultaId={trocando?.id ?? null}
        consultaInicio={trocando?.inicio}
        medicoAtualNome={trocando?.medico_nome ?? null}
        onOpenChange={(o) => !o && setTrocando(null)}
        onTrocado={() => { setTrocando(null); void carregar(); }}
      />
      <ConsultaHistoricoDialog
        open={!!historicoCtx}
        consultaId={historicoCtx?.id ?? null}
        onOpenChange={(o) => !o && setHistoricoCtx(null)}
      />
    </div>
  );
}
