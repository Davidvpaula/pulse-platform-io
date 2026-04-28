import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Send, Filter, ShieldAlert, Users2, Plus, Clock, Stethoscope, Building2, ShieldCheck,
  ExternalLink, MessageSquareText,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { inboxInterno, type InternalThread } from "@/lib/mock";
import { cn } from "@/lib/utils";

const origemIcon = {
  "Secretaria ↔ Médico": Stethoscope,
  "Secretaria ↔ Admin": ShieldCheck,
  "Empresa ↔ Secretaria": Building2,
  "Médico ↔ Admin": ShieldAlert,
} as const;

const prioridadeTone = {
  alta: "bg-destructive/10 text-destructive",
  normal: "bg-muted text-muted-foreground",
  baixa: "bg-muted/60 text-muted-foreground",
} as const;

const statusTone = {
  aberta: "bg-warning/10 text-warning",
  respondida: "bg-info/10 text-info",
  resolvida: "bg-success/10 text-success",
} as const;

export default function ComunicacaoInterna() {
  const [filtro, setFiltro] = useState<InternalThread["origem"] | "todas">("todas");
  const [selId, setSelId] = useState<string>(inboxInterno[0].id);

  const lista = filtro === "todas" ? inboxInterno : inboxInterno.filter(t => t.origem === filtro);
  const sel = inboxInterno.find(t => t.id === selId) ?? lista[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comunicação interna da equipe"
        description="Mensagens entre Secretaria, Médicos, Admin e Empresas — separado das conversas com pacientes (WhatsApp)."
        actions={
          <>
            <Button variant="outline"><Filter className="mr-2 h-4 w-4" />Filtros</Button>
            <Button className="bg-gradient-primary hover:opacity-90"><Plus className="mr-2 h-4 w-4" />Nova conversa</Button>
          </>
        }
      />

      {/* Filtro de canais internos */}
      <div className="card-elevated flex flex-wrap items-center gap-2 p-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Canais:</span>
        {(["todas", "Secretaria ↔ Médico", "Secretaria ↔ Admin", "Empresa ↔ Secretaria", "Médico ↔ Admin"] as const).map(c => (
          <button
            key={c}
            onClick={() => setFiltro(c)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filtro === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {c === "todas" ? "Todos" : c}
          </button>
        ))}
      </div>

      <div className="grid gap-0 lg:grid-cols-[340px_1fr_320px] card-elevated overflow-hidden">
        {/* Lista de threads */}
        <div className="border-r border-border">
          <div className="border-b border-border bg-muted/30 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {lista.length} conversa{lista.length === 1 ? "" : "s"}
            </p>
          </div>
          <ul className="max-h-[560px] overflow-y-auto divide-y divide-border">
            {lista.map(t => {
              const Icon = origemIcon[t.origem];
              const active = sel?.id === t.id;
              return (
                <li key={t.id}>
                  <button
                    onClick={() => setSelId(t.id)}
                    className={cn(
                      "w-full text-left p-4 transition-colors hover:bg-muted/50",
                      active && "bg-primary-soft/40",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <p className="flex-1 truncate text-sm font-semibold">{t.assunto}</p>
                      {t.nao_lidas > 0 && (
                        <span className="rounded-full bg-destructive px-1.5 py-0 text-[10px] font-bold text-destructive-foreground">
                          {t.nao_lidas}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{t.ultima}</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", statusTone[t.status])}>
                        {t.status}
                      </span>
                      <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", prioridadeTone[t.prioridade])}>
                        {t.prioridade}
                      </span>
                      <span className="ml-auto text-[10px] text-muted-foreground">{t.data}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Conversa */}
        <div className="flex flex-col">
          {sel && (
            <>
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{sel.assunto}</p>
                  <p className="text-xs text-muted-foreground">
                    <Users2 className="mr-1 inline h-3 w-3" />
                    {sel.participantes.join(" · ")}
                  </p>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", statusTone[sel.status])}>
                  {sel.status}
                </span>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-5 bg-muted/20">
                {/* Mensagens mockadas */}
                <Bubble side="left" autor={sel.participantes[0]} hora={sel.data}>
                  Boa tarde! {sel.ultima}
                </Bubble>
                <Bubble side="right" autor={sel.participantes[1] ?? "Você"} hora="agora">
                  Recebido, vou verificar e te respondo em instantes.
                </Bubble>
                {sel.status !== "aberta" && (
                  <Bubble side="left" autor={sel.participantes[0]} hora="há 2 min">
                    Perfeito, obrigada! 👍
                  </Bubble>
                )}
              </div>

              <div className="border-t border-border p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Escreva uma mensagem para a equipe…"
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                  <Button className="bg-gradient-primary hover:opacity-90">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  💬 Mensagem interna · não enviada ao paciente
                </p>
              </div>
            </>
          )}
        </div>

        {/* Contexto / vínculos */}
        <div className="border-l border-border bg-muted/10 p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vinculado a</p>
            {sel?.pacienteId ? (
              <div className="mt-2 space-y-2">
                <Link to="/app/secretaria/pacientes" className="card-elevated flex items-center justify-between p-3 hover:shadow-elegant">
                  <div>
                    <p className="text-xs text-muted-foreground">Paciente</p>
                    <p className="text-sm font-medium">{sel.pacienteId}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </Link>
                {sel.agendamentoId && (
                  <Link to="/app/secretaria/agendamentos" className="card-elevated flex items-center justify-between p-3 hover:shadow-elegant">
                    <div>
                      <p className="text-xs text-muted-foreground">Agendamento</p>
                      <p className="text-sm font-medium">{sel.agendamentoId}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </Link>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Nenhum paciente ou agendamento vinculado.</p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações rápidas</p>
            <div className="mt-2 grid gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link to="/app/comunicacao/conversas"><MessageSquareText className="mr-2 h-3.5 w-3.5" />Abrir conversa com paciente</Link>
              </Button>
              <Button size="sm" variant="outline">
                <Clock className="mr-2 h-3.5 w-3.5" />Marcar como prioritária
              </Button>
              <Button size="sm" variant="outline">
                Encaminhar para Admin
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({ side, autor, hora, children }: { side: "left" | "right"; autor: string; hora: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col", side === "right" ? "items-end" : "items-start")}>
      <div className={cn(
        "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
        side === "right" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border rounded-bl-sm",
      )}>
        {children}
      </div>
      <p className="mt-1 px-1 text-[10px] text-muted-foreground">{autor} · {hora}</p>
    </div>
  );
}
