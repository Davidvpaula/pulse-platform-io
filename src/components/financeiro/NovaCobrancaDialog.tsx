import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validarCobranca } from "@/lib/validation/cobranca";

type PacienteOpt = { id: string; nome_completo: string };
type EmpresaOpt = { id: string; razao_social: string; nome_fantasia: string | null };

interface NovaCobrancaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  title?: string;
}

export function NovaCobrancaDialog({ open, onOpenChange, onCreated, title = "Nova cobrança" }: NovaCobrancaDialogProps) {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [pacienteId, setPacienteId] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [observacao, setObservacao] = useState("");
  const [pacientes, setPacientes] = useState<PacienteOpt[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaOpt[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDescricao(""); setValor(""); setVencimento(""); setPacienteId(""); setEmpresaId(""); setObservacao("");

    if (!pacientes.length) {
      supabase.from("pacientes").select("id,nome_completo").order("nome_completo").limit(500)
        .then(({ data }) => setPacientes((data as PacienteOpt[]) || []));
    }
    if (!empresas.length) {
      supabase.from("empresas").select("id,razao_social,nome_fantasia").order("razao_social").limit(500)
        .then(({ data }) => setEmpresas((data as EmpresaOpt[]) || []));
    }
  }, [open]);

  async function criar() {
    const r = validarCobranca({ descricao, valor, vencimento, observacao, paciente_id: pacienteId, empresa_id: empresaId });
    if (r.ok === false) { toast.error(r.erro); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("cobrancas_links").insert({
        descricao: descricao.trim(),
        valor_centavos: r.valor_centavos,
        vencimento: vencimento || null,
        paciente_id: pacienteId || null,
        observacao: observacao?.trim() || null,
        status: "ativo",
      } as any);
      if (error) throw error;
      toast.success("Cobrança criada");
      onOpenChange(false);
      onCreated();
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar cobrança");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Descrição</Label><Input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex.: Consulta avulsa" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Valor (R$)</Label><Input value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" /></div>
            <div><Label>Vencimento</Label><Input type="date" min={new Date().toISOString().slice(0, 10)} value={vencimento} onChange={e => setVencimento(e.target.value)} /></div>
          </div>
          <div>
            <Label>Paciente (opcional)</Label>
            <Select value={pacienteId} onValueChange={setPacienteId}>
              <SelectTrigger><SelectValue placeholder="Selecione um paciente" /></SelectTrigger>
              <SelectContent>{pacientes.map(p => <SelectItem key={p.id} value={p.id}>{p.nome_completo}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Empresa (opcional)</Label>
            <Select value={empresaId} onValueChange={setEmpresaId}>
              <SelectTrigger><SelectValue placeholder="Selecione uma empresa" /></SelectTrigger>
              <SelectContent>{empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Observação</Label><Textarea value={observacao} onChange={e => setObservacao(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={criar} disabled={submitting}>{submitting ? "Criando..." : "Criar cobrança"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
