export { brl } from "@/lib/format";

export const pct = (n: number | null | undefined, casas = 1) =>
  `${(Number(n) || 0).toFixed(casas)}%`;

export const num = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString("pt-BR");

export type FiltrosGlobais = {
  inicio: string; // ISO yyyy-mm-dd
  fim: string;
  medico_id?: string | null;
  especialidade?: string | null;
  canal?: string | null;
  status?: string | null;
  empresa_id?: string | null;
};

export function periodoPreset(preset: "hoje" | "7d" | "30d" | "90d" | "mes" | "ano"): { inicio: string; fim: string } {
  const hoje = new Date();
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
  let inicio = new Date(hoje);
  if (preset === "hoje") inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  else if (preset === "7d") inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 6);
  else if (preset === "30d") inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 29);
  else if (preset === "90d") inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 89);
  else if (preset === "mes") inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  else if (preset === "ano") inicio = new Date(hoje.getFullYear(), 0, 1);
  return { inicio: inicio.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) };
}

export function toRpcArgs(f: FiltrosGlobais) {
  return {
    p_inicio: new Date(f.inicio + "T00:00:00").toISOString(),
    p_fim: new Date(f.fim + "T00:00:00").toISOString(),
    p_medico_id: f.medico_id || null,
    p_especialidade: f.especialidade || null,
    p_canal: f.canal || null,
    p_status: f.status || null,
    p_empresa_id: f.empresa_id || null,
  };
}

export function downloadCSV(filename: string, rows: (string | number | null | undefined)[][]) {
  const csv = rows
    .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Gera CSV a partir de array de objetos (auto-detecta colunas). */
export function downloadCSVFromObjects(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const csv = [cols.join(","), ...rows.map(r => cols.map(c => JSON.stringify(r[c] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const formatDia = (s: string) => {
  const d = new Date(s + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

export const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(217 91% 60%)",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(0 84% 60%)",
  "hsl(280 65% 60%)",
  "hsl(180 60% 45%)",
];
