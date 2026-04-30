import { useEffect, useState, useCallback } from "react";
import { Link2, RefreshCw, Loader2, Download } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const brl = (c: number) => ((c || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmt = (s?: string | null) => s ? new Date(s).toLocaleString("pt-BR") : "—";

export default function SecretariaFinanceiro() {
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [podeCobrar, setPodeCobrar] = useState(false);
  const [podeVer, setPodeVer] = useState(false);

  const [pacientesOpts, setPacientesOpts] = useState<any[]>([]);
  const [empresasOpts, setEmpresasOpts] = useState<any[]>([]);
  const [nova, setNova] = useState({ open: false, descricao: "", valor: "", vencimento: "", paciente_id: "", empresa_id: "", observacao: "" });

  const checarPermissoes = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const [{ data: p1 }, { data: p2 }] = await Promise.all([
      supabase.rpc("has_permission" as any, { _user_id: u.user.id, _key: "financeiro.ver" }),
      supabase.rpc("has_permission" as any, { _user_id: u.user.id, _key: "financeiro.cobrar" }),
    ]);
    setPodeVer(!!p1);
    setPodeCobrar(!!p2);
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const { data: p } = await supabase.from("pagamentos").select("*").order("created_at", { ascending: false }).limit(100);
      setPagamentos(p || []);
      const { data: l } = await supabase.from("cobrancas_links").select("*").order("created_at", { ascending: false }).limit(100);
      setLinks(l || []);
    } catch (e: any) { toast.error(e.message || "Erro ao carregar"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { checarPermissoes(); carregar(); }, [checarPermissoes, carregar]);

  async function abrirNova() {
    setNova({ open: true, descricao: "", valor: "", vencimento: "", paciente_id: "", empresa_id: "", observacao: "" });
    if (!pacientesOpts.length) {
      const { data: pac } = await supabase.from("pacientes").select("id,nome").order("nome").limit(500);
      setPacientesOpts(pac || []);
    }
    if (!empresasOpts.length) {
      const { data: emp } = await supabase.from("empresas").select("id,razao_social,nome_fantasia").order("razao_social").limit(500);
      setEmpresasOpts(emp || []);
    }
  }

  async function criar() {
    const v = Number(nova.valor.replace(",", "."));
    if (!nova.descricao.trim() || !v || v <= 0) { toast.error("Informe descrição e valor válido"); return; }
    try {
      const { error } = await supabase.from("cobrancas_links").insert({
        descricao: nova.descricao,
        valor_centavos: Math.round(v * 100),
        vencimento: nova.vencimento || null,
        paciente_id: nova.paciente_id || null,
        observacao: nova.observacao || null,
        status: "ativo",
      } as any);
      if (error) throw error;
      toast.success("Cobrança criada");
      setNova(s => ({ ...s, open: false }));
      carregar();
    } catch (e: any) { toast.error(e.message || "Erro"); }
  }

  if (!podeVer && !podeCobrar) {
    return (
      <div className="space-y-6">
        <PageHeader title="Financeiro" description="Cobranças e pagamentos" />
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          Você não tem permissão financeira atribuída. Solicite ao administrador as permissões <code>financeiro.ver</code> ou <code>financeiro.cobrar</code>.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Financeiro" description="Pagamentos pendentes e cobranças" />

      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}Atualizar
        </Button>
        {podeCobrar && <Button size="sm" onClick={abrirNova}><Link2 className="h-4 w-4 mr-2" />Nova cobrança</Button>}
      </div>

      <Tabs defaultValue="pagamentos">
        <TabsList>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          <TabsTrigger value="links">Cobranças / Links</TabsTrigger>
        </TabsList>
        <TabsContent value="pagamentos">
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40"><tr><th className="text-left p-2">Valor</th><th className="text-left p-2">Status</th><th className="text-left p-2">Forma</th><th className="text-left p-2">Pago em</th><th className="text-left p-2">Criado em</th></tr></thead>
              <tbody>
                {pagamentos.map(p => (
                  <tr key={p.id} className="border-t">
                    <td className="p-2">{brl(p.valor_bruto_centavos || p.valor_centavos)}</td>
                    <td className="p-2"><Badge variant="outline">{p.status}</Badge></td>
                    <td className="p-2">{p.metodo || p.forma || "—"}</td>
                    <td className="p-2">{fmt(p.data_pagamento || p.paid_at)}</td>
                    <td className="p-2">{fmt(p.created_at)}</td>
                  </tr>
                ))}
                {!pagamentos.length && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Nenhum pagamento</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="links">
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40"><tr><th className="text-left p-2">Descrição</th><th className="text-left p-2">Valor</th><th className="text-left p-2">Vencimento</th><th className="text-left p-2">Status</th><th className="text-left p-2">Criado em</th></tr></thead>
              <tbody>
                {links.map(l => (
                  <tr key={l.id} className="border-t">
                    <td className="p-2">{l.descricao}</td>
                    <td className="p-2">{brl(l.valor_centavos)}</td>
                    <td className="p-2">{l.vencimento || "—"}</td>
                    <td className="p-2"><Badge variant="outline">{l.status}</Badge></td>
                    <td className="p-2">{fmt(l.created_at)}</td>
                  </tr>
                ))}
                {!links.length && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Nenhuma cobrança</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={nova.open} onOpenChange={o => setNova(s => ({ ...s, open: o }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova cobrança</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Descrição</Label><Input value={nova.descricao} onChange={e => setNova(s => ({ ...s, descricao: e.target.value }))} placeholder="Ex.: Consulta avulsa" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Valor (R$)</Label><Input value={nova.valor} onChange={e => setNova(s => ({ ...s, valor: e.target.value }))} placeholder="0,00" /></div>
              <div><Label>Vencimento</Label><Input type="date" value={nova.vencimento} onChange={e => setNova(s => ({ ...s, vencimento: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Paciente (opcional)</Label>
              <Select value={nova.paciente_id} onValueChange={v => setNova(s => ({ ...s, paciente_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{pacientesOpts.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Empresa (opcional)</Label>
              <Select value={nova.empresa_id} onValueChange={v => setNova(s => ({ ...s, empresa_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{empresasOpts.map(e => <SelectItem key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Observação</Label><Textarea value={nova.observacao} onChange={e => setNova(s => ({ ...s, observacao: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNova(s => ({ ...s, open: false }))}>Cancelar</Button>
            <Button onClick={criar}>Criar cobrança</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
