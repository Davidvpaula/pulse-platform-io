/**
 * Seletor "Quem será atendido?" — permite ao titular escolher
 * agendar para si mesmo, para um dependente existente,
 * ou cadastrar um novo dependente inline (sem sair da rota).
 */
import { useEffect, useState, useCallback } from "react";
import { Users, User, UserPlus, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { maskCpf, isValidCpf, onlyDigits } from "@/lib/validation/cpf";
import { toast } from "sonner";

/* ─── Constants ─── */
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

/* ─── Types ─── */
interface Dependente {
  id: string;
  nome_completo: string | null;
  parentesco: string | null;
  data_nascimento: string | null;
  cpf: string | null;
}

export interface NovoDependenteData {
  nome_completo: string;
  cpf: string;
  data_nascimento: string;
  sexo: string;
  parentesco: string;
}

interface Props {
  titularId: string;
  /** null = titular (self), uuid = dependente existente, "novo" = inline form active */
  onChange: (pacienteAtendidoId: string | null) => void;
  value: string | null;
  /** Ref to get inline dependent data for validation before submit */
  onNovoDependenteRef?: (ref: { validate: () => NovoDependenteData | null; save: () => Promise<string | null> } | null) => void;
}

export function SeletorPacienteAtendido({ titularId, onChange, value, onNovoDependenteRef }: Props) {
  const [dependentes, setDependentes] = useState<Dependente[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline form state
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [sexo, setSexo] = useState("nao_informado");
  const [parentesco, setParentesco] = useState("");
  const [aceiteTermos, setAceiteTermos] = useState(false);
  const [formExpanded, setFormExpanded] = useState(false);

  const isNovoSelected = value === "novo";

  const fetchDependentes = useCallback(async () => {
    const { data } = await supabase
      .from("pacientes")
      .select("id, nome_completo, parentesco, data_nascimento, cpf")
      .eq("responsavel_id", titularId)
      .eq("tipo_paciente", "dependente")
      .eq("status_conta", "ativo")
      .order("nome_completo");
    setDependentes(data ?? []);
    setLoading(false);
  }, [titularId]);

  useEffect(() => { fetchDependentes(); }, [fetchDependentes]);

  // Expose validate + save to parent
  useEffect(() => {
    if (!onNovoDependenteRef) return;

    if (!isNovoSelected) {
      onNovoDependenteRef(null);
      return;
    }

    onNovoDependenteRef({
      validate: (): NovoDependenteData | null => {
        const trimmedNome = nome.trim();
        if (!trimmedNome || trimmedNome.split(/\s+/).length < 2) {
          toast.error("Informe nome e sobrenome do dependente");
          return null;
        }
        if (!isValidCpf(cpf)) {
          toast.error("CPF do dependente é inválido");
          return null;
        }
        if (!nascimento) {
          toast.error("Data de nascimento do dependente é obrigatória");
          return null;
        }
        if (!parentesco) {
          toast.error("Selecione o parentesco");
          return null;
        }
        if (!aceiteTermos) {
          toast.error("É necessário aceitar o termo de responsabilidade");
          return null;
        }
        return { nome_completo: trimmedNome, cpf: onlyDigits(cpf), data_nascimento: nascimento, sexo, parentesco };
      },
      save: async (): Promise<string | null> => {
        const payload = {
          nome_completo: nome.trim(),
          cpf: onlyDigits(cpf),
          data_nascimento: nascimento,
          sexo: sexo as any,
          parentesco,
          tipo_paciente: "dependente" as const,
          responsavel_id: titularId,
          user_id: null,
        };

        const { data: inserted, error } = await supabase
          .from("pacientes")
          .insert(payload)
          .select("id")
          .single();

        if (error) {
          toast.error("Erro ao cadastrar dependente: " + error.message);
          return null;
        }

        // Save consent
        await supabase.from("dependente_consentimentos").insert({
          responsavel_id: titularId,
          dependente_id: inserted.id,
          tipo_consentimento: "cadastro_dependente",
          aceite: true,
          accepted_at: new Date().toISOString(),
          texto_termo_snapshot: TERMO_TEXTO,
        });

        toast.success("Dependente cadastrado com sucesso!");
        // Refresh list and select the new dependent
        await fetchDependentes();
        onChange(inserted.id);
        return inserted.id;
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNovoSelected, nome, cpf, nascimento, sexo, parentesco, aceiteTermos, titularId, onNovoDependenteRef]);

  // Auto-expand form when "novo" is selected
  useEffect(() => {
    if (isNovoSelected) setFormExpanded(true);
  }, [isNovoSelected]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Verificando dependentes…
      </div>
    );
  }


  const isSelfSelected = value === null || value === "titular";

  return (
    <div className="space-y-3">
      {/* When self is selected: compact row with toggle link */}
      {isSelfSelected && !isNovoSelected && (
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Quem será atendido?</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (dependentes.length > 0) {
                // If there are existing dependents, show picker
                onChange("novo"); // temporarily switch to show options
              } else {
                onChange("novo");
              }
            }}
            className="flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
          >
            <UserPlus className="h-4 w-4" />
            Agendar para outra pessoa
          </button>
        </div>
      )}

      {/* When a dependent or "novo" is selected: show full picker */}
      {!isSelfSelected && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Quem será atendido?</p>
            </div>
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setFormExpanded(false);
              }}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              ← Eu mesmo
            </button>
          </div>

          <RadioGroup
            value={value!}
            onValueChange={(v) => {
              onChange(v);
              if (v !== "novo") setFormExpanded(false);
            }}
          >
            {/* Dependentes existentes */}
            {dependentes.map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-md border border-border p-3 hover:bg-muted/50 transition-colors">
                <RadioGroupItem value={d.id} id={`pac-${d.id}`} />
                <Label htmlFor={`pac-${d.id}`} className="cursor-pointer flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{d.nome_completo || "Sem nome"}</span>
                    {d.parentesco && (
                      <Badge variant="outline" className="text-[10px]">{d.parentesco}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {d.data_nascimento
                      ? `Nasc.: ${new Date(d.data_nascimento + "T12:00:00").toLocaleDateString("pt-BR")}`
                      : ""
                    }
                    {d.cpf ? ` · CPF: ${maskCpf(d.cpf)}` : ""}
                  </p>
                </Label>
              </div>
            ))}

            {/* Cadastrar nova pessoa */}
            <div className={`rounded-md border transition-colors ${isNovoSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
              <div className="flex items-center gap-3 p-3">
                <RadioGroupItem value="novo" id="pac-novo" />
                <Label htmlFor="pac-novo" className="flex items-center gap-2 cursor-pointer flex-1">
                  <UserPlus className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Cadastrar nova pessoa</span>
                </Label>
                {isNovoSelected && (
                  <button
                    type="button"
                    onClick={() => setFormExpanded((v) => !v)}
                    className="p-1 rounded hover:bg-muted"
                  >
                    {formExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                )}
              </div>

              {/* Inline form */}
              {isNovoSelected && formExpanded && (
                <div className="px-3 pb-4 pt-1 space-y-3 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">
                    Preencha os dados da pessoa que será atendida. O cadastro será salvo automaticamente.
                  </p>

                  <div>
                    <Label className="text-xs">Nome completo *</Label>
                    <Input
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Nome e sobrenome"
                      maxLength={120}
                    />
                  </div>

                  <div className="grid gap-3 grid-cols-2">
                    <div>
                      <Label className="text-xs">CPF *</Label>
                      <Input
                        value={cpf}
                        onChange={(e) => setCpf(maskCpf(e.target.value))}
                        placeholder="000.000.000-00"
                        inputMode="numeric"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Nascimento *</Label>
                      <Input
                        type="date"
                        value={nascimento}
                        onChange={(e) => setNascimento(e.target.value)}
                        max={new Date().toISOString().slice(0, 10)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 grid-cols-2">
                    <div>
                      <Label className="text-xs">Sexo biológico</Label>
                      <Select value={sexo} onValueChange={setSexo}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SEXOS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Parentesco *</Label>
                      <Select value={parentesco} onValueChange={setParentesco}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {PARENTESCOS.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 pt-1">
                    <Checkbox
                      id="aceite-dep"
                      checked={aceiteTermos}
                      onCheckedChange={(v) => setAceiteTermos(v === true)}
                      className="mt-0.5"
                    />
                    <label htmlFor="aceite-dep" className="text-xs text-muted-foreground leading-snug cursor-pointer">
                      {TERMO_TEXTO}
                    </label>
                  </div>
                </div>
              )}
            </div>
          </RadioGroup>
        </div>
      )}
    </div>
  );
}
