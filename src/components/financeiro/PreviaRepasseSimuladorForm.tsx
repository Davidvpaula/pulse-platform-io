import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RepasseSplitInput } from "@/components/financeiro/RepasseSplitInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import type { RegraSimulada } from "@/lib/financeiroPrevia";

export type MedicoLite = { id: string; nome: string };

type Props = {
  vigenteGlobalPctMedico: number;
  medicos: MedicoLite[];
  value: RegraSimulada;
  onChange: (next: RegraSimulada) => void;
};

export function PreviaRepasseSimuladorForm({
  vigenteGlobalPctMedico,
  medicos,
  value,
  onChange,
}: Props) {
  const tipo = value.tipo;
  const [globalPct, setGlobalPct] = useState<number>(
    value.tipo === "global" ? value.pctMedico : vigenteGlobalPctMedico,
  );
  const [overridePct, setOverridePct] = useState<number>(
    value.tipo === "override" ? value.pctMedico : vigenteGlobalPctMedico,
  );
  const [overrideMedico, setOverrideMedico] = useState<string>(
    value.tipo === "override" ? value.medicoId : medicos[0]?.id ?? "",
  );

  function setVigente() {
    onChange({ tipo: "vigente" });
  }
  function setGlobal(pct: number) {
    setGlobalPct(pct);
    onChange({ tipo: "global", pctMedico: pct });
  }
  function setOverride(pct: number, medicoId: string) {
    setOverridePct(pct);
    setOverrideMedico(medicoId);
    if (medicoId) onChange({ tipo: "override", medicoId, pctMedico: pct });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Simulação (não altera nada)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={tipo}
          onValueChange={(v) => {
            if (v === "vigente") setVigente();
            else if (v === "global") setGlobal(globalPct);
            else if (v === "override") setOverride(overridePct, overrideMedico);
          }}
          className="space-y-3"
        >
          <div className="flex items-start gap-3">
            <RadioGroupItem value="vigente" id="sim-vigente" className="mt-1" />
            <div>
              <Label htmlFor="sim-vigente" className="font-medium">
                Usar regras vigentes
              </Label>
              <p className="text-xs text-muted-foreground">
                Aplica exceção do médico (se houver) ou o repasse global atual de{" "}
                <strong>{vigenteGlobalPctMedico.toFixed(2)}% médico</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <RadioGroupItem value="global" id="sim-global" className="mt-1" />
            <div className="flex-1 space-y-2">
              <Label htmlFor="sim-global" className="font-medium">
                Simular novo repasse global
              </Label>
              <div className={tipo === "global" ? "" : "pointer-events-none opacity-50"}>
                <RepasseSplitInput
                  size="sm"
                  medicoPct={globalPct}
                  onChange={(v) => setGlobal(v)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <RadioGroupItem value="override" id="sim-override" className="mt-1" />
            <div className="flex-1 space-y-2">
              <Label htmlFor="sim-override" className="font-medium">
                Simular exceção para um médico
              </Label>
              <div
                className={
                  tipo === "override"
                    ? "space-y-2"
                    : "space-y-2 pointer-events-none opacity-50"
                }
              >
                <Select
                  value={overrideMedico}
                  onValueChange={(v) => setOverride(overridePct, v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecionar médico…" />
                  </SelectTrigger>
                  <SelectContent>
                    {medicos.length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        Nenhum médico nas consultas filtradas.
                      </div>
                    )}
                    {medicos.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <RepasseSplitInput
                  size="sm"
                  medicoPct={overridePct}
                  onChange={(v) => setOverride(v, overrideMedico)}
                />
                <p className="text-xs text-muted-foreground">
                  Apenas as consultas/slots desse médico são recalculadas; os demais usam a
                  regra vigente.
                </p>
              </div>
            </div>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
