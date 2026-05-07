import { useEffect, useState } from "react";
import { Users, Plus, Pencil, Ban, CheckCircle2, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { usePacienteAtual } from "@/lib/usePacienteAtual";
import { toast } from "sonner";
import { maskCpf, isValidCpf, onlyDigits } from "@/lib/validation/cpf";

/* ─── types ─── */
interface Dependente {
  id: string;
  nome_completo: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  sexo: string;
  parentesco: string | null;
  status_conta: string;
  created_at: string;
}

const PARENTESCOS = [
  "Filho(a)", "Cônjuge", "Pai/Mãe", "Avô/Avó", "Neto(a)",
  "Irmão/Irmã", "Sobrinho(a)", "Tio(a)", "Outro",
] as const;

const SEXOS = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "nao_informado", label: "Não informado" },
] as const;

const TERMO_TEXTO = `Declaro que sou responsável legal pela pessoa informada como dependente e autorizo o cadastro de seus dados na plataforma para fins de agendamento e acompanhamento médico. Estou ciente de que os dados serão tratados conforme a LGPD.`;

export default function PacienteDependentes() {
  const { paciente, loading: loadingPaciente } = usePacienteAtual();
  const [dependentes, setDependentes] = useState<Dependente[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // form
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [sexo, setSexo] = useState("nao_informado");
  const [parentesco, setParentesco] = useState("");
  const [aceiteTermos, setAceiteTermos] = useState(false);

  const titularId = paciente?.id;

  async function fetchDependentes() {
    if (!titularId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("pacientes")
      .select("id, nome_completo, cpf, data_nascimento, sexo, parentesco, status_conta, created_at")
      .eq("responsavel_id", titularId)
      .eq("tipo_paciente", "dependente")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar dependentes");
    } else {
      setDependentes(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { fetchDependentes(); }, [titularId]);

  function resetForm() {
    setNome(""); setCpf(""); setNascimento(""); setSexo("nao_informado");
    setParentesco(""); setAceiteTermos(false); setEditId(null);
  }

  function openAdd() {
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(d: Dependente) {
    setEditId(d.id);
    setNome(d.nome_completo ?? "");
    setCpf(d.cpf ? maskCpf(d.cpf) : "");
    setNascimento(d.data_nascimento ?? "");
    setSexo(d.sexo);
    setParentesco(d.parentesco ?? "");
    setAceiteTermos(true); // already consented
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!titularId) return;
    if (!nome.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!isValidCpf(cpf)) { toast.error("CPF inválido"); return; }
    if (!nascimento) { toast.error("Data de nascimento é obrigatória"); return; }
    if (!parentesco) { toast.error("Selecione o parentesco"); return; }
    if (!editId && !aceiteTermos) { toast.error("É necessário aceitar o termo de responsabilidade"); return; }

    setSaving(true);
    const payload = {
      nome_completo: nome.trim(),
      cpf: onlyDigits(cpf),
      data_nascimento: nascimento,
      sexo,
      parentesco,
      tipo_paciente: "dependente" as const,
      responsavel_id: titularId,
      user_id: null,
    };

    if (editId) {
      const { error } = await supabase
        .from("pacientes")
        .update({ nome_completo: payload.nome_completo, cpf: payload.cpf, data_nascimento: payload.data_nascimento, sexo: payload.sexo, parentesco: payload.parentesco })
        .eq("id", editId);
      if (error) { toast.error("Erro ao atualizar: " + error.message); setSaving(false); return; }
      toast.success("Dependente atualizado");
    } else {
      const { data: inserted, error } = await supabase
        .from("pacientes")
        .insert(payload)
        .select("id")
        .single();
      if (error) { toast.error("Erro ao cadastrar: " + error.message); setSaving(false); return; }

      // Save consent
      await supabase.from("dependente_consentimentos").insert({
        responsavel_id: titularId,
        dependente_id: inserted.id,
        tipo_consentimento: "cadastro_dependente",
        aceite: true,
        accepted_at: new Date().toISOString(),
        texto_termo_snapshot: TERMO_TEXTO,
      });

      toast.success("Dependente cadastrado com sucesso");
    }

    setSaving(false);
    setDialogOpen(false);
    resetForm();
    fetchDependentes();
  }

  async function handleToggleStatus(d: Dependente) {
    const newStatus = d.status_conta === "ativo" ? "suspenso" : "ativo";
    const { error } = await supabase
      .from("pacientes")
      .update({ status_conta: newStatus })
      .eq("id", d.id);
    if (error) { toast.error("Erro ao alterar status"); return; }
    toast.success(newStatus === "ativo" ? "Dependente reativado" : "Dependente desativado");
    fetchDependentes();
  }

  if (loadingPaciente) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dependentes"
        description="Gerencie pessoas sob sua responsabilidade para agendamentos futuros."
        icon={Users}
        action={
          <Button onClick={openAdd} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Adicionar dependente
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
      ) : dependentes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum dependente cadastrado.</p>
            <Button variant="outline" className="mt-4" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-1" /> Cadastrar primeiro dependente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {dependentes.map((d) => (
            <Card key={d.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{d.nome_completo || "Sem nome"}</CardTitle>
                    <CardDescription>
                      {d.parentesco ?? "—"} · CPF: {d.cpf ? maskCpf(d.cpf) : "—"}
                    </CardDescription>
                  </div>
                  <Badge variant={d.status_conta === "ativo" ? "default" : "secondary"}>
                    {d.status_conta}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Nascimento: {d.data_nascimento ? new Date(d.data_nascimento + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(d)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                  </Button>
                  <Button
                    variant={d.status_conta === "ativo" ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => handleToggleStatus(d)}
                  >
                    {d.status_conta === "ativo"
                      ? <><Ban className="h-3.5 w-3.5 mr-1" /> Desativar</>
                      : <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Reativar</>
                    }
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Add/Edit */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { resetForm(); } setDialogOpen(o); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar dependente" : "Novo dependente"}</DialogTitle>
            <DialogDescription>
              {editId ? "Atualize os dados do dependente." : "Cadastre uma pessoa sob sua responsabilidade."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome completo *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
            </div>
            <div>
              <Label>CPF *</Label>
              <Input
                value={cpf}
                onChange={(e) => setCpf(maskCpf(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>
            <div>
              <Label>Data de nascimento *</Label>
              <Input type="date" value={nascimento} onChange={(e) => setNascimento(e.target.value)} />
            </div>
            <div>
              <Label>Sexo</Label>
              <Select value={sexo} onValueChange={setSexo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEXOS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Parentesco *</Label>
              <Select value={parentesco} onValueChange={setParentesco}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {PARENTESCOS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {!editId && (
              <div className="rounded-md border p-3 bg-muted/50 space-y-2">
                <p className="text-xs text-muted-foreground">{TERMO_TEXTO}</p>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="aceite"
                    checked={aceiteTermos}
                    onCheckedChange={(v) => setAceiteTermos(!!v)}
                  />
                  <label htmlFor="aceite" className="text-sm cursor-pointer">
                    Li e aceito o termo de responsabilidade
                  </label>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="animate-spin h-4 w-4 mr-1" />}
              {editId ? "Salvar alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
