import { useMemo, useState } from "react";
import {
  Users, Search, Plus, MoreHorizontal, Eye, Pencil, Pause, Ban, Play, Trash2,
  Loader2, Shield, ShieldAlert, ShieldCheck, AlertCircle, Mail, ChevronDown,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useColaboradores, type ColabRow as ColabRowImported } from "@/lib/admin/queries";
import { useEffect } from "react";

// ----- tipos -----
type StatusConta = "ativo" | "pendente_convite" | "suspenso" | "bloqueado" | "removido";
type FuncaoInterna =
  | "secretaria" | "supervisor" | "financeiro" | "comercial"
  | "atendimento" | "suporte" | "gestor_operacional" | "outro";

type ColabRow = {
  id: string;
  user_id: string;
  nome_completo: string;
  email: string;
  cpf: string | null;
  telefone: string | null;
  funcao_interna: FuncaoInterna;
  cargo_descricao: string | null;
  setor: string | null;
  status_conta: StatusConta;
  ultimo_acesso_em: string | null;
  created_at: string;
};

const FUNCOES: { value: FuncaoInterna; label: string }[] = [
  { value: "secretaria", label: "Secretaria" },
  { value: "supervisor", label: "Supervisor" },
  { value: "financeiro", label: "Financeiro" },
  { value: "comercial", label: "Comercial" },
  { value: "atendimento", label: "Atendimento" },
  { value: "suporte", label: "Suporte" },
  { value: "gestor_operacional", label: "Gestor operacional" },
  { value: "outro", label: "Outro" },
];

const FILTROS = [
  { key: "todos", label: "Todos" },
  { key: "ativo", label: "Ativos" },
  { key: "pendente_convite", label: "Pendentes" },
  { key: "suspenso", label: "Suspensos" },
  { key: "bloqueado", label: "Bloqueados" },
  { key: "removido", label: "Removidos" },
  { key: "supervisor", label: "Supervisores" },
  { key: "secretaria", label: "Secretaria" },
  { key: "financeiro", label: "Financeiro" },
  { key: "comercial", label: "Comercial" },
  { key: "suporte", label: "Suporte" },
] as const;

