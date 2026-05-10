import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, Search, Plus, Filter, MoreHorizontal, Eye, Pencil, Calendar,
  MessageSquare, History, Pause, Ban, Play, AlertCircle, Loader2, Shield,
  ChevronLeft, ChevronRight, ShieldOff, Clock,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { isValidCpf, maskCpf } from "@/lib/validation/cpf";

type StatusConta = "ativo" | "suspenso" | "bloqueado" | "banido" | "pendente";

type PacienteRow = {
  id: string;
  nome_completo: string | null;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  empresa_id: string | null;
  status_conta: StatusConta;
  status_motivo: string | null;
  responsavel_id: string | null;
  parentesco: string | null;
  created_at: string;
  ultima_consulta?: string | null;
  proxima_consulta?: string | null;
  tem_pagamento_pendente?: boolean;
};

const PAGE_SIZE = 50;

const filtrosPrincipais = [
  { key: "todos", label: "Todos" },
  { key: "ativo", label: "Ativos" },
  { key: "suspenso", label: "Suspensos" },
  { key: "bloqueado", label: "Bloqueados" },
  { key: "banido", label: "Banidos" },
  { key: "pendente", label: "Pendentes" },
  { key: "particular", label: "Particular" },
  { key: "empresarial", label: "Empresarial" },
  { key: "pgto_pendente", label: "Com pagamento pendente" },
] as const;

const motivosSugeridos = [
  "Quebra de contrato",
  "Quebra de confidencialidade",
  "Uso indevido da plataforma",
  "Fraude ou suspeita de fraude",
  "Comportamento inadequado",
  "Pendência administrativa grave",
  "Solicitação jurídica",
  "Outro",
];

function statusContaBadge(s: StatusConta) {
  const map: Record<StatusConta, { label: string; cls: string }> = {
    ativo:     { label: "Ativo",     cls: "border-success/40 text-success" },
    pendente:  { label: "Pendente",  cls: "border-muted-foreground/40 text-muted-foreground" },
    suspenso:  { label: "Suspenso",  cls: "border-warning/40 text-warning" },
    bloqueado: { label: "Bloqueado", cls: "border-destructive/40 text-destructive" },
    banido:    { label: "Banido",    cls: "border-destructive/60 text-destructive font-semibold" },
  };
  const v = map[s] ?? map.ativo;
  return <Badge variant="outline" className={v.cls}>{v.label}</Badge>;
}


function formatDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

