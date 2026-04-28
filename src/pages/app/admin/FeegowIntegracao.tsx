import { useState } from "react";
import {
  RefreshCw, ShieldCheck, AlertTriangle, CheckCircle2, Clock, Plug,
  Users, Stethoscope, ListChecks, Tag, Calendar, ScrollText, ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  feegowConnection,
  integrationLogsMock,
  pendenciasFeegow,
  type IntegrationLog,
} from "@/lib/feegow";

const statusBadge = (s: IntegrationLog["status"]) =>
  s === "sucesso"
    ? "bg-success/10 text-success border-success/20"
    : s === "erro"
    ? "bg-destructive/10 text-destructive border-destructive/20"
    : "bg-warning/10 text-warning border-warning/30";

export default function FeegowIntegracao() {
  const [logs, setLogs] = useState<IntegrationLog[]>(integrationLogsMock);
  const conn = feegowConnection;
  const pendencias = pendenciasFeegow();

  const simulate = (label: string) => {
    const novo: IntegrationLog = {
      id: `L-${Math.floor(Math.random() * 9000) + 1000}`,
      data_hora: "agora",
      entidade: "agendamento",
      entidade_id_interno: "—",
      acao: "sincronizar",
      status: conn.token_configurado ? "sucesso" : "erro",
      mensagem: conn.token_configurado
        ? `${label} (mock) — concluído.`
        : `${label} bloqueado: token não configurado.`,
    };
    setLogs([novo, ...logs]);
    toast(novo.mensagem, {
      description: "Operação em modo mock. Backend real será conectado futuramente.",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integração · Feegow"
        description="Arquitetura e ações preparadas para a futura integração via API. Nenhuma chave é exposta no front-end."
      />

      {/* Banner modo mock */}
      <div className="card-elevated flex items-start gap-3 border-warning/30 bg-warning/5 p-4">
        <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
        <div className="text-sm">
          <p className="font-semibold">Integração em modo simulado (mock)</p>
          <p className="text-muted-foreground">
            Todas as ações abaixo registram apenas logs locais. A comunicação real com a Feegow
            será feita exclusivamente pelo backend, com o token armazenado no servidor.
          </p>
        </div>
      </div>

      {/* Status da conexão */}
      <div className="card-elevated p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                conn.status === "conectado"
                  ? "border-success/30 bg-success/10 text-success"
                  : conn.status === "erro"
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-warning/30 bg-warning/10 text-warning"
              }`}
            >
              {conn.status === "conectado" ? "Conectado" : conn.status === "erro" ? "Erro" : "Pendente"}
            </span>
            <h2 className="mt-2 font-display text-2xl font-bold">Conexão Feegow</h2>
            <p className="text-sm text-muted-foreground">
              Ambiente: <strong>{conn.ambiente}</strong> · Modo: <strong>{conn.modo}</strong>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => simulate("Teste de conexão")}>
              <Plug className="mr-2 h-4 w-4" /> Testar conexão
            </Button>
            <Button>
              <ShieldCheck className="mr-2 h-4 w-4" /> Configurar token (backend)
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Token configurado</p>
            <p className="mt-1 font-semibold">{conn.token_configurado ? "Sim" : "Não"}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Última sincronização</p>
            <p className="mt-1 font-semibold">{conn.ultima_sincronizacao ?? "—"}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Pendências atuais</p>
            <p className="mt-1 font-semibold">{pendencias.length}</p>
          </div>
        </div>
      </div>

      {/* Ações de sincronização */}
      <div className="card-elevated p-6">
        <h3 className="font-display text-lg font-semibold">Sincronizações disponíveis</h3>
        <p className="text-sm text-muted-foreground">Todas as ações são executadas pelo backend (mock no front).</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Button variant="outline" className="justify-start" onClick={() => simulate("Sincronizar profissionais")}>
            <Stethoscope className="mr-2 h-4 w-4" /> Profissionais
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => simulate("Sincronizar especialidades")}>
            <Tag className="mr-2 h-4 w-4" /> Especialidades
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => simulate("Sincronizar procedimentos")}>
            <ListChecks className="mr-2 h-4 w-4" /> Procedimentos
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => simulate("Sincronizar canais")}>
            <Plug className="mr-2 h-4 w-4" /> Canais de agendamento
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => simulate("Sincronizar pacientes")}>
            <Users className="mr-2 h-4 w-4" /> Pacientes
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => simulate("Sincronizar agendamentos")}>
            <Calendar className="mr-2 h-4 w-4" /> Agendamentos
          </Button>
        </div>
      </div>

      {/* Atalhos para sub-páginas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/app/admin/feegow/mapeamento" className="card-elevated p-5 hover:border-primary/40 transition">
          <p className="font-semibold flex items-center gap-2"><Tag className="h-4 w-4 text-primary" /> Mapeamento de status</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Status internos x status Feegow para agendamentos.
          </p>
        </Link>
        <Link to="/app/admin/feegow/schema" className="card-elevated p-5 hover:border-primary/40 transition">
          <p className="font-semibold flex items-center gap-2"><ScrollText className="h-4 w-4 text-primary" /> Schema lógico</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tabelas, campos e IDs externos preparados para a Feegow.
          </p>
        </Link>
        <Link to="/app/admin/pendencias-integracao" className="card-elevated p-5 hover:border-primary/40 transition">
          <p className="font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Pendências</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {pendencias.length} item(ns) aguardando sincronização.
          </p>
        </Link>
      </div>

      {/* Logs */}
      <div className="card-elevated">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h3 className="font-display text-lg font-semibold">Logs da integração</h3>
            <p className="text-xs text-muted-foreground">
              Histórico das tentativas de comunicação com a Feegow.
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => simulate("Recarregar logs")}>
            <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
          </Button>
        </div>

        <div className="divide-y divide-border">
          {logs.map(l => (
            <div key={l.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-4">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadge(l.status)}`}>
                {l.status === "sucesso" ? <CheckCircle2 className="inline h-3 w-3 mr-1" /> :
                 l.status === "erro" ? <AlertTriangle className="inline h-3 w-3 mr-1" /> :
                 <Clock className="inline h-3 w-3 mr-1" />}
                {l.status}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {l.acao} · {l.entidade} · <span className="font-mono">{l.entidade_id_interno}</span>
                </p>
                <p className="text-xs text-muted-foreground truncate">{l.mensagem}</p>
              </div>
              <span className="text-xs text-muted-foreground">{l.data_hora}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <ExternalLink className="h-3 w-3" />
        Documentação oficial:&nbsp;
        <a href="https://docs.feegow.com/" target="_blank" rel="noreferrer" className="underline">docs.feegow.com</a>
      </p>
    </div>
  );
}
