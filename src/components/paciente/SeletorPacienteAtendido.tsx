/**
 * Seletor "Quem será atendido?" — permite ao titular escolher
 * agendar para si mesmo ou para um dependente.
 */
import { useEffect, useState } from "react";
import { Users, User, Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { maskCpf } from "@/lib/validation/cpf";

interface Dependente {
  id: string;
  nome_completo: string | null;
  parentesco: string | null;
  data_nascimento: string | null;
  cpf: string | null;
}

interface Props {
  titularId: string;
  /** Called when selection changes. null = titular (self). */
  onChange: (pacienteAtendidoId: string | null) => void;
  value: string | null;
}

export function SeletorPacienteAtendido({ titularId, onChange, value }: Props) {
  const [dependentes, setDependentes] = useState<Dependente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("pacientes")
        .select("id, nome_completo, parentesco, data_nascimento, cpf")
        .eq("responsavel_id", titularId)
        .eq("tipo_paciente", "dependente")
        .eq("status_conta", "ativo")
        .order("nome_completo");
      setDependentes(data ?? []);
      setLoading(false);
    })();
  }, [titularId]);

  // If no dependentes, don't show selector — titular is always the patient
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Verificando dependentes…
      </div>
    );
  }

  if (dependentes.length === 0) return null;

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium">Quem será atendido?</p>
      </div>

      <RadioGroup
        value={value ?? "titular"}
        onValueChange={(v) => onChange(v === "titular" ? null : v)}
      >
        <div className="flex items-center gap-3 rounded-md border border-border p-3 hover:bg-muted/50 transition-colors">
          <RadioGroupItem value="titular" id="pac-titular" />
          <Label htmlFor="pac-titular" className="flex items-center gap-2 cursor-pointer flex-1">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>Eu mesmo</span>
          </Label>
        </div>

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
      </RadioGroup>
    </div>
  );
}
