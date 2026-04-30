import { useEffect, useMemo, useState } from "react";
import { Ticket, Search, Loader2, Calendar, User, Stethoscope, ShieldCheck, Download, Filter } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { listCuponsUso, type CupomUsoDetalhado } from "@/lib/cuponsUso";
import { cn } from "@/lib/utils";

function brl(c: number) {
  return (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const periodos = [
  { key: "30d", label: "Últimos 30 dias", dias: 30 },
  { key: "90d", label: "Últimos 90 dias", dias: 90 },
  { key: "all", label: "Tudo", dias: null as number | null },
] as const;

export default function CuponsUsoLog() {
  const { session, roles } = useSession();
  const podeVer = roles.includes("admin") || roles.includes("secretaria");

  const [q, setQ] = useState("");
  const [periodo, setPeriodo] = useState<(typeof periodos)[number]["key"]>("30d");
  const [loading, setLoading] = useState(false);
  const [usos, setUsos] = useState<CupomUsoDetalhado[]>([]);

  useEffect(() => {
    if (!session || !podeVer) return;
    setLoading(true);
    const dias = periodos.find((p) => p.key === periodo)?.dias ?? null;
    const desde = dias ? new Date(Date.now() - dias * 24 * 60 * 60 * 1000) : undefined;
    listCuponsUso({ desde }).then((r) => {
      setUsos(r);
      setLoading(false);
    });
  }, [session, podeVer, periodo]);

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return usos;
    return usos.filter(
      (r) =>
        r.codigo_snapshot.toLowerCase().includes(t) ||
        (r.cupom_nome ?? "").toLowerCase().includes(t) ||
        (r.paciente_nome ?? "").toLowerCase().includes(t) ||
        (r.medico_nome ?? "").toLowerCase().includes(t) ||
        (r.aplicado_por_nome ?? "").toLowerCase().includes(t),
    );
  }, [usos, q]);

  const stats = useMemo(() => {
    const total = lista.length;
    const desconto = lista.reduce((acc, r) => acc + r.valor_desconto_centavos, 0);
    const original = lista.reduce((acc, r) => acc + r.valor_original_centavos, 0);
    const cupons = new Set(lista.map((r) => r.cupom_id)).size;
    return { total, desconto, original, cupons };
  }, [lista]);

  function exportarCSV() {
    const headers = [
      "data", "codigo", "cupom", "tipo", "paciente", "medico",
      "consulta_inicio", "consulta_status", "valor_original", "desconto", "valor_final",
      "aplicado_por", "observacao",
    ];
    const linhas = lista.map((r) => [
      fmt(r.created_at),
      r.codigo_snapshot,
      r.cupom_nome ?? "",
      r.tipo_snapshot,
      r.paciente_nome ?? "",
      r.medico_nome ?? "",
      fmt(r.consulta_inicio),
      r.consulta_status ?? "",
      (r.valor_original_centavos / 100).toFixed(2).replace(".", ","),
      (r.valor_desconto_centavos / 100).toFixed(2).replace(".", ","),
      (r.valor_final_centavos / 100).toFixed(2).replace(".", ","),
      r.aplicado_por_nome ?? r.aplicado_por ?? "",
      (r.observacao ?? "").replace(/[\r\n;]/g, " "),
    ]);
    const csv = [headers, ...linhas].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cupons-uso-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!podeVer) {
    return (
      <div className="space-y-6">
        <PageHeader title="Log de uso de cupons" description="Histórico de aplicação de cupons." />
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Esta página é visível apenas para administradores e secretaria.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Log de uso de cupons"
        description="Quem aplicou, quando, em qual consulta e quanto de desconto."
        actions={
          <Button variant="outline" size="sm" onClick={exportarCSV} disabled={lista.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Aplicações" value={String(stats.total)} icon={<Ticket className="h-4 w-4" />} />
        <Stat label="Cupons distintos" value={String(stats.cupons)} icon={<ShieldCheck className="h-4 w-4" />} />
        <Stat label="Desconto total" value={brl(stats.desconto)} icon={<Ticket className="h-4 w-4 text-emerald-600" />} />
        <Stat label="Valor bruto" value={brl(stats.original)} icon={<Ticket className="h-4 w-4 text-muted-foreground" />} />
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por código, cupom, paciente, médico ou operador…"
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {periodos.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriodo(p.key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                periodo === p.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-2xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando log…
          </div>
        ) : lista.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <Ticket className="mx-auto mb-2 h-6 w-6 opacity-40" />
            Nenhum uso de cupom registrado para esse filtro.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Quando</th>
                  <th className="px-4 py-3">Cupom</th>
                  <th className="px-4 py-3">Paciente</th>
                  <th className="px-4 py-3">Médico</th>
                  <th className="px-4 py-3">Consulta</th>
                  <th className="px-4 py-3 text-right">Bruto</th>
                  <th className="px-4 py-3 text-right">Desconto</th>
                  <th className="px-4 py-3 text-right">Final</th>
                  <th className="px-4 py-3">Aplicado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lista.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {fmt(r.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-semibold text-foreground">{r.codigo_snapshot}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.cupom_nome ?? "—"} · {r.tipo_snapshot}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-foreground">
                        <User className="h-3 w-3 text-muted-foreground" />
                        {r.paciente_nome ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-foreground">
                        <Stethoscope className="h-3 w-3 text-muted-foreground" />
                        {r.medico_nome ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {r.consulta_inicio ? fmt(r.consulta_inicio) : "—"}
                      {r.consulta_status && (
                        <p className="text-[11px] text-muted-foreground/80">{r.consulta_status}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {brl(r.valor_original_centavos)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-emerald-600">
                      − {brl(r.valor_desconto_centavos)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-foreground">
                      {brl(r.valor_final_centavos)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {r.aplicado_por_nome ?? r.aplicado_por ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon} {label}</div>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