// catálogo de permissões granulares (UI)
const PERM_GROUPS: { titulo: string; perms: { key: string; label: string }[] }[] = [
  {
    titulo: "Pacientes",
    perms: [
      { key: "pacientes.ver", label: "Ver pacientes" },
      { key: "pacientes.criar", label: "Criar paciente" },
      { key: "pacientes.editar", label: "Editar paciente" },
      { key: "pacientes.suspender", label: "Suspender paciente" },
      { key: "pacientes.bloquear", label: "Bloquear paciente" },
      { key: "pacientes.banir", label: "Banir paciente" },
      { key: "pacientes.reativar", label: "Reativar paciente" },
      { key: "pacientes.ver_documentos", label: "Ver documentos" },
      { key: "pacientes.ver_financeiro", label: "Ver financeiro do paciente" },
      { key: "pacientes.reembolsar", label: "Iniciar reembolso" },
      { key: "pacientes.ver_agendamentos", label: "Ver agendamentos" },
      { key: "pacientes.ver_comunicacao", label: "Ver comunicação" },
      { key: "pacientes.adicionar_observacao", label: "Adicionar observação" },
      { key: "pacientes.agendar", label: "Agendar para paciente" },
      { key: "pacientes.feegow_enviar", label: "Enviar para Feegow" },
    ],
  },
  {
    titulo: "Agendamentos",
    perms: [
      { key: "consultas.ver_tudo", label: "Ver toda a agenda" },
      { key: "consultas.reagendar", label: "Reagendar/encaixar" },
      { key: "consultas.cancelar", label: "Cancelar consulta" },
      { key: "consultas.trocar_medico", label: "Trocar médico" },
      { key: "consultas.forcar_status", label: "Forçar status" },
      { key: "consultas.reenviar_link", label: "Reenviar link" },
      { key: "consultas.ver_financeiro", label: "Ver financeiro da consulta" },
    ],
  },
  {
    titulo: "Financeiro",
    perms: [
      { key: "financeiro.ver", label: "Ver pagamentos e relatórios" },
      { key: "financeiro.cobrar", label: "Gerar cobrança / link de pagamento" },
      { key: "financeiro.cancelar_cobranca", label: "Cancelar cobrança" },
      { key: "financeiro.aprovar_reembolso", label: "Aprovar reembolso" },
      { key: "financeiro.reembolsar", label: "Solicitar reembolso" },
      { key: "financeiro.editar_comissao", label: "Editar comissão" },
      { key: "financeiro.servicos_gerenciar", label: "Gerenciar serviços" },
      { key: "financeiro.exportar", label: "Exportar relatórios" },
      { key: "financeiro.repasse_gerenciar", label: "Gerenciar repasses médicos" },
    ],
  },
  {
    titulo: "Feegow",
    perms: [
      { key: "feegow.enviar_paciente", label: "Enviar paciente" },
      { key: "feegow.sincronizar_agendamento", label: "Sincronizar agendamento" },
      { key: "feegow.ver_pendencias", label: "Ver pendências" },
      { key: "feegow.tentar_novamente", label: "Tentar novamente" },
    ],
  },
  {
    titulo: "Empresas",
    perms: [
      { key: "empresas.ver", label: "Ver empresas" },
      { key: "empresas.cadastrar_funcionario", label: "Cadastrar funcionário" },
      { key: "empresas.agendar_funcionario", label: "Agendar para funcionário" },
      { key: "empresas.ver_relatorios", label: "Ver relatórios da empresa" },
    ],
  },
  {
    titulo: "Comunicação WhatsApp",
    perms: [
      { key: "whatsapp.acessar_paciente", label: "Acessar WhatsApp de pacientes" },
      { key: "whatsapp.acessar_comercial", label: "Acessar WhatsApp comercial" },
      { key: "whatsapp.acessar_operacional", label: "Acessar WhatsApp operacional" },
      { key: "whatsapp.ver_atribuidas", label: "Ver apenas conversas atribuídas" },
      { key: "whatsapp.ver_todas", label: "Ver todas as conversas" },
      { key: "whatsapp.transferir", label: "Transferir conversa" },
      { key: "whatsapp.usar_templates", label: "Usar templates" },
      { key: "whatsapp.configurar_templates", label: "Configurar templates" },
      { key: "whatsapp.ativar_bot", label: "Ativar/desativar bot" },
      { key: "whatsapp.configurar_bot", label: "Configurar bot" },
      { key: "whatsapp.ver_metricas", label: "Ver métricas" },
    ],
  },
  {
    titulo: "Comunicação interna",
    perms: [
      { key: "interno.criar_conversa", label: "Criar conversa" },
      { key: "interno.responder", label: "Responder conversa" },
      { key: "interno.ver_proprias", label: "Ver conversas próprias" },
      { key: "interno.ver_equipe", label: "Ver conversas da equipe" },
      { key: "interno.ver_supervisores", label: "Ver conversas de supervisores" },
      { key: "interno.ver_medicos", label: "Ver conversas com médicos" },
      { key: "interno.ver_admin", label: "Ver conversas com admin" },
    ],
  },
  {
    titulo: "Supervisor",
    perms: [
      { key: "supervisor.fila_geral", label: "Ver fila geral" },
      { key: "supervisor.produtividade", label: "Ver produtividade da equipe" },
      { key: "supervisor.todas_conversas_secretaria", label: "Ver todas as conversas da secretaria" },
      { key: "supervisor.redistribuir", label: "Redistribuir tarefas" },
      { key: "supervisor.aprovar_excecoes", label: "Aprovar exceções" },
      { key: "supervisor.gerenciar_tarefas", label: "Gerenciar tarefas da equipe" },
    ],
  },
  {
    titulo: "Relatórios",
    perms: [
      { key: "relatorios.operacionais", label: "Ver relatórios operacionais" },
      { key: "relatorios.exportar", label: "Exportar relatórios" },
      { key: "relatorios.produtividade", label: "Ver produtividade" },
    ],
  },
  {
    titulo: "Administração",
    perms: [
      { key: "admin.gerenciar_colaboradores", label: "Gerenciar colaboradores" },
      { key: "admin.editar_permissoes", label: "Editar permissões" },
      { key: "admin.acessar_auditoria", label: "Acessar auditoria" },
      { key: "admin.acessar_configuracoes", label: "Acessar configurações" },
    ],
  },
];

