import { useEffect, useMemo, useState } from "react";
import {
  Building2, Plus, Search, Loader2, AlertTriangle, Wallet, Users, FileText,
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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
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

// ---------------- Constantes ----------------
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

// ---------------- Tipos ----------------
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

// ---------------- Página ----------------
export default function AdminEmpresas() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<EmpresaOverview[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");

  // Modal Nova / Editar
  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmpresaForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Drawer ficha
  const [openSheetId, setOpenSheetId] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_empresas_overview" as any);
    if (error) toast.error("Erro ao carregar empresas", { description: error.message });
    else setRows((data ?? []) as EmpresaOverview[]);
    setLoading(false);
  };
  useEffect(() => { carregar(); }, []);

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

  // KPIs topo
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
      segmento: (data as any).segmento ?? "",
      porte: (data as any).porte ?? "pequena",
      tipo_empresa: (data as any).tipo_empresa ?? "contratante",
      email: data.email ?? "",
      telefone: data.telefone ?? "",
      responsavel_nome: (data as any).responsavel_nome ?? "",
      responsavel_email: (data as any).responsavel_email ?? "",
      responsavel_telefone: (data as any).responsavel_telefone ?? "",
      modelo_financeiro: (data as any).modelo_financeiro ?? "por_consulta",
      valor_colaborador_centavos: (data as any).valor_colaborador_centavos ?? 0,
      valor_consulta_centavos: (data as any).valor_consulta_centavos ?? 0,
      plano_mensal_centavos: (data as any).plano_mensal_centavos ?? 0,
      limite_consultas_mes: (data as any).limite_consultas_mes ?? null,
      contrato_status: (data as any).contrato_status ?? "rascunho",
      contrato_inicio: (data as any).contrato_inicio ?? "",
      contrato_renovacao: (data as any).contrato_renovacao ?? "",
      observacoes: data.observacoes ?? "",
      ativo: data.ativo,
    });
    setOpenForm(true);
  };

  const onSalvar = async () => {
    if (!form.razao_social.trim()) { toast.error("Razão social obrigatória"); return; }
    setSaving(true);
    const payload: any = {
      ...form,
      cnpj: form.cnpj ? form.cnpj.replace(/\D/g, "") : null,
      contrato_inicio: form.contrato_inicio || null,
      contrato_renovacao: form.contrato_renovacao || null,
      limite_consultas_mes: form.limite_consultas_mes || null,
    };
    const { error } = editingId
      ? await supabase.from("empresas").update(payload).eq("id", editingId)
      : await supabase.from("empresas").insert(payload);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar", { description: error.message }); return; }
    toast.success(editingId ? "Empresa atualizada" : "Empresa criada");
    setOpenForm(false);
    carregar();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Empresas B2B"
        description="Gestão completa de empresas contratantes, clínicas parceiras e parceiros de saúde ocupacional."
        actions={
          <Button onClick={onCriar}>
            <Plus className="mr-2 h-4 w-4" /> Nova empresa
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Empresas cadastradas" value={String(kpis.total)} icon={Building2} />
        <StatCard label="Ativas" value={String(kpis.ativas)} icon={Power} />
        <StatCard label="Inadimplentes" value={String(kpis.inadimplentes)} icon={AlertTriangle} hint="Faturas em atraso" />
        <StatCard label="Faturamento do mês" value={fmtBRL(kpis.faturamento)} icon={Wallet} />
      </div>

      {/* Filtros */}
      <div className="card-elevated flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome, CNPJ ou responsável…"
            value={busca} onChange={e => setBusca(e.target.value)} />
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

      {/* Tabela */}
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
            {loading && (
              <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">
                <Loader2 className="inline h-4 w-4 animate-spin mr-2" />Carregando…
              </td></tr>
            )}
            {!loading && filtradas.length === 0 && (
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

      {/* Modal Nova/Editar */}
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
                    <SelectContent>{CONTRATO_STATUS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Data de início"><Input type="date" value={form.contrato_inicio} onChange={e => setForm({ ...form, contrato_inicio: e.target.value })} /></Field>
                <Field label="Renovação"><Input type="date" value={form.contrato_renovacao} onChange={e => setForm({ ...form, contrato_renovacao: e.target.value })} /></Field>
              </div>
              <Field label="Observações">
                <Textarea rows={3} value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} maxLength={1000} />
              </Field>
            </TabsContent>

            <TabsContent value="financeiro" className="space-y-3 pt-3">
              <Field label="Modelo financeiro">
                <Select value={form.modelo_financeiro} onValueChange={v => setForm({ ...form, modelo_financeiro: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MODELOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Valor por colaborador (R$)">
                  <Input type="number" min={0} value={form.valor_colaborador_centavos / 100}
                    onChange={e => setForm({ ...form, valor_colaborador_centavos: Math.round(Number(e.target.value || 0) * 100) })} />
                </Field>
                <Field label="Valor por consulta (R$)">
                  <Input type="number" min={0} value={form.valor_consulta_centavos / 100}
                    onChange={e => setForm({ ...form, valor_consulta_centavos: Math.round(Number(e.target.value || 0) * 100) })} />
                </Field>
                <Field label="Plano mensal fixo (R$)">
                  <Input type="number" min={0} value={form.plano_mensal_centavos / 100}
                    onChange={e => setForm({ ...form, plano_mensal_centavos: Math.round(Number(e.target.value || 0) * 100) })} />
                </Field>
                <Field label="Limite de consultas/mês (opcional)">
                  <Input type="number" min={0} value={form.limite_consultas_mes ?? ""}
                    onChange={e => setForm({ ...form, limite_consultas_mes: e.target.value ? Number(e.target.value) : null })} />
                </Field>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)}>Cancelar</Button>
            <Button onClick={onSalvar} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {editingId ? "Salvar" : "Criar empresa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drawer ficha */}
      {openSheetId && (
        <EmpresaSheet
          empresaId={openSheetId}
          onClose={() => { setOpenSheetId(null); carregar(); }}
        />
      )}
    </div>
  );
}

// ---------------- Field helper ----------------
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs">{label}</Label>
    {children}
  </div>
);

// ---------------- Drawer / ficha ----------------
function EmpresaSheet({ empresaId, onClose }: { empresaId: string; onClose: () => void }) {
  const [empresa, setEmpresa] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [modulos, setModulos] = useState<Record<string, boolean>>({});
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [faturas, setFaturas] = useState<any[]>([]);
  const [auditoria, setAuditoria] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    const [e, ov, mods, fns, fts, aud] = await Promise.all([
      supabase.from("empresas").select("*").eq("id", empresaId).maybeSingle(),
      supabase.rpc("empresa_visao_geral" as any, { _empresa_id: empresaId }),
      supabase.from("empresas_modulos").select("modulo_key,ativo").eq("empresa_id", empresaId),
      supabase.from("empresas_funcionarios").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false }).limit(200),
      supabase.from("empresas_faturas").select("*").eq("empresa_id", empresaId).order("competencia_ano", { ascending: false }).order("competencia_mes", { ascending: false }),
      supabase.from("empresas_auditoria").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false }).limit(50),
    ]);
    setEmpresa(e.data);
    setOverview(ov.data);
    const mm: Record<string, boolean> = {};
    (mods.data ?? []).forEach((m: any) => { mm[m.modulo_key] = m.ativo; });
    setModulos(mm);
    setFuncionarios(fns.data ?? []);
    setFaturas(fts.data ?? []);
    setAuditoria(aud.data ?? []);
    setLoading(false);
  };
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [empresaId]);

  const toggleModulo = async (key: string, ativo: boolean) => {
    const { error } = await supabase.rpc("empresa_toggle_modulo" as any, {
      _empresa_id: empresaId, _modulo_key: key, _ativo: ativo,
    });
    if (error) { toast.error("Falha ao atualizar módulo", { description: error.message }); return; }
    setModulos(m => ({ ...m, [key]: ativo }));
    toast.success(`Módulo ${ativo ? "ativado" : "desativado"}`);
  };

  return (
    <Sheet open onOpenChange={open => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {empresa?.razao_social ?? "Carregando…"}
          </SheetTitle>
          <SheetDescription>{empresa?.nome_fantasia ?? fmtCNPJ(empresa?.cnpj)}</SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="py-20 text-center text-muted-foreground">
            <Loader2 className="inline h-5 w-5 animate-spin" />
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3 mt-4 lg:grid-cols-4">
              <MiniKpi icon={Users} label="Funcionários" value={overview?.kpis?.funcionarios_ativos ?? 0} />
              <MiniKpi icon={Activity} label="Consultas/mês" value={overview?.kpis?.consultas_mes ?? 0} />
              <MiniKpi icon={Wallet} label="Faturamento" value={fmtBRL(overview?.kpis?.faturamento_mes_centavos ?? 0)} />
              <MiniKpi icon={Receipt} label="Em aberto" value={fmtBRL(overview?.kpis?.fatura_em_aberto_centavos ?? 0)} />
            </div>

            {/* Alertas */}
            {(overview?.alertas?.length ?? 0) > 0 && (
              <div className="mt-4 space-y-2">
                {overview.alertas.map((a: any, i: number) => (
                  <div key={i} className={cn(
                    "flex gap-3 rounded-lg border-l-4 p-3 bg-card",
                    a.tone === "destructive" && "border-l-destructive",
                    a.tone === "warning" && "border-l-warning",
                    a.tone === "info" && "border-l-info",
                  )}>
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{a.titulo}</p>
                      <p className="text-xs text-muted-foreground">{a.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Tabs defaultValue="modulos" className="mt-6">
              <TabsList className="w-full justify-start flex-wrap h-auto">
                <TabsTrigger value="modulos"><Settings2 className="h-3.5 w-3.5 mr-1" />Módulos</TabsTrigger>
                <TabsTrigger value="funcionarios"><Users className="h-3.5 w-3.5 mr-1" />Funcionários</TabsTrigger>
                <TabsTrigger value="faturas"><Receipt className="h-3.5 w-3.5 mr-1" />Faturas</TabsTrigger>
                <TabsTrigger value="auditoria"><FileText className="h-3.5 w-3.5 mr-1" />Auditoria</TabsTrigger>
              </TabsList>

              {/* MÓDULOS */}
              <TabsContent value="modulos" className="space-y-2 pt-3">
                {MODULOS.map(m => (
                  <div key={m.key} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium">{m.label}</p>
                      <p className="text-xs text-muted-foreground">{m.key}</p>
                    </div>
                    <Switch
                      checked={!!modulos[m.key]}
                      onCheckedChange={v => toggleModulo(m.key, v)}
                    />
                  </div>
                ))}
              </TabsContent>

              {/* FUNCIONÁRIOS */}
              <TabsContent value="funcionarios" className="pt-3">
                <FuncionariosTab empresaId={empresaId} funcionarios={funcionarios} reload={carregar} />
              </TabsContent>

              {/* FATURAS */}
              <TabsContent value="faturas" className="pt-3">
                <FaturasTab empresaId={empresaId} faturas={faturas} reload={carregar} />
              </TabsContent>

              {/* AUDITORIA */}
              <TabsContent value="auditoria" className="pt-3 space-y-2">
                {auditoria.length === 0 && <p className="text-sm text-muted-foreground">Sem registros.</p>}
                {auditoria.map(a => (
                  <div key={a.id} className="rounded-lg border border-border p-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="font-medium">{a.acao}</span>
                      <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR")}</span>
                    </div>
                    {a.campo && <div className="text-muted-foreground mt-1">{a.campo}: {a.valor_anterior ?? "—"} → {a.valor_novo ?? "—"}</div>}
                    {a.motivo && <div className="text-muted-foreground italic mt-1">"{a.motivo}"</div>}
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

const MiniKpi = ({ icon: Icon, label, value }: { icon: any; label: string; value: any }) => (
  <div className="rounded-lg border border-border bg-card p-3">
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />{label}
    </div>
    <p className="mt-1 text-lg font-semibold">{value}</p>
  </div>
);

// ---------------- Funcionários ----------------
function FuncionariosTab({ empresaId, funcionarios, reload }: { empresaId: string; funcionarios: any[]; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [novo, setNovo] = useState({ nome: "", cpf: "", email: "", telefone: "", setor: "", cargo: "", matricula: "" });
  const [csvText, setCsvText] = useState("");
  const [saving, setSaving] = useState(false);

  const adicionar = async () => {
    if (!novo.nome.trim()) { toast.error("Nome obrigatório"); return; }
    setSaving(true);
    const { error } = await supabase.from("empresas_funcionarios").insert({
      empresa_id: empresaId, ...novo,
      cpf: novo.cpf ? novo.cpf.replace(/\D/g, "") : null,
    });
    setSaving(false);
    if (error) { toast.error("Erro ao adicionar", { description: error.message }); return; }
    toast.success("Funcionário adicionado");
    setOpen(false);
    setNovo({ nome: "", cpf: "", email: "", telefone: "", setor: "", cargo: "", matricula: "" });
    reload();
  };

  const importarCSV = async () => {
    const linhas = csvText.trim().split(/\r?\n/).filter(Boolean);
    if (linhas.length === 0) { toast.error("Cole o conteúdo do CSV"); return; }
    // header: nome,cpf,email,telefone,setor,cargo,matricula
    const [header, ...rows] = linhas;
    const cols = header.split(",").map(c => c.trim().toLowerCase());
    const idx = (k: string) => cols.indexOf(k);
    const payload = rows.map(r => {
      const v = r.split(",").map(x => x.trim());
      return {
        empresa_id: empresaId,
        nome: v[idx("nome")] ?? "",
        cpf: idx("cpf") >= 0 ? (v[idx("cpf")] ?? "").replace(/\D/g, "") || null : null,
        email: idx("email") >= 0 ? v[idx("email")] || null : null,
        telefone: idx("telefone") >= 0 ? v[idx("telefone")] || null : null,
        setor: idx("setor") >= 0 ? v[idx("setor")] || null : null,
        cargo: idx("cargo") >= 0 ? v[idx("cargo")] || null : null,
        matricula: idx("matricula") >= 0 ? v[idx("matricula")] || null : null,
        origem: "csv",
        importado_em: new Date().toISOString(),
      };
    }).filter(p => p.nome);
    if (payload.length === 0) { toast.error("Nenhuma linha válida"); return; }
    setSaving(true);
    const { error } = await supabase.from("empresas_funcionarios").insert(payload);
    setSaving(false);
    if (error) { toast.error("Erro ao importar", { description: error.message }); return; }
    toast.success(`${payload.length} funcionário(s) importado(s)`);
    setCsvOpen(false); setCsvText(""); reload();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-3.5 w-3.5" />Adicionar</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo funcionário</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome *"><Input value={novo.nome} onChange={e => setNovo({ ...novo, nome: e.target.value })} maxLength={150} /></Field>
              <Field label="CPF"><Input value={novo.cpf} onChange={e => setNovo({ ...novo, cpf: e.target.value })} maxLength={14} /></Field>
              <Field label="E-mail"><Input value={novo.email} onChange={e => setNovo({ ...novo, email: e.target.value })} maxLength={255} /></Field>
              <Field label="Telefone"><Input value={novo.telefone} onChange={e => setNovo({ ...novo, telefone: e.target.value })} maxLength={30} /></Field>
              <Field label="Setor"><Input value={novo.setor} onChange={e => setNovo({ ...novo, setor: e.target.value })} maxLength={100} /></Field>
              <Field label="Cargo"><Input value={novo.cargo} onChange={e => setNovo({ ...novo, cargo: e.target.value })} maxLength={100} /></Field>
              <Field label="Matrícula"><Input value={novo.matricula} onChange={e => setNovo({ ...novo, matricula: e.target.value })} maxLength={50} /></Field>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={adicionar} disabled={saving}>Adicionar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
          <DialogTrigger asChild><Button size="sm" variant="outline">Importar CSV</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Importar funcionários (CSV)</DialogTitle>
              <DialogDescription>Cabeçalhos suportados: nome, cpf, email, telefone, setor, cargo, matricula</DialogDescription>
            </DialogHeader>
            <Textarea rows={10} className="font-mono text-xs" value={csvText} onChange={e => setCsvText(e.target.value)}
              placeholder="nome,cpf,email,setor,cargo,matricula&#10;João Silva,12345678901,joao@empresa.com,RH,Analista,1001" />
            <DialogFooter>
              <Button variant="outline" onClick={() => setCsvOpen(false)}>Cancelar</Button>
              <Button onClick={importarCSV} disabled={saving}>Importar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Nome</th>
              <th className="text-left">Setor</th>
              <th className="text-left">Cargo</th>
              <th className="text-left">Matrícula</th>
              <th className="text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {funcionarios.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Nenhum funcionário cadastrado.</td></tr>
            )}
            {funcionarios.map(f => (
              <tr key={f.id} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{f.nome}</td>
                <td className="text-muted-foreground">{f.setor ?? "—"}</td>
                <td className="text-muted-foreground">{f.cargo ?? "—"}</td>
                <td className="text-muted-foreground">{f.matricula ?? "—"}</td>
                <td><Badge variant="outline" className="capitalize">{f.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------- Faturas ----------------
function FaturasTab({ empresaId, faturas, reload }: { empresaId: string; faturas: any[]; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const hoje = new Date();
  const [nova, setNova] = useState({
    competencia_mes: hoje.getMonth() + 1,
    competencia_ano: hoje.getFullYear(),
    vencimento: new Date(hoje.getFullYear(), hoje.getMonth(), 10).toISOString().slice(0, 10),
    valor_total_centavos: 0,
    qtd_funcionarios: 0,
    qtd_consultas: 0,
    observacoes: "",
  });

  const criar = async () => {
    setSaving(true);
    const { error } = await supabase.from("empresas_faturas").insert({
      empresa_id: empresaId, ...nova,
    });
    setSaving(false);
    if (error) { toast.error("Erro ao criar fatura", { description: error.message }); return; }
    toast.success("Fatura criada");
    setOpen(false); reload();
  };

  const marcarPaga = async (id: string) => {
    const { error } = await supabase.from("empresas_faturas").update({
      status: "paga", pago_em: new Date().toISOString(),
    }).eq("id", id);
    if (error) { toast.error("Falha", { description: error.message }); return; }
    toast.success("Fatura marcada como paga"); reload();
  };

  return (
    <div className="space-y-3">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-3.5 w-3.5" />Nova fatura</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova fatura mensal</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mês"><Input type="number" min={1} max={12} value={nova.competencia_mes}
              onChange={e => setNova({ ...nova, competencia_mes: Number(e.target.value) })} /></Field>
            <Field label="Ano"><Input type="number" value={nova.competencia_ano}
              onChange={e => setNova({ ...nova, competencia_ano: Number(e.target.value) })} /></Field>
            <Field label="Vencimento"><Input type="date" value={nova.vencimento}
              onChange={e => setNova({ ...nova, vencimento: e.target.value })} /></Field>
            <Field label="Valor total (R$)"><Input type="number" min={0} value={nova.valor_total_centavos / 100}
              onChange={e => setNova({ ...nova, valor_total_centavos: Math.round(Number(e.target.value || 0) * 100) })} /></Field>
            <Field label="Funcionários cobrados"><Input type="number" min={0} value={nova.qtd_funcionarios}
              onChange={e => setNova({ ...nova, qtd_funcionarios: Number(e.target.value) })} /></Field>
            <Field label="Consultas no período"><Input type="number" min={0} value={nova.qtd_consultas}
              onChange={e => setNova({ ...nova, qtd_consultas: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Observações">
            <Textarea rows={3} value={nova.observacoes} maxLength={500}
              onChange={e => setNova({ ...nova, observacoes: e.target.value })} />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={criar} disabled={saving}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Competência</th>
              <th className="text-left">Vencimento</th>
              <th className="text-right">Valor</th>
              <th className="text-left pl-4">Status</th>
              <th className="text-right pr-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {faturas.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Nenhuma fatura.</td></tr>
            )}
            {faturas.map(f => (
              <tr key={f.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs">{String(f.competencia_mes).padStart(2, "0")}/{f.competencia_ano}</td>
                <td className="text-muted-foreground">{new Date(f.vencimento).toLocaleDateString("pt-BR")}</td>
                <td className="text-right tabular-nums">{fmtBRL(f.valor_total_centavos)}</td>
                <td className="pl-4">
                  <Badge variant={
                    f.status === "paga" ? "default" :
                    f.status === "atrasada" ? "destructive" :
                    f.status === "cancelada" ? "secondary" : "outline"
                  } className="capitalize">{f.status.replace("_", " ")}</Badge>
                </td>
                <td className="pr-3 text-right">
                  {f.status !== "paga" && f.status !== "cancelada" && (
                    <Button size="sm" variant="ghost" onClick={() => marcarPaga(f.id)}>Marcar paga</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
