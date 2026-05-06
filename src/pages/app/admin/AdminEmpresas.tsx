import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLoading, AdminError } from "@/components/admin/AdminStates";
import {
  Building2, Plus, Search, AlertTriangle, Wallet, Users, FileText,
  Power, Activity, Receipt, Settings2, Save,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TIPOS = [
  { value: "contratante", label: "Empresa contratante" },
  { value: "clinica_parceira", label: "Clínica parceira" },
  { value: "saude_ocupacional", label: "Saúde ocupacional" },
  { value: "indicadora", label: "Empresa indicadora" },
  { value: "hibrida", label: "Híbrida (multiuso)" },
] as const;

const PORTES = [
  { value: "mei", label: "MEI" }, { value: "pequena", label: "Pequena" },
  { value: "media", label: "Média" }, { value: "grande", label: "Grande" },
] as const;

const MODELOS = [
  { value: "por_colaborador", label: "Por colaborador" },
  { value: "por_consulta", label: "Por consulta" },
  { value: "plano_fixo", label: "Plano fixo mensal" },
  { value: "hibrido", label: "Híbrido" },
] as const;

const CONTRATO_STATUS = [
  { value: "rascunho", label: "Rascunho" }, { value: "ativo", label: "Ativo" },
  { value: "suspenso", label: "Suspenso" }, { value: "encerrado", label: "Encerrado" },
] as const;

const MODULOS = [
  { key: "colaboradores", label: "Gestão de colaboradores" },
  { key: "agendamento_interno", label: "Agendamento interno" },
  { key: "relatorios_rh", label: "Relatórios para RH" },
  { key: "faturamento", label: "Faturamento automatizado" },
  { key: "feegow", label: "Integração Feegow" },
  { key: "whatsapp", label: "Acesso ao WhatsApp" },
  { key: "documentos", label: "Envio de documentos" },
];

const fmtBRL = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtCNPJ = (s?: string | null) => s ? s.replace(/\D/g, "").replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5") : "—";

interface EmpresaOverview {
  id: string; razao_social: string; nome_fantasia: string | null; cnpj: string | null;
  tipo_empresa: string; ativo: boolean; contrato_status: string; modelo_financeiro: string;
  limite_consultas_mes: number | null;
  funcionarios: number; consultas_mes: number; faturamento_mes_centavos: number;
  inadimplente: boolean;
}

interface EmpresaForm {
  razao_social: string; nome_fantasia: string; cnpj: string; segmento: string;
  porte: string; tipo_empresa: string; email: string; telefone: string;
  responsavel_nome: string; responsavel_email: string; responsavel_telefone: string;
  modelo_financeiro: string; valor_colaborador_centavos: number; valor_consulta_centavos: number;
  plano_mensal_centavos: number; limite_consultas_mes: number | null;
  contrato_status: string; contrato_inicio: string; contrato_renovacao: string;
  observacoes: string; ativo: boolean;
}

const emptyForm: EmpresaForm = {
  razao_social: "", nome_fantasia: "", cnpj: "", segmento: "", porte: "pequena",
  tipo_empresa: "contratante", email: "", telefone: "",
  responsavel_nome: "", responsavel_email: "", responsavel_telefone: "",
  modelo_financeiro: "por_consulta", valor_colaborador_centavos: 0, valor_consulta_centavos: 0,
  plano_mensal_centavos: 0, limite_consultas_mes: null,
  contrato_status: "rascunho", contrato_inicio: "", contrato_renovacao: "",
  observacoes: "", ativo: true,
};

export default function AdminEmpresas() {
  const queryClient = useQueryClient();
  const { data: rows = [], isLoading, error, refetch } = useQuery<EmpresaOverview[]>({
    queryKey: ["admin", "empresas-list"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_empresas_overview" as never);
      if (error) throw error;
      return (data ?? []) as EmpresaOverview[];
    },
    staleTime: 60_000,
    retry: 2,
  });

  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmpresaForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [openSheetId, setOpenSheetId] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "empresas-list"] });

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return rows.filter(r => {
      if (filtroTipo !== "todos" && r.tipo_empresa !== filtroTipo) return false;
      if (filtroStatus === "ativa" && !r.ativo) return false;
      if (filtroStatus === "inativa" && r.ativo) return false;
      if (filtroStatus === "inadimplente" && !r.inadimplente) return false;
      if (filtroStatus === "sem_uso" && r.consultas_mes > 0) return false;
      if (filtroStatus === "alto_uso" && r.consultas_mes < 50) return false;
      if (q) {
        const blob = `${r.razao_social} ${r.nome_fantasia ?? ""} ${r.cnpj ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [rows, busca, filtroTipo, filtroStatus]);

  const kpis = useMemo(() => ({
    total: rows.length,
    ativas: rows.filter(r => r.ativo).length,
    inadimplentes: rows.filter(r => r.inadimplente).length,
    faturamento: rows.reduce((s, r) => s + (r.faturamento_mes_centavos ?? 0), 0),
  }), [rows]);

  const onCriar = () => { setEditingId(null); setForm(emptyForm); setOpenForm(true); };
  const onEditar = async (id: string) => {
    const { data, error } = await supabase.from("empresas").select("*").eq("id", id).maybeSingle();
    if (error || !data) { toast.error("Não foi possível carregar"); return; }
    setEditingId(id);
    setForm({
      razao_social: data.razao_social ?? "",
      nome_fantasia: data.nome_fantasia ?? "",
      cnpj: data.cnpj ?? "",
      segmento: (data as unknown as Record<string, string>).segmento ?? "",
      porte: (data as unknown as Record<string, string>).porte ?? "pequena",
      tipo_empresa: (data as unknown as Record<string, string>).tipo_empresa ?? "contratante",
      email: data.email ?? "",
      telefone: data.telefone ?? "",
      responsavel_nome: (data as unknown as Record<string, string>).responsavel_nome ?? "",
      responsavel_email: (data as unknown as Record<string, string>).responsavel_email ?? "",
      responsavel_telefone: (data as unknown as Record<string, string>).responsavel_telefone ?? "",
      modelo_financeiro: (data as unknown as Record<string, string>).modelo_financeiro ?? "por_consulta",
      valor_colaborador_centavos: (data as unknown as Record<string, number>).valor_colaborador_centavos ?? 0,
      valor_consulta_centavos: (data as unknown as Record<string, number>).valor_consulta_centavos ?? 0,
      plano_mensal_centavos: (data as unknown as Record<string, number>).plano_mensal_centavos ?? 0,
      limite_consultas_mes: (data as unknown as Record<string, number | null>).limite_consultas_mes ?? null,
      contrato_status: (data as unknown as Record<string, string>).contrato_status ?? "rascunho",
      contrato_inicio: (data as unknown as Record<string, string>).contrato_inicio ?? "",
      contrato_renovacao: (data as unknown as Record<string, string>).contrato_renovacao ?? "",
      observacoes: data.observacoes ?? "",
      ativo: data.ativo,
    });
    setOpenForm(true);
  };

  const onSalvar = async () => {
    if (!form.razao_social.trim()) { toast.error("Razão social obrigatória"); return; }
    setSaving(true);
    const payload: Record<string, unknown> = {
      ...form,
      cnpj: form.cnpj ? form.cnpj.replace(/\D/g, "") : null,
      contrato_inicio: form.contrato_inicio || null,
      contrato_renovacao: form.contrato_renovacao || null,
      limite_consultas_mes: form.limite_consultas_mes || null,
    };
    const { error } = editingId
      ? await supabase.from("empresas").update(payload as never).eq("id", editingId)
      : await supabase.from("empresas").insert(payload as never);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar", { description: error.message }); return; }
    toast.success(editingId ? "Empresa atualizada" : "Empresa criada");
    setOpenForm(false);
    invalidate();
  };

  if (error) return <AdminError message={(error as Error).message} onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Empresas B2B"
        description="Gestão completa de empresas contratantes, clínicas parceiras e parceiros de saúde ocupacional."
        actions={<Button onClick={onCriar}><Plus className="mr-2 h-4 w-4" /> Nova empresa</Button>}
      />

      {isLoading ? <AdminLoading cards={4} rows={6} /> : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Empresas cadastradas" value={String(kpis.total)} icon={Building2} />
            <StatCard label="Ativas" value={String(kpis.ativas)} icon={Power} />
            <StatCard label="Inadimplentes" value={String(kpis.inadimplentes)} icon={AlertTriangle} hint="Faturas em atraso" />
            <StatCard label="Faturamento do mês" value={fmtBRL(kpis.faturamento)} icon={Wallet} />
          </div>

          <div className="card-elevated flex flex-wrap items-center gap-3 p-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por nome, CNPJ ou responsável…" value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="ativa">Ativas</SelectItem>
                <SelectItem value="inativa">Inativas</SelectItem>
                <SelectItem value="inadimplente">Inadimplentes</SelectItem>
                <SelectItem value="sem_uso">Sem uso no mês</SelectItem>
                <SelectItem value="alto_uso">Alto uso (50+)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="card-elevated overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Empresa</th>
                  <th className="text-left">Tipo</th>
                  <th className="text-left">CNPJ</th>
                  <th className="text-right">Funcionários</th>
                  <th className="text-right">Consultas/mês</th>
                  <th className="text-right">Faturamento</th>
                  <th className="text-left pl-4">Status</th>
                  <th className="text-right pr-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 && (
                  <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">Nenhuma empresa encontrada.</td></tr>
                )}
                {filtradas.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.razao_social}</div>
                      {r.nome_fantasia && <div className="text-xs text-muted-foreground">{r.nome_fantasia}</div>}
                    </td>
                    <td><Badge variant="outline" className="capitalize">{TIPOS.find(t => t.value === r.tipo_empresa)?.label ?? r.tipo_empresa}</Badge></td>
                    <td className="font-mono text-xs">{fmtCNPJ(r.cnpj)}</td>
                    <td className="text-right">{r.funcionarios}</td>
                    <td className="text-right">
                      <span className={cn(r.limite_consultas_mes && r.consultas_mes > r.limite_consultas_mes && "text-warning font-semibold")}>
                        {r.consultas_mes}{r.limite_consultas_mes ? `/${r.limite_consultas_mes}` : ""}
                      </span>
                    </td>
                    <td className="text-right tabular-nums">{fmtBRL(r.faturamento_mes_centavos)}</td>
                    <td className="pl-4">
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={r.ativo ? "default" : "secondary"}>{r.ativo ? "Ativa" : "Inativa"}</Badge>
                        {r.inadimplente && <Badge variant="destructive">Inadimplente</Badge>}
                        <Badge variant="outline" className="capitalize">{r.contrato_status}</Badge>
                      </div>
                    </td>
                    <td className="pr-4 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setOpenSheetId(r.id)}>Abrir</Button>
                      <Button size="sm" variant="ghost" onClick={() => onEditar(r.id)}>Editar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar empresa" : "Nova empresa"}</DialogTitle>
            <DialogDescription>Cadastro completo de empresa B2B.</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="dados">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="dados">Dados gerais</TabsTrigger>
              <TabsTrigger value="responsavel">Responsável</TabsTrigger>
              <TabsTrigger value="contrato">Contrato</TabsTrigger>
              <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipo da empresa *">
                  <Select value={form.tipo_empresa} onValueChange={v => setForm({ ...form, tipo_empresa: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Porte">
                  <Select value={form.porte} onValueChange={v => setForm({ ...form, porte: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PORTES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Razão social *"><Input value={form.razao_social} onChange={e => setForm({ ...form, razao_social: e.target.value })} maxLength={200} /></Field>
                <Field label="Nome fantasia"><Input value={form.nome_fantasia} onChange={e => setForm({ ...form, nome_fantasia: e.target.value })} maxLength={200} /></Field>
                <Field label="CNPJ"><Input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} maxLength={20} placeholder="00.000.000/0000-00" /></Field>
                <Field label="Segmento"><Input value={form.segmento} onChange={e => setForm({ ...form, segmento: e.target.value })} maxLength={120} placeholder="Ex.: Indústria, Tecnologia…" /></Field>
                <Field label="E-mail corporativo"><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} maxLength={255} /></Field>
                <Field label="Telefone"><Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} maxLength={30} /></Field>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Switch checked={form.ativo} onCheckedChange={v => setForm({ ...form, ativo: v })} />
                <Label>Empresa ativa</Label>
              </div>
            </TabsContent>

            <TabsContent value="responsavel" className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nome do responsável"><Input value={form.responsavel_nome} onChange={e => setForm({ ...form, responsavel_nome: e.target.value })} maxLength={120} /></Field>
                <Field label="E-mail"><Input type="email" value={form.responsavel_email} onChange={e => setForm({ ...form, responsavel_email: e.target.value })} maxLength={255} /></Field>
                <Field label="Telefone"><Input value={form.responsavel_telefone} onChange={e => setForm({ ...form, responsavel_telefone: e.target.value })} maxLength={30} /></Field>
              </div>
            </TabsContent>

            <TabsContent value="contrato" className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Status do contrato">
                  <Select value={form.contrato_status} onValueChange={v => setForm({ ...form, contrato_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CONTRATO_STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Início do contrato"><Input type="date" value={form.contrato_inicio} onChange={e => setForm({ ...form, contrato_inicio: e.target.value })} /></Field>
                <Field label="Renovação"><Input type="date" value={form.contrato_renovacao} onChange={e => setForm({ ...form, contrato_renovacao: e.target.value })} /></Field>
              </div>
              <Field label="Observações"><Textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={3} /></Field>
            </TabsContent>

            <TabsContent value="financeiro" className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Modelo financeiro">
                  <Select value={form.modelo_financeiro} onValueChange={v => setForm({ ...form, modelo_financeiro: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MODELOS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Valor por colaborador (centavos)"><Input type="number" value={form.valor_colaborador_centavos} onChange={e => setForm({ ...form, valor_colaborador_centavos: Number(e.target.value) })} /></Field>
                <Field label="Valor por consulta (centavos)"><Input type="number" value={form.valor_consulta_centavos} onChange={e => setForm({ ...form, valor_consulta_centavos: Number(e.target.value) })} /></Field>
                <Field label="Plano mensal fixo (centavos)"><Input type="number" value={form.plano_mensal_centavos} onChange={e => setForm({ ...form, plano_mensal_centavos: Number(e.target.value) })} /></Field>
                <Field label="Limite consultas/mês"><Input type="number" value={form.limite_consultas_mes ?? ""} onChange={e => setForm({ ...form, limite_consultas_mes: e.target.value ? Number(e.target.value) : null })} placeholder="Sem limite" /></Field>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)}>Cancelar</Button>
            <Button onClick={onSalvar} disabled={saving}>
              {saving ? <Activity className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {openSheetId && (
        <EmpresaSheet id={openSheetId} onClose={() => setOpenSheetId(null)} onEditar={onEditar} />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs">{label}</Label>{children}</div>;
}

function EmpresaSheet({ id, onClose, onEditar }: { id: string; onClose: () => void; onEditar: (id: string) => void }) {
  const { data: empresa } = useQuery({
    queryKey: ["admin", "empresa-detalhe", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("empresas").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <Sheet open onOpenChange={o => !o && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{empresa?.razao_social ?? "Carregando…"}</SheetTitle>
          <SheetDescription>{empresa?.nome_fantasia}</SheetDescription>
        </SheetHeader>
        {empresa && (
          <div className="space-y-4 py-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-muted-foreground">CNPJ</Label><div>{fmtCNPJ(empresa.cnpj)}</div></div>
              <div><Label className="text-xs text-muted-foreground">E-mail</Label><div>{empresa.email || "—"}</div></div>
              <div><Label className="text-xs text-muted-foreground">Telefone</Label><div>{empresa.telefone || "—"}</div></div>
              <div><Label className="text-xs text-muted-foreground">Status</Label><div><Badge variant={empresa.ativo ? "default" : "secondary"}>{empresa.ativo ? "Ativa" : "Inativa"}</Badge></div></div>
            </div>
            {empresa.observacoes && <div><Label className="text-xs text-muted-foreground">Observações</Label><p>{empresa.observacoes}</p></div>}
            <Button onClick={() => { onClose(); onEditar(id); }}>Editar empresa</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