function statusBadge(s: StatusConta) {
  const map: Record<StatusConta, { label: string; cls: string }> = {
    ativo:            { label: "Ativo",     cls: "border-success/40 text-success" },
    pendente_convite: { label: "Pendente",  cls: "border-warning/40 text-warning" },
    suspenso:         { label: "Suspenso",  cls: "border-warning/40 text-warning" },
    bloqueado:        { label: "Bloqueado", cls: "border-destructive/40 text-destructive" },
    removido:         { label: "Removido",  cls: "border-muted-foreground/30 text-muted-foreground" },
  };
  const v = map[s];
  return <Badge variant="outline" className={v.cls}>{v.label}</Badge>;
}

function funcaoLabel(f: FuncaoInterna) {
  return FUNCOES.find((x) => x.value === f)?.label ?? f;
}

// ============= COMPONENT =============
export default function AdminColaboradores() {
  const { toast } = useToast();
  const { data: rawRows = [], isLoading: loading, refetch: load } = useColaboradores();
  const rows = rawRows as unknown as ColabRow[];
  const [filtro, setFiltro] = useState<typeof FILTROS[number]["key"]>("todos");
  const [busca, setBusca] = useState("");

  // dialogs
  const [novoOpen, setNovoOpen] = useState(false);
  const [statusDialog, setStatusDialog] = useState<{ row: ColabRow; novo: StatusConta } | null>(null);
  const [permsOpen, setPermsOpen] = useState<ColabRow | null>(null);
  const [editOpen, setEditOpen] = useState<ColabRow | null>(null);

  const filtrados = useMemo(() => {
    let list = rows;
    if (filtro !== "todos") {
      const isStatus = ["ativo","pendente_convite","suspenso","bloqueado","removido"].includes(filtro);
      list = list.filter((r) => isStatus ? r.status_conta === filtro : r.funcao_interna === filtro);
    }
    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      list = list.filter((r) =>
        r.nome_completo?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.telefone?.toLowerCase().includes(q) ||
        r.cpf?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, filtro, busca]);

  const kpis = useMemo(() => ({
    total: rows.length,
    ativos: rows.filter((r) => r.status_conta === "ativo").length,
    pendentes: rows.filter((r) => r.status_conta === "pendente_convite").length,
    suspensos: rows.filter((r) => r.status_conta === "suspenso").length,
    bloqueados: rows.filter((r) => r.status_conta === "bloqueado").length,
  }), [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de colaboradores internos"
        description="Cadastre colaboradores, defina funções, permissões e acessos à comunicação da plataforma."
        actions={
          <Button onClick={() => setNovoOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Novo colaborador
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard title="Total" value={kpis.total} icon={<Users className="h-4 w-4" />} />
        <KpiCard title="Ativos" value={kpis.ativos} tone="success" />
        <KpiCard title="Pendentes" value={kpis.pendentes} tone="warning" />
        <KpiCard title="Suspensos" value={kpis.suspensos} tone="warning" />
        <KpiCard title="Bloqueados" value={kpis.bloqueados} tone="destructive" />
      </div>

      {/* Filtros + busca */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filtro === f.key ? "default" : "outline"}
              onClick={() => setFiltro(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail, telefone ou CPF…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <Th>Nome</Th><Th>Função</Th><Th>E-mail</Th><Th>Telefone</Th>
                <Th>Status</Th><Th>Setor</Th><Th>Último acesso</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-10 text-center">
                  <Loader2 className="h-5 w-5 animate-spin inline" /> Carregando…
                </td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={8} className="p-10 text-center text-muted-foreground">
                  Nenhum colaborador encontrado.
                </td></tr>
              ) : filtrados.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <Td className="font-medium">{r.nome_completo}</Td>
                  <Td><Badge variant="secondary">{funcaoLabel(r.funcao_interna)}</Badge></Td>
                  <Td className="text-muted-foreground">{r.email}</Td>
                  <Td className="text-muted-foreground">{r.telefone || "—"}</Td>
                  <Td>{statusBadge(r.status_conta)}</Td>
                  <Td className="text-muted-foreground">{r.setor || "—"}</Td>
                  <Td className="text-muted-foreground">
                    {r.ultimo_acesso_em ? new Date(r.ultimo_acesso_em).toLocaleString("pt-BR") : "—"}
                  </Td>
                  <Td>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setEditOpen(r)}>
                          <Pencil className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPermsOpen(r)}>
                          <Shield className="h-4 w-4 mr-2" /> Permissões
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {r.status_conta !== "suspenso" && (
                          <DropdownMenuItem onClick={() => setStatusDialog({ row: r, novo: "suspenso" })}>
                            <Pause className="h-4 w-4 mr-2" /> Suspender
                          </DropdownMenuItem>
                        )}
                        {r.status_conta !== "bloqueado" && (
                          <DropdownMenuItem onClick={() => setStatusDialog({ row: r, novo: "bloqueado" })}>
                            <Ban className="h-4 w-4 mr-2" /> Bloquear
                          </DropdownMenuItem>
                        )}
                        {(r.status_conta === "suspenso" || r.status_conta === "bloqueado") && (
                          <DropdownMenuItem onClick={() => setStatusDialog({ row: r, novo: "ativo" })}>
                            <Play className="h-4 w-4 mr-2" /> Reativar
                          </DropdownMenuItem>
                        )}
                        {r.status_conta !== "removido" && (
                          <DropdownMenuItem onClick={() => setStatusDialog({ row: r, novo: "removido" })}
                            className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" /> Remover
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialogs */}
      {novoOpen && <NovoColaboradorDialog open={novoOpen} onClose={() => setNovoOpen(false)} onCreated={load} />}
      {editOpen && <EditarColaboradorDialog row={editOpen} onClose={() => setEditOpen(null)} onSaved={load} />}
      {statusDialog && (
        <StatusDialog
          row={statusDialog.row}
          novo={statusDialog.novo}
          onClose={() => setStatusDialog(null)}
          onDone={load}
        />
      )}
      {permsOpen && (
        <PermissoesSheet
          row={permsOpen}
          onClose={() => setPermsOpen(null)}
        />
      )}
    </div>
  );
}

// ============= subcomponentes =============
function KpiCard({ title, value, icon, tone }: {
  title: string; value: number; icon?: React.ReactNode;
  tone?: "success" | "warning" | "destructive";
}) {
  const toneCls = tone === "success" ? "text-success"
    : tone === "warning" ? "text-warning"
    : tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs text-muted-foreground flex items-center gap-1">{icon}{title}</div>
      <div className={cn("text-2xl font-semibold mt-1", toneCls)}>{value}</div>
    </div>
  );
}

const Th = ({ children }: { children?: React.ReactNode }) => (
  <th className="px-3 py-2 font-medium text-muted-foreground">{children}</th>
);
const Td = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <td className={cn("px-3 py-2 align-middle", className)}>{children}</td>
);

// --- Novo colaborador ---
function NovoColaboradorDialog({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome_completo: "", email: "", cpf: "", telefone: "", data_nascimento: "",
    funcao_interna: "secretaria" as FuncaoInterna,
    cargo_descricao: "", setor: "", observacoes_internas: "",
    role: "secretaria" as "secretaria" | "supervisor",
    obrigar_troca_senha: true,
  });

  async function submit() {
    if (!form.nome_completo || !form.email) {
      toast({ title: "Preencha nome e e-mail", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("admin-invite-colaborador", {
      body: {
        ...form,
        data_nascimento: form.data_nascimento || null,
        redirect_to: `${window.location.origin}/auth`,
      },
    });
    setSaving(false);
    if (error || (data as any)?.error) {
      toast({ title: "Erro ao convidar", description: error?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Convite enviado", description: `${form.email} receberá um e-mail de acesso.` });
    onCreated();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo colaborador</DialogTitle>
          <DialogDescription>Um e-mail de convite será enviado para o acesso.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome completo *">
            <Input value={form.nome_completo} onChange={(e) => setForm({ ...form, nome_completo: e.target.value })} />
          </Field>
          <Field label="E-mail de acesso *">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="CPF">
            <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
          </Field>
          <Field label="Telefone">
            <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          </Field>
          <Field label="Data de nascimento">
            <Input type="date" value={form.data_nascimento}
              onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} />
          </Field>
          <Field label="Função interna *">
            <Select value={form.funcao_interna}
              onValueChange={(v) => setForm({ ...form, funcao_interna: v as FuncaoInterna })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{FUNCOES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Cargo (descrição)">
            <Input value={form.cargo_descricao} onChange={(e) => setForm({ ...form, cargo_descricao: e.target.value })} />
          </Field>
          <Field label="Setor">
            <Input value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} />
          </Field>
          <Field label="Nível de acesso (role) *">
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="secretaria">Secretaria (acesso operacional)</SelectItem>
                <SelectItem value="supervisor">Supervisor (acesso ampliado)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="col-span-2 flex items-center gap-2 mt-2">
            <Switch checked={form.obrigar_troca_senha}
              onCheckedChange={(v) => setForm({ ...form, obrigar_troca_senha: v })} />
            <Label>Obrigar troca de senha no primeiro acesso</Label>
          </div>
          <Field label="Observações internas" className="col-span-2">
            <Textarea value={form.observacoes_internas}
              onChange={(e) => setForm({ ...form, observacoes_internas: e.target.value })} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
            Enviar convite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Editar colaborador ---
function EditarColaboradorDialog({ row, onClose, onSaved }: {
  row: ColabRow; onClose: () => void; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome_completo: row.nome_completo,
    cpf: row.cpf ?? "",
    telefone: row.telefone ?? "",
    funcao_interna: row.funcao_interna,
    cargo_descricao: row.cargo_descricao ?? "",
    setor: row.setor ?? "",
  });

  async function submit() {
    setSaving(true);
    const { error } = await supabase.rpc("colaborador_atualizar", {
      _id: row.id, _patch: form as any,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" }); return;
    }
    toast({ title: "Atualizado" });
    onSaved(); onClose();
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar colaborador</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome completo">
            <Input value={form.nome_completo} onChange={(e) => setForm({ ...form, nome_completo: e.target.value })} />
          </Field>
          <Field label="CPF">
            <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
          </Field>
          <Field label="Telefone">
            <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          </Field>
          <Field label="Função interna">
            <Select value={form.funcao_interna}
              onValueChange={(v) => setForm({ ...form, funcao_interna: v as FuncaoInterna })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{FUNCOES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Cargo (descrição)">
            <Input value={form.cargo_descricao} onChange={(e) => setForm({ ...form, cargo_descricao: e.target.value })} />
          </Field>
          <Field label="Setor">
            <Input value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Status dialog (suspender/bloquear/reativar/remover) ---
function StatusDialog({ row, novo, onClose, onDone }: {
  row: ColabRow; novo: StatusConta; onClose: () => void; onDone: () => void;
}) {
  const { toast } = useToast();
  const [motivo, setMotivo] = useState("");
  const [obs, setObs] = useState("");
  const [prazo, setPrazo] = useState<string>("indeterminado");
  const [dataFim, setDataFim] = useState("");
  const [saving, setSaving] = useState(false);

  const titulos: Record<StatusConta, string> = {
    ativo: "Reativar colaborador", suspenso: "Suspender colaborador",
    bloqueado: "Bloquear colaborador", removido: "Remover colaborador",
    pendente_convite: "Marcar como pendente",
  };

  async function submit() {
    if (!motivo || motivo.length < 3) {
      toast({ title: "Informe o motivo", variant: "destructive" }); return;
    }
    let _ate: string | null = null; let indet = false;
    if (novo === "suspenso") {
      if (prazo === "indeterminado") indet = true;
      else if (prazo === "custom") _ate = new Date(dataFim).toISOString();
      else {
        const dias = parseInt(prazo);
        _ate = new Date(Date.now() + dias * 86400000).toISOString();
      }
    }
    setSaving(true);
    const { error } = await supabase.rpc("colaborador_alterar_status", {
      _id: row.id, _novo: novo, _motivo: motivo, _observacao: obs || null,
      _suspenso_ate: _ate, _indeterminado: indet,
    });
    setSaving(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Status atualizado" });
    onDone(); onClose();
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulos[novo]}</DialogTitle>
          <DialogDescription>{row.nome_completo} ({row.email})</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {novo === "suspenso" && (
            <Field label="Duração">
              <Select value={prazo} onValueChange={setPrazo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">24 horas</SelectItem>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="custom">Data específica</SelectItem>
                  <SelectItem value="indeterminado">Indeterminado</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
          {novo === "suspenso" && prazo === "custom" && (
            <Field label="Reativar em">
              <Input type="datetime-local" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </Field>
          )}
          <Field label="Motivo *">
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Justificativa obrigatória" />
          </Field>
          <Field label="Observação interna">
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}
            variant={novo === "ativo" ? "default" : "destructive"}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Painel granular de permissões ---
function PermissoesSheet({ row, onClose }: { row: ColabRow; onClose: () => void }) {
  const { toast } = useToast();
  const [overrides, setOverrides] = useState<Record<string, "grant" | "revoke">>({});
  const [defaults, setDefaults] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    // overrides individuais
    const { data: ov } = await supabase
      .from("permissoes_colaborador")
      .select("permission_key, efeito")
      .eq("user_id", row.user_id);
    const map: Record<string, "grant" | "revoke"> = {};
    (ov ?? []).forEach((r: any) => { map[r.permission_key] = r.efeito; });
    setOverrides(map);

    // permissões padrão da role do colaborador
    const { data: roles } = await supabase
      .from("user_roles").select("role").eq("user_id", row.user_id);
    const roleNames = (roles ?? []).map((r: any) => r.role);
    if (roleNames.length) {
      const { data: pp } = await supabase
        .from("permissoes_perfil")
        .select("permission_key")
        .in("role", roleNames as any)
        .eq("ativo", true);
      setDefaults(new Set((pp ?? []).map((r: any) => r.permission_key)));
    } else {
      setDefaults(new Set());
    }
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [row.user_id]);

  // estado efetivo: revoke > grant > default
  function efetivo(key: string): boolean {
    if (overrides[key] === "revoke") return false;
    if (overrides[key] === "grant") return true;
    return defaults.has(key);
  }

  async function setPerm(key: string, on: boolean) {
    const isDefault = defaults.has(key);
    // se on === default, podemos remover override
    if (on === isDefault) {
      const { error } = await supabase.rpc("colaborador_remover_permissao", {
        _user_id: row.user_id, _key: key, _motivo: null,
      });
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      const cp = { ...overrides }; delete cp[key]; setOverrides(cp);
    } else {
      const efeito = on ? "grant" : "revoke";
      const { error } = await supabase.rpc("colaborador_set_permissao", {
        _user_id: row.user_id, _key: key, _efeito: efeito, _motivo: null,
      });
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      setOverrides({ ...overrides, [key]: efeito });
    }
  }

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Permissões — {row.nome_completo}</SheetTitle>
          <SheetDescription>
            Função: <Badge variant="secondary">{funcaoLabel(row.funcao_interna)}</Badge> · {row.email}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-2 mb-4 rounded-md border border-warning/30 bg-warning/5 p-3 text-xs flex gap-2">
          <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div>
            Padrões da função são aplicados automaticamente. Você pode <b>conceder</b> ou
            <b> revogar</b> permissões individualmente — o ajuste individual prevalece sobre o padrão.
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Carregando permissões…
          </div>
        ) : (
          <div className="space-y-6">
            {PERM_GROUPS.map((g) => (
              <div key={g.titulo} className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {g.titulo}
                </div>
                <div className="rounded-md border divide-y">
                  {g.perms.map((p) => {
                    const on = efetivo(p.key);
                    const ov = overrides[p.key];
                    const def = defaults.has(p.key);
                    return (
                      <div key={p.key} className="flex items-center justify-between p-3 gap-2">
                        <div className="min-w-0">
                          <div className="text-sm">{p.label}</div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                            <code>{p.key}</code>
                            {ov === "grant" && <Badge variant="outline" className="border-success/40 text-success">Concedida individualmente</Badge>}
                            {ov === "revoke" && <Badge variant="outline" className="border-destructive/40 text-destructive">Revogada individualmente</Badge>}
                            {!ov && def && <Badge variant="outline">Padrão da função</Badge>}
                            {!ov && !def && <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">Sem acesso</Badge>}
                          </div>
                        </div>
                        <Switch checked={on} onCheckedChange={(v) => setPerm(p.key, v)} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
