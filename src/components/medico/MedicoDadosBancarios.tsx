import { useEffect, useState } from "react";
import { Landmark, Save, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { mascarar } from "@/lib/saques";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DadosBancarios = {
  id?: string;
  tipo_pessoa: string;
  titular_nome: string;
  titular_documento: string;
  banco: string;
  agencia: string;
  conta: string;
  tipo_conta: string;
  pix_tipo: string | null;
  pix_chave: string | null;
};

const EMPTY: DadosBancarios = {
  tipo_pessoa: "pf", titular_nome: "", titular_documento: "",
  banco: "", agencia: "", conta: "", tipo_conta: "corrente",
  pix_tipo: null, pix_chave: null,
};

export function MedicoDadosBancarios({ medicoId }: { medicoId: string }) {
  const [dados, setDados] = useState<DadosBancarios>(EMPTY);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => { load(); }, [medicoId]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("medico_dados_bancarios")
      .select("*")
      .eq("medico_id", medicoId)
      .eq("ativo", true)
      .maybeSingle();
    if (data) {
      setDados(data as any);
      setEditMode(false);
    } else {
      setEditMode(true);
    }
    setLoading(false);
  }

  function upd(k: keyof DadosBancarios, v: any) {
    setDados(prev => ({ ...prev, [k]: v }));
  }

  async function salvar() {
    setSaving(true);
    if (dados.id) {
      const { error } = await supabase
        .from("medico_dados_bancarios")
        .update({
          tipo_pessoa: dados.tipo_pessoa as any,
          titular_nome: dados.titular_nome,
          titular_documento: dados.titular_documento,
          banco: dados.banco,
          agencia: dados.agencia,
          conta: dados.conta,
          tipo_conta: dados.tipo_conta as any,
          pix_tipo: dados.pix_tipo as any,
          pix_chave: dados.pix_chave,
        })
        .eq("id", dados.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase
        .from("medico_dados_bancarios")
        .insert({
          medico_id: medicoId,
          tipo_pessoa: dados.tipo_pessoa as any,
          titular_nome: dados.titular_nome,
          titular_documento: dados.titular_documento,
          banco: dados.banco,
          agencia: dados.agencia,
          conta: dados.conta,
          tipo_conta: dados.tipo_conta as any,
          pix_tipo: dados.pix_tipo as any,
          pix_chave: dados.pix_chave,
        });
      if (error) { toast.error(error.message); setSaving(false); return; }
    }
    toast.success("Dados bancários salvos");
    setSaving(false);
    setEditMode(false);
    await load();
  }

  if (loading) return <p className="text-sm text-muted-foreground p-6">Carregando…</p>;

  const readonly = !editMode;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-info/30 bg-info/5 p-3 flex items-start gap-2">
        <ShieldAlert className="h-4 w-4 text-info mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          Esses dados são usados <b>exclusivamente</b> para repasse financeiro. São protegidos por criptografia e auditoria.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Tipo de recebedor</Label>
          <Select value={dados.tipo_pessoa} onValueChange={v => upd("tipo_pessoa", v)} disabled={readonly}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pf">Pessoa Física</SelectItem>
              <SelectItem value="pj">Pessoa Jurídica</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Nome do titular</Label>
          <Input value={dados.titular_nome} onChange={e => upd("titular_nome", e.target.value)} disabled={readonly} />
        </div>
        <div>
          <Label>{dados.tipo_pessoa === "pj" ? "CNPJ" : "CPF"} do titular</Label>
          <Input
            value={readonly ? mascarar(dados.titular_documento) : dados.titular_documento}
            onChange={e => upd("titular_documento", e.target.value)}
            disabled={readonly}
          />
        </div>
        <div>
          <Label>Banco</Label>
          <Input value={dados.banco} onChange={e => upd("banco", e.target.value)} disabled={readonly} placeholder="Ex: 001 - Banco do Brasil" />
        </div>
        <div>
          <Label>Agência</Label>
          <Input value={readonly ? mascarar(dados.agencia) : dados.agencia} onChange={e => upd("agencia", e.target.value)} disabled={readonly} />
        </div>
        <div>
          <Label>Conta</Label>
          <Input value={readonly ? mascarar(dados.conta) : dados.conta} onChange={e => upd("conta", e.target.value)} disabled={readonly} />
        </div>
        <div>
          <Label>Tipo de conta</Label>
          <Select value={dados.tipo_conta} onValueChange={v => upd("tipo_conta", v)} disabled={readonly}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="corrente">Conta Corrente</SelectItem>
              <SelectItem value="poupanca">Conta Poupança</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tipo de chave Pix</Label>
          <Select value={dados.pix_tipo ?? ""} onValueChange={v => upd("pix_tipo", v || null)} disabled={readonly}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cpf">CPF</SelectItem>
              <SelectItem value="cnpj">CNPJ</SelectItem>
              <SelectItem value="email">E-mail</SelectItem>
              <SelectItem value="telefone">Telefone</SelectItem>
              <SelectItem value="aleatoria">Aleatória</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label>Chave Pix</Label>
          <Input
            value={readonly ? mascarar(dados.pix_chave ?? "") : (dados.pix_chave ?? "")}
            onChange={e => upd("pix_chave", e.target.value)}
            disabled={readonly}
          />
        </div>
      </div>

      <div className="flex gap-2">
        {readonly ? (
          <Button variant="outline" onClick={() => setEditMode(true)}>
            <Landmark className="mr-2 h-4 w-4" /> Editar dados bancários
          </Button>
        ) : (
          <>
            <Button onClick={() => setConfirmOpen(true)} disabled={saving} className="bg-gradient-primary hover:opacity-90">
              <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando…" : "Salvar"}
            </Button>
            {dados.id && (
              <Button variant="ghost" onClick={() => { load(); setEditMode(false); }}>Cancelar</Button>
            )}
          </>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração</AlertDialogTitle>
            <AlertDialogDescription>
              Alterações em dados bancários são registradas em auditoria. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmOpen(false); salvar(); }}>
              Confirmar e salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
