import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * RepasseSplitInput
 * --------------------------------------------------------------
 * Input duplo (% médico + % plataforma) que mantém a soma sempre
 * em 100. Permite digitar em QUALQUER um dos dois lados — o outro
 * é recalculado automaticamente.
 */

export type RepasseSplitInputProps = {
  medicoPct: number;
  onChange: (medicoPct: number) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  labels?: { medico?: string; plataforma?: string };
  plataformaEditavel?: boolean;
  onValidityChange?: (valid: boolean) => void;
  className?: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number) => Math.max(0, Math.min(100, n));

export function RepasseSplitInput({
  medicoPct,
  onChange,
  disabled,
  size = "md",
  labels,
  plataformaEditavel = true,
  onValidityChange,
  className,
}: RepasseSplitInputProps) {
  const [medStr, setMedStr] = useState<string>(formatNum(medicoPct));
  const [platStr, setPlatStr] = useState<string>(formatNum(round2(100 - medicoPct)));
  const [erro, setErro] = useState<string | null>(null);
  const [ajustado, setAjustado] = useState<boolean>(false);

  useEffect(() => {
    setMedStr(formatNum(medicoPct));
    setPlatStr(formatNum(round2(100 - medicoPct)));
    setErro(null);
    setAjustado(false);
  }, [medicoPct]);

  useEffect(() => {
    onValidityChange?.(erro === null);
  }, [erro, onValidityChange]);

  const inputCls = cn(
    "w-full rounded-lg border bg-card outline-none focus:border-primary tabular-nums",
    size === "sm" ? "px-2.5 py-1.5 text-sm" : "px-3 py-2 text-sm",
    erro
      ? "border-destructive focus:border-destructive"
      : ajustado
      ? "border-warning"
      : "border-border",
  );

  const aplicar = (raw: string, lado: "medico" | "plataforma") => {
    if (lado === "medico") setMedStr(raw);
    else setPlatStr(raw);

    if (raw.trim() === "") {
      setErro("Informe um valor.");
      return;
    }

    const num = Number(raw.replace(",", "."));
    if (!Number.isFinite(num)) {
      setErro("Valor inválido.");
      return;
    }
    if (num < 0 || num > 100) {
      setErro("Use um valor entre 0 e 100.");
      return;
    }

    const valor = round2(num);
    const wasAjustado = valor !== num;
    const novoMedico = lado === "medico" ? valor : round2(100 - valor);
    const novoPlataforma = round2(100 - novoMedico);

    setErro(null);
    setAjustado(wasAjustado);

    if (lado === "medico") setPlatStr(formatNum(novoPlataforma));
    else setMedStr(formatNum(novoMedico));

    if (round2(novoMedico) !== round2(medicoPct)) {
      onChange(novoMedico);
    }
  };

  const blur = (lado: "medico" | "plataforma") => {
    if (erro) {
      // Reverte para o último valor válido conhecido
      setMedStr(formatNum(medicoPct));
      setPlatStr(formatNum(round2(100 - medicoPct)));
      setErro(null);
      setAjustado(false);
      return;
    }
    if (lado === "medico") {
      const n = Number(medStr.replace(",", "."));
      if (Number.isFinite(n)) setMedStr(formatNum(n));
    } else {
      const n = Number(platStr.replace(",", "."));
      if (Number.isFinite(n)) setPlatStr(formatNum(n));
    }
  };

  const somaTxt = (() => {
    const a = Number(medStr.replace(",", ".")) || 0;
    const b = Number(platStr.replace(",", ".")) || 0;
    return round2(clamp(a) + clamp(b)).toFixed(2);
  })();

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {labels?.medico ?? "% repasse médico"}
          </label>
          <div className="mt-1 flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={medStr}
              disabled={disabled}
              onChange={(e) => aplicar(e.target.value, "medico")}
              onBlur={() => blur("medico")}
              className={inputCls}
              aria-invalid={!!erro}
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {labels?.plataforma ?? "% plataforma"}
          </label>
          <div className="mt-1 flex items-center gap-1.5">
            {plataformaEditavel ? (
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={platStr}
                disabled={disabled}
                onChange={(e) => aplicar(e.target.value, "plataforma")}
                onBlur={() => blur("plataforma")}
                className={inputCls}
                aria-invalid={!!erro}
              />
            ) : (
              <div
                className={cn(
                  "w-full rounded-lg border border-dashed border-border bg-muted/40 tabular-nums",
                  size === "sm"
                    ? "px-2.5 py-1.5 text-sm font-medium"
                    : "px-3 py-2 text-sm font-medium",
                )}
              >
                {platStr}
              </div>
            )}
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        {erro ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 font-semibold text-destructive">
            <AlertTriangle className="h-3 w-3" /> {erro}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 font-semibold text-success">
            <CheckCircle2 className="h-3 w-3" /> Soma: {somaTxt}%
          </span>
        )}
        {ajustado && !erro && (
          <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 font-semibold text-warning">
            <RefreshCcw className="h-3 w-3" /> Ajustado para 2 casas decimais
          </span>
        )}
      </div>
    </div>
  );
}

function formatNum(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const r = round2(n);
  if (Number.isInteger(r)) return String(r);
  return r.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
