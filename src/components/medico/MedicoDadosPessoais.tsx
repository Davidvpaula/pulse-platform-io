import { useEffect, useState } from "react";
import { Save, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { MedicoRow } from "@/lib/clinico";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Endereco = {
  id?: string;
  cep: string; rua: string; numero: string; complemento: string;
  bairro: string; cidade: string; estado: string;
};
const EMPTY_END: Endereco = { cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "" };

/** Formata CPF visualmente: 000.000.000-00 */
function formatCpf(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;

function EnderecoForm({ label, value, onChange, disabled }: {
  label: string; value: Endereco; onChange: (v: Endereco) => void; disabled?: boolean;
}) {
  const upd = (k: keyof Endereco, v: string) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">{label}</h4>
      <div className="grid gap-3 md:grid-cols-3">
        <div><Label>CEP</Label><Input value={value.cep} onChange={e => upd("cep", e.target.value)} disabled={disabled} /></div>
        <div className="md:col-span-2"><Label>Rua</Label><Input value={value.rua} onChange={e => upd("rua", e.target.value)} disabled={disabled} /></div>
        <div><Label>Número</Label><Input value={value.numero} onChange={e => upd("numero", e.target.value)} disabled={disabled} /></div>
        <div><Label>Complemento</Label><Input value={value.complemento} onChange={e => upd("complemento", e.target.value)} disabled={disabled} /></div>
        <div><Label>Bairro</Label><Input value={value.bairro} onChange={e => upd("bairro", e.target.value)} disabled={disabled} /></div>
        <div><Label>Cidade</Label><Input value={value.cidade} onChange={e => upd("cidade", e.target.value)} disabled={disabled} /></div>
        <div><Label>Estado</Label><Input value={value.estado} onChange={e => upd("estado", e.target.value)} disabled={disabled} maxLength={2} /></div>
      </div>
    </div>
  );
}

export function MedicoDadosPessoais({ medico }: { medico: MedicoRow }) {
  const [nome, setNome] = useState(medico.nome ?? "");
  const [dataNasc, setDataNasc] = useState(medico.data_nascimento ?? "");
  const [telefone, setTelefone] = useState(medico.telefone ?? "");
  const [rqe, setRqe] = useState(medico.rqe ?? "");
  const [sexo, setSexo] = useState((medico as any).sexo ?? "");
  const [crm, setCrm] = useState(medico.crm ?? "");
  const [crmEstado, setCrmEstado] = useState(medico.crm_estado ?? "");
  const [especialidade, setEspecialidade] = useState(medico.especialidade ?? "");
  const [endRes, setEndRes] = useState<Endereco>(EMPTY_END);
  const [endCom, setEndCom] = useState<Endereco>(EMPTY_END);
  const [usarComercial, setUsarComercial] = useState(false);
  const [saving, setSaving] = useState(false);

  // Troca de email
  const [novoEmail, setNovoEmail] = useState("");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [trocandoEmail, setTrocandoEmail] = useState(false);

  useEffect(() => {
    loadEnderecos();
  }, [medico.id]);

  async function loadEnderecos() {
    const { data } = await supabase
      .from("medico_enderecos")
      .select("*")
      .eq("medico_id", medico.id);
    for (const row of data ?? []) {
      const e: Endereco = {
        id: row.id,
        cep: row.cep ?? "", rua: row.rua ?? "", numero: row.numero ?? "",
        complemento: row.complemento ?? "", bairro: row.bairro ?? "",
        cidade: row.cidade ?? "", estado: row.estado ?? "",
      };
      if (row.tipo === "residencial") setEndRes(e);
      if (row.tipo === "comercial") { setEndCom(e); setUsarComercial(true); }
    }
  }

  async function salvar() {
    setSaving(true);
    const { error: medErr } = await supabase.from("medicos").update({
      nome: nome.trim() || medico.nome,
      data_nascimento: dataNasc || null,
      telefone: telefone.trim() || null,
      rqe: rqe.trim() || null,
      sexo: sexo || null,
    } as any).eq("id", medico.id);
    if (medErr) { toast.error(medErr.message); setSaving(false); return; }

    await upsertEndereco(medico.id, "residencial", endRes);
    if (usarComercial) {
      await upsertEndereco(medico.id, "comercial", endCom);
    }

    toast.success("Dados pessoais salvos");
    setSaving(false);
  }

  async function upsertEndereco(medicoId: string, tipo: string, end: Endereco) {
    const payload = {
      medico_id: medicoId,
      tipo: tipo as any,
      cep: end.cep || null,
      rua: end.rua || null,
      numero: end.numero || null,
      complemento: end.complemento || null,
      bairro: end.bairro || null,
      cidade: end.cidade || null,
      estado: end.estado || null,
    };
    if (end.id) {
      await supabase.from("medico_enderecos").update(payload).eq("id", end.id);
    } else {
      await supabase.from("medico_enderecos").insert(payload);
    }
  }

  async function trocarEmail() {
    const email = novoEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Informe um email válido.");
      return;
    }
    setTrocandoEmail(true);
    const { error } = await supabase.auth.updateUser({ email });
    setTrocandoEmail(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Email de confirmação enviado para o novo endereço. Verifique sua caixa de entrada.");
    setEmailDialogOpen(false);
    setNovoEmail("");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div><Label>Nome completo</Label><Input value={nome} onChange={e => setNome(e.target.value)} /></div>
        <div>
          <Label>E-mail</Label>
          <div className="flex gap-2">
            <Input value={medico.email} disabled className="flex-1" />
            <Button variant="outline" size="sm" onClick={() => setEmailDialogOpen(true)} className="shrink-0">
              <Mail className="mr-1.5 h-3.5 w-3.5" /> Alterar
            </Button>
          </div>
        </div>
        <div>
          <Label>CPF</Label>
          <Input value={formatCpf(medico.cpf ?? "")} disabled className="bg-muted/50" />
          <p className="mt-1 text-[11px] text-muted-foreground">CPF não pode ser alterado após o cadastro.</p>
        </div>
        <div><Label>Data de nascimento</Label><Input type="date" value={dataNasc} onChange={e => setDataNasc(e.target.value)} /></div>
        <div><Label>Telefone</Label><Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(00) 00000-0000" /></div>
        <div><Label>CRM</Label><Input value={`${medico.crm} / ${medico.crm_estado}`} disabled /></div>
        <div><Label>Especialidade</Label><Input value={medico.especialidade} disabled /></div>
        <div><Label>RQE</Label><Input value={rqe} onChange={e => setRqe(e.target.value)} placeholder="Opcional" /></div>
        <div>
          <Label>Sexo</Label>
          <Select value={sexo} onValueChange={setSexo}>
            <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="masculino">Masculino</SelectItem>
              <SelectItem value="feminino">Feminino</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
              <SelectItem value="prefiro_nao_informar">Prefiro não informar</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Status do cadastro</Label><Input value={medico.status} disabled className="capitalize" /></div>
      </div>

      <EnderecoForm label="Endereço residencial" value={endRes} onChange={setEndRes} />

      <div className="flex items-center gap-2">
        <Checkbox
          id="usar-comercial"
          checked={usarComercial}
          onCheckedChange={v => setUsarComercial(!!v)}
        />
        <label htmlFor="usar-comercial" className="text-sm">Usar endereço comercial diferente</label>
      </div>

      {usarComercial && (
        <EnderecoForm label="Endereço comercial" value={endCom} onChange={setEndCom} />
      )}

      <Button onClick={salvar} disabled={saving} className="bg-gradient-primary hover:opacity-90">
        <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando…" : "Salvar dados pessoais"}
      </Button>

      {/* Dialog troca de email */}
      <AlertDialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar e-mail</AlertDialogTitle>
            <AlertDialogDescription>
              Um e-mail de confirmação será enviado para o novo endereço. O e-mail atual continuará funcionando até a confirmação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label>Novo e-mail</Label>
            <Input
              type="email"
              value={novoEmail}
              onChange={e => setNovoEmail(e.target.value)}
              placeholder="novo@email.com"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={trocarEmail} disabled={trocandoEmail}>
              {trocandoEmail ? "Enviando…" : "Enviar confirmação"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