export default function AdminUsuarios() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PacienteRow[]>([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<typeof filtrosPrincipais[number]["key"]>("todos");
  const [pagina, setPagina] = useState(0);
  const [totalRows, setTotalRows] = useState(0);

  // diálogo de status
  const [dialogOpen, setDialogOpen] = useState(false);
  const [acao, setAcao] = useState<StatusConta>("suspenso");
  const [pacienteAlvo, setPacienteAlvo] = useState<PacienteRow | null>(null);
  const [motivoSel, setMotivoSel] = useState<string>(motivosSugeridos[0]);
  const [motivoTxt, setMotivoTxt] = useState("");
  const [observacao, setObservacao] = useState("");
  const [bloqueadoAte, setBloqueadoAte] = useState("");
  const [salvando, setSalvando] = useState(false);

  // diálogo novo paciente
  const [novoOpen, setNovoOpen] = useState(false);
  const [novo, setNovo] = useState({ nome: "", cpf: "", telefone: "", email: "", vinculo: "particular" as "particular" | "empresarial" });
  const [criando, setCriando] = useState(false);

  async function carregar() {
    setLoading(true);

    // Count total
    const { count } = await supabase
      .from("pacientes")
      .select("id", { count: "exact", head: true });
    setTotalRows(count ?? 0);

    const from = pagina * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data: pacientes, error } = await supabase
      .from("pacientes")
      .select("id,nome_completo,cpf,telefone,empresa_id,status_conta,status_motivo,created_at,user_id")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const ids = (pacientes ?? []).map(p => p.id);
    const userIds = (pacientes ?? []).map(p => p.user_id).filter(Boolean) as string[];

    const emailsMap = new Map<string, string>();
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,email")
        .in("id", userIds);
      profs?.forEach(p => p.email && emailsMap.set(p.id, p.email));
    }

    const ultimaMap = new Map<string, string>();
    const proximaMap = new Map<string, string>();
    const pgtoPend = new Set<string>();

    if (ids.length) {
      const { data: consultasPassadas } = await supabase
        .from("consultas")
        .select("paciente_id,inicio")
        .in("paciente_id", ids)
        .lte("inicio", new Date().toISOString())
        .order("inicio", { ascending: false });
      consultasPassadas?.forEach(c => {
        if (!ultimaMap.has(c.paciente_id)) ultimaMap.set(c.paciente_id, c.inicio);
      });

      const { data: consultasFuturas } = await supabase
        .from("consultas")
        .select("paciente_id,inicio,status")
        .in("paciente_id", ids)
        .gt("inicio", new Date().toISOString())
        .in("status", ["agendada", "confirmada"])
        .order("inicio", { ascending: true });
      consultasFuturas?.forEach(c => {
        if (!proximaMap.has(c.paciente_id)) proximaMap.set(c.paciente_id, c.inicio);
      });

      const { data: pagPend } = await supabase
        .from("pagamentos")
        .select("consulta_id, status, consultas:consulta_id(paciente_id)")
        .in("status", ["pendente", "processando"]);
      pagPend?.forEach((p: any) => {
        const pid = p.consultas?.paciente_id;
        if (pid) pgtoPend.add(pid);
      });
    }

    const rowsFull: PacienteRow[] = (pacientes ?? []).map(p => ({
      id: p.id,
      nome_completo: p.nome_completo,
      cpf: p.cpf,
      telefone: p.telefone,
      email: p.user_id ? emailsMap.get(p.user_id) ?? null : null,
      empresa_id: p.empresa_id,
      status_conta: (p.status_conta ?? "ativo") as StatusConta,
      status_motivo: p.status_motivo,
      created_at: p.created_at,
      ultima_consulta: ultimaMap.get(p.id) ?? null,
      proxima_consulta: proximaMap.get(p.id) ?? null,
      tem_pagamento_pendente: pgtoPend.has(p.id),
    }));

    setRows(rowsFull);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, [pagina]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return rows.filter(r => {
      if (filtro === "ativo" && r.status_conta !== "ativo") return false;
      if (filtro === "suspenso" && r.status_conta !== "suspenso") return false;
      if (filtro === "bloqueado" && r.status_conta !== "bloqueado") return false;
      if (filtro === "banido" && r.status_conta !== "banido") return false;
      if (filtro === "pendente" && r.status_conta !== "pendente") return false;
      if (filtro === "particular" && r.empresa_id) return false;
      if (filtro === "empresarial" && !r.empresa_id) return false;
      if (filtro === "pgto_pendente" && !r.tem_pagamento_pendente) return false;

      if (!q) return true;
      const cpfNum = (r.cpf ?? "").replace(/\D/g, "");
      const telNum = (r.telefone ?? "").replace(/\D/g, "");
      const qNum = q.replace(/\D/g, "");
      return (
        (r.nome_completo ?? "").toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        (qNum.length >= 3 && (cpfNum.includes(qNum) || telNum.includes(qNum)))
      );
    });
  }, [rows, busca, filtro]);

  function abrirDialog(p: PacienteRow, novoStatus: StatusConta) {
    setPacienteAlvo(p);
    setAcao(novoStatus);
    setMotivoSel(motivosSugeridos[0]);
    setMotivoTxt("");
    setObservacao("");
    setBloqueadoAte("");
    setDialogOpen(true);
  }

  async function confirmar() {
    if (!pacienteAlvo) return;
    const motivo = motivoSel === "Outro" ? motivoTxt.trim() : motivoSel;
    if (!motivo || motivo.length < 3) {
      toast({ title: "Motivo obrigatório", description: "Descreva o motivo (mín. 3 caracteres).", variant: "destructive" });
      return;
    }
    setSalvando(true);
    const { error } = await supabase.rpc("alterar_status_conta_paciente", {
      _paciente_id: pacienteAlvo.id,
      _novo_status: acao,
      _motivo: motivo,
      _observacao: observacao.trim() || null,
      _bloqueado_ate: acao === "bloqueado" && bloqueadoAte ? new Date(bloqueadoAte).toISOString() : null,
    } as any);
    setSalvando(false);
    if (error) {
      toast({ title: "Não foi possível alterar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Status atualizado", description: `Paciente ${acao === "ativo" ? "reativado" : acao}.` });
    setDialogOpen(false);
    carregar();
  }

  async function criarPaciente() {
    if (!novo.nome.trim() || !novo.email.trim()) {
      toast({ title: "Campos obrigatórios", description: "Preencha nome e e-mail.", variant: "destructive" });
      return;
    }
    if (novo.cpf && !isValidCpf(novo.cpf)) {
      toast({ title: "CPF inválido", description: "Verifique os dígitos informados.", variant: "destructive" });
      return;
    }
    setCriando(true);
    const { data, error } = await supabase.functions.invoke("admin-criar-paciente", {
      body: {
        email: novo.email.trim(),
        nome_completo: novo.nome.trim(),
        cpf: novo.cpf ? novo.cpf.replace(/\D/g, "") : null,
        telefone: novo.telefone.trim() || null,
        vinculo: novo.vinculo,
      },
    });
    setCriando(false);
    if (error || data?.error) {
      toast({ title: "Erro ao criar paciente", description: data?.error ?? error?.message ?? "Falha desconhecida", variant: "destructive" });
      return;
    }
    toast({ title: "Paciente criado", description: `${novo.nome} cadastrado com sucesso. Convite enviado por e-mail.` });
    setNovo({ nome: "", cpf: "", telefone: "", email: "", vinculo: "particular" });
    setNovoOpen(false);
    carregar();
  }

  const totalPaginas = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de usuários/pacientes"
        description="Cadastro, vínculo, integração Feegow e ações administrativas sobre contas de pacientes."
        actions={
          <Button onClick={() => setNovoOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />Novo paciente
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: totalRows, icon: Users, cls: "text-primary" },
          { label: "Ativos", value: rows.filter(r => r.status_conta === "ativo").length, icon: Play, cls: "text-success" },
          { label: "Suspensos/Bloqueados", value: rows.filter(r => ["suspenso", "bloqueado", "banido"].includes(r.status_conta)).length, icon: ShieldOff, cls: "text-destructive" },
          { label: "Pgto pendente", value: rows.filter(r => r.tem_pagamento_pendente).length, icon: AlertCircle, cls: "text-warning" },
        ].map(k => (
          <div key={k.label} className="rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{k.label}</span>
              <k.icon className={cn("h-4 w-4", k.cls)} />
            </div>
            <div className="text-2xl font-display font-semibold mt-1">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="card-elevated p-4 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF, telefone ou e-mail…"
              className="pl-9"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            {filtradas.length} de {rows.length}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {filtrosPrincipais.map(f => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                filtro === f.key
                  ? "border-primary bg-primary text-primary-foreground"
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
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Carregando pacientes…
          </div>
        ) : filtradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-12 text-center text-muted-foreground">
            <Users className="h-8 w-8 opacity-40" />
            <p className="text-sm">Nenhum paciente encontrado com os filtros atuais.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Nome</th>
                  <th className="px-4 py-2 text-left">CPF</th>
                  <th className="px-4 py-2 text-left">Telefone</th>
                  <th className="px-4 py-2 text-left">E-mail</th>
                  <th className="px-4 py-2 text-left">Vínculo</th>
                  <th className="px-4 py-2 text-left">Conta</th>
                  <th className="px-4 py-2 text-left">Última</th>
                  <th className="px-4 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map(p => (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{p.nome_completo ?? "—"}</span>
                        {p.tem_pagamento_pendente && (
                          <span title="Pagamento pendente">
                            <AlertCircle className="h-3.5 w-3.5 text-warning" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{p.cpf ?? "—"}</td>
                    <td className="px-4 py-2.5">{p.telefone ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{p.email ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      {p.empresa_id
                        ? <Badge variant="secondary">Empresarial</Badge>
                        : <Badge variant="outline">Particular</Badge>}
                    </td>
                    <td className="px-4 py-2.5">{statusContaBadge(p.status_conta)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(p.ultima_consulta)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Ações">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Paciente</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link to={`/app/admin/pacientes/${p.id}`}>
                              <Eye className="mr-2 h-4 w-4" />Ver perfil
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/app/admin/pacientes/${p.id}?tab=editar`}>
                              <Pencil className="mr-2 h-4 w-4" />Editar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/app/secretaria/agenda?paciente=${p.id}`}>
                              <Calendar className="mr-2 h-4 w-4" />Agendar consulta
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/app/comunicacao/inbox?paciente=${p.id}`}>
                              <MessageSquare className="mr-2 h-4 w-4" />Abrir WhatsApp
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/app/admin/pacientes/${p.id}?tab=timeline`}>
                              <History className="mr-2 h-4 w-4" />Ver histórico
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="flex items-center gap-1">
                            <Shield className="h-3.5 w-3.5" />Conta
                          </DropdownMenuLabel>
                          {p.status_conta !== "suspenso" && (
                            <DropdownMenuItem onClick={() => abrirDialog(p, "suspenso")}>
                              <Pause className="mr-2 h-4 w-4 text-warning" />Suspender
                            </DropdownMenuItem>
                          )}
                          {p.status_conta !== "bloqueado" && p.status_conta !== "banido" && (
                            <DropdownMenuItem onClick={() => abrirDialog(p, "bloqueado")}>
                              <Ban className="mr-2 h-4 w-4 text-destructive" />Bloquear
                            </DropdownMenuItem>
                          )}
                          {p.status_conta !== "banido" && (
                            <DropdownMenuItem onClick={() => abrirDialog(p, "banido")}>
                              <ShieldOff className="mr-2 h-4 w-4 text-destructive" />Banir
                            </DropdownMenuItem>
                          )}
                          {p.status_conta !== "ativo" && (
                            <DropdownMenuItem onClick={() => abrirDialog(p, "ativo")}>
                              <Play className="mr-2 h-4 w-4 text-success" />Reativar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Página {pagina + 1} de {totalPaginas} · {totalRows} pacientes
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={pagina === 0}
                onClick={() => setPagina(p => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagina >= totalPaginas - 1}
                onClick={() => setPagina(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Diálogo alteração de status */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {acao === "suspenso" && "Suspender conta"}
              {acao === "bloqueado" && "Bloquear conta"}
              {acao === "banido" && "Banir conta"}
              {acao === "ativo" && "Reativar conta"}
              {acao === "pendente" && "Marcar como pendente"}
            </DialogTitle>
            <DialogDescription>
              {pacienteAlvo?.nome_completo} — {pacienteAlvo?.cpf ?? "sem CPF"}.{" "}
              {acao === "suspenso" && "Bloqueia novos agendamentos. Documentos e histórico permanecem acessíveis."}
              {acao === "bloqueado" && "Impede login e novos agendamentos. Pode definir data limite para bloqueio temporário."}
              {acao === "banido" && "Banimento permanente. Impede qualquer acesso à plataforma. Ação grave e irreversível na prática."}
              {acao === "ativo" && "Restaura o acesso completo do paciente à plataforma."}
              {acao === "pendente" && "Marca o paciente como pendente de verificação."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Motivo</Label>
              <Select value={motivoSel} onValueChange={setMotivoSel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {motivosSugeridos.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {motivoSel === "Outro" && (
              <div>
                <Label>Descreva o motivo</Label>
                <Input value={motivoTxt} onChange={e => setMotivoTxt(e.target.value)} placeholder="Mínimo 3 caracteres" />
              </div>
            )}

            <div>
              <Label>Observação interna (opcional)</Label>
              <Textarea
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                rows={3}
                placeholder="Notas visíveis apenas para a equipe administrativa."
              />
            </div>

            {acao === "bloqueado" && (
              <div>
                <Label className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Bloqueio temporário até (opcional)</Label>
                <Input
                  type="datetime-local"
                  value={bloqueadoAte}
                  onChange={e => setBloqueadoAte(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Deixe vazio para bloqueio permanente. Se preenchido, o bloqueio expira automaticamente.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={salvando}>Cancelar</Button>
            <Button
              onClick={confirmar}
              disabled={salvando}
              variant={["bloqueado", "banido"].includes(acao) ? "destructive" : "default"}
            >
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo novo paciente */}
      <Dialog open={novoOpen} onOpenChange={setNovoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo paciente</DialogTitle>
            <DialogDescription>
              Cadastra o paciente e envia convite por e-mail automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Nome completo *"
              value={novo.nome}
              onChange={e => setNovo(n => ({ ...n, nome: e.target.value }))}
            />
            <Input
              placeholder="CPF"
              value={novo.cpf}
              maxLength={14}
              onChange={e => setNovo(n => ({ ...n, cpf: maskCpf(e.target.value) }))}
            />
            <Input
              placeholder="Telefone"
              value={novo.telefone}
              onChange={e => setNovo(n => ({ ...n, telefone: e.target.value }))}
            />
            <Input
              placeholder="E-mail *"
              type="email"
              value={novo.email}
              onChange={e => setNovo(n => ({ ...n, email: e.target.value }))}
            />
            <div className="flex gap-2">
              {(["particular", "empresarial"] as const).map(v => (
                <Button
                  key={v}
                  type="button"
                  variant={novo.vinculo === v ? "default" : "outline"}
                  onClick={() => setNovo(n => ({ ...n, vinculo: v }))}
                  className="flex-1 capitalize"
                >
                  {v}
                </Button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Após criar, o paciente fica disponível na plataforma e pode ser agendado normalmente.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoOpen(false)} disabled={criando}>Cancelar</Button>
            <Button onClick={criarPaciente} disabled={criando}>
              {criando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar paciente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
