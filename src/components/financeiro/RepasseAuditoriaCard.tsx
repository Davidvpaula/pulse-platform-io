import { useEffect, useMemo, useState } from "react";
import { History, Loader2, Download, RefreshCw, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  listAuditoriaRepasse,
  searchMedicosAtivos,
  type RepasseAuditoriaRow,
  type MedicoOption,
} from "@/lib/financeiroConfig";

type Tipo = "todos" | "global" | "override";
type Periodo = "7" | "30" | "90" | "all";

const acaoLabel: Record<string, { label: string; tone: string }> = {
  criado: { label: "Criada", tone: "border-success/30 bg-success/10 text-success" },
  atualizado: { label: "Atualizado", tone: "border-primary/30 bg-primary/10 text-primary" },
  editado: { label: "Editada", tone: "border-primary/30 bg-primary/10 text-primary" },
  ativado: { label: "Ativada", tone: "border-success/30 bg-success/10 text-success" },
  desativado: { label: "Desativada", tone: "border-muted-foreground/20 bg-muted text-muted-foreground" },
  removido: { label: "Removida", tone: "border-destructive/30 bg-destructive/10 text-destructive" },
};

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fmtPct(v: number | null) {
  if (v === null || v === undefined) return "—";
  return `${v.toFixed(2)}%`;
}

export function RepasseAuditoriaCard({ refreshKey }: { refreshKey?: number }) {
  const [rows, setRows] = useState<RepasseAuditoriaRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [tipo, setTipo] = useState<Tipo>("todos");
  const [periodo, setPeriodo] = useState<Periodo>("30");
  const [busca, setBusca] = useState("");
  const [opcoes, setOpcoes] = useState<MedicoOption[]>([]);
  const [medicoSel, setMedicoSel] = useState<MedicoOption | null>(null);
  const [searching, setSearching] = useState(false);

  const desdeIso = useMemo(() => {
    if (periodo === "all") return null;
    const d = new Date();
    d.setDate(d.getDate() - Number(periodo));
    return d.toISOString();
  }, [periodo]);

  const load = async () => {
    setLoading(true);
    try {
      const list = await listAuditoriaRepasse({
        tipo,
        desde: desdeIso,
        medico_id: medicoSel?.id ?? null,
        limit: 200,
      });
      setRows(list);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao carregar histórico.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, periodo, medicoSel?.id, refreshKey]);

  // busca de médico (debounce simples)
  useEffect(() => {
    let cancel = false;
    const t = setTimeout(async () => {
      if (!busca.trim()) {
        setOpcoes([]);
        return;
      }
      setSearching(true);
      try {
        const res = await searchMedicosAtivos(busca);
        if (!cancel) setOpcoes(res);
      } finally {
        if (!cancel) setSearching(false);
      }
    }, 200);
    return () => {
      cancel = true;
      clearTimeout(t);
    };
  }, [busca]);

  const exportCsv = () => {
    const header = [
      "data",
      "usuario",
      "tipo",
      "acao",
      "medico",
      "de_pct_medico",
      "para_pct_medico",
      "motivo",
    ];
    const csvRows = rows.map((r) => [
      new Date(r.created_at).toISOString(),
      r.actor_nome ?? "",
      r.entidade === "repasse_global" ? "Global" : "Exceção",
      r.acao,
      r.medico_nome ?? "",
      r.valor_anterior_pct?.toFixed(2) ?? "",
      r.valor_novo_pct?.toFixed(2) ?? "",
      (r.motivo ?? "").replace(/[\r\n]+/g, " "),
    ]);
    const csv = [header, ...csvRows]
      .map((row) =>
        row
          .map((c) => {
            const s = String(c ?? "");
            return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(";"),
      )
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historico-repasse-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="card-elevated p-6">
      <div className="mb-4 flex items-start justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <History className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold leading-tight">
              Histórico de alterações
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Registro imutável de todas as mudanças no repasse global e nas exceções por médico.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} />
            Atualizar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={exportCsv}
            disabled={rows.length === 0}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tipo
          </label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as Tipo)}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="todos">Todos</option>
            <option value="global">Repasse global</option>
            <option value="override">Exceções por médico</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Período
          </label>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as Periodo)}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="all">Tudo</option>
          </select>
        </div>
        <div className="relative">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Médico
          </label>
          {medicoSel ? (
            <div className="mt-1 flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm">
              <span className="truncate">
                {medicoSel.nome}
                {medicoSel.crm ? ` · CRM ${medicoSel.crm}` : ""}
              </span>
              <button
                onClick={() => {
                  setMedicoSel(null);
                  setBusca("");
                }}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                limpar
              </button>
            </div>
          ) : (
            <>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar médico…"
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
              />
              {busca.trim() && (
                <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-popover shadow-lg">
                  {searching ? (
                    <div className="flex items-center justify-center py-3 text-xs text-muted-foreground">
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" /> buscando…
                    </div>
                  ) : opcoes.length === 0 ? (
                    <p className="py-3 text-center text-xs text-muted-foreground">
                      Nenhum médico encontrado.
                    </p>
                  ) : (
                    opcoes.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setMedicoSel(m);
                          setBusca("");
                          setOpcoes([]);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        {m.nome}
                        {m.crm && (
                          <span className="text-xs text-muted-foreground"> · CRM {m.crm}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando histórico…
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhuma alteração registrada para os filtros selecionados.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="grid grid-cols-12 gap-2 bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="col-span-2">Data</div>
            <div className="col-span-2">Quem</div>
            <div className="col-span-2">Tipo / Ação</div>
            <div className="col-span-2">Médico</div>
            <div className="col-span-2">% médico</div>
            <div className="col-span-2">Motivo</div>
          </div>
          <div className="divide-y divide-border">
            {rows.map((r) => {
              const tone =
                acaoLabel[r.acao]?.tone ??
                "border-muted-foreground/20 bg-muted text-muted-foreground";
              const acaoTxt = acaoLabel[r.acao]?.label ?? r.acao;
              return (
                <div
                  key={r.id}
                  className="grid grid-cols-12 items-start gap-2 px-3 py-2.5 text-sm"
                >
                  <div className="col-span-2 text-xs text-muted-foreground">
                    {fmtDate(r.created_at)}
                  </div>
                  <div className="col-span-2 truncate">
                    <p className="font-medium">{r.actor_nome ?? "—"}</p>
                  </div>
                  <div className="col-span-2 flex flex-col gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {r.entidade === "repasse_global" ? "Global" : "Exceção"}
                    </span>
                    <span
                      className={cn(
                        "w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                        tone,
                      )}
                    >
                      {acaoTxt}
                    </span>
                  </div>
                  <div className="col-span-2 truncate">
                    {r.entidade === "repasse_global" ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span>{r.medico_nome ?? "—"}</span>
                    )}
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5 tabular-nums">
                    <span className="text-muted-foreground">{fmtPct(r.valor_anterior_pct)}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-semibold">{fmtPct(r.valor_novo_pct)}</span>
                  </div>
                  <div className="col-span-2 text-xs text-muted-foreground">
                    {r.motivo?.trim() ? r.motivo : <span className="opacity-50">—</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
