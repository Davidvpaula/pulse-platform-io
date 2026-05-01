import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { MedicoRow } from "@/lib/clinico";

type Endereco = {
  id?: string;
  cep: string; rua: string; numero: string; complemento: string;
  bairro: string; cidade: string; estado: string;
};
const EMPTY_END: Endereco = { cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "" };

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
  const [cpf, setCpf] = useState(medico.cpf ?? "");
  const [dataNasc, setDataNasc] = useState(medico.data_nascimento ?? "");
  const [telefone, setTelefone] = useState(medico.telefone ?? "");
  const [rqe, setRqe] = useState(medico.rqe ?? "");
  const [endRes, setEndRes] = useState<Endereco>(EMPTY_END);
  const [endCom, setEndCom] = useState<Endereco>(EMPTY_END);
  const [usarComercial, setUsarComercial] = useState(false);
  const [saving, setSaving] = useState(false);

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
    // Update medico fields
    const { error: medErr } = await supabase.from("medicos").update({
      cpf: cpf.trim() || null,
      data_nascimento: dataNasc || null,
      telefone: telefone.trim() || null,
      rqe: rqe.trim() || null,
    }).eq("id", medico.id);
    if (medErr) { toast.error(medErr.message); setSaving(false); return; }

    // Upsert endereço residencial
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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div><Label>Nome completo</Label><Input value={medico.nome} disabled /></div>
        <div><Label>E-mail</Label><Input value={medico.email} disabled /></div>
        <div><Label>CPF</Label><Input value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" /></div>
        <div><Label>Data de nascimento</Label><Input type="date" value={dataNasc} onChange={e => setDataNasc(e.target.value)} /></div>
        <div><Label>Telefone</Label><Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(00) 00000-0000" /></div>
        <div><Label>CRM</Label><Input value={`${medico.crm} / ${medico.crm_estado}`} disabled /></div>
        <div><Label>Especialidade</Label><Input value={medico.especialidade} disabled /></div>
        <div><Label>RQE</Label><Input value={rqe} onChange={e => setRqe(e.target.value)} placeholder="Opcional" /></div>
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
    </div>
  );
}
