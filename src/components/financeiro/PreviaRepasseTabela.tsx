import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type ConsultaPreviaRow,
  type RegraSimulada,
  type RegrasVigentes,
  type SlotFuturoPreviaRow,
  resolverPctMedicoVigente,
  simularRepasse,
} from "@/lib/financeiroPrevia";

const fmtBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtPct = (n: number | null) =>
  n == null ? "—" : `${Number(n).toFixed(2)}%`;

const fmtData = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

type ConsultaProps = {
  modo: "consultas";
  rows: ConsultaPreviaRow[];
  regrasVigentes: RegrasVigentes;
  simulada: RegraSimulada;
};

type SlotProps = {
  modo: "slots";
  rows: SlotFuturoPreviaRow[];
  regrasVigentes: RegrasVigentes;
  simulada: RegraSimulada;
};

type Props = ConsultaProps | SlotProps;

export function PreviaRepasseTabela(props: Props) {
  if (props.modo === "consultas") {
    return <TabelaConsultas {...props} />;
  }
  return <TabelaSlots {...props} />;
}

function TabelaConsultas({
  rows,
  regrasVigentes,
  simulada,
}: ConsultaProps) {
  if (!rows.length) {
    return (
      <div className="rounded-md border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
        Nenhuma consulta particular encontrada para os filtros atuais.
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Médico</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">% atual</TableHead>
            <TableHead className="text-right">R$ médico atual</TableHead>
            <TableHead className="text-right">% simulado</TableHead>
            <TableHead className="text-right">R$ médico simulado</TableHead>
            <TableHead className="text-right">Δ</TableHead>
            <TableHead>Origem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const sim = simularRepasse(
              r.valor_centavos,
              r.medico_id,
              regrasVigentes,
              simulada,
            );
            const atualPct =
              r.pct_medico_snapshot ??
              resolverPctMedicoVigente(r.medico_id, regrasVigentes).pct;
            const atualValor =
              r.valor_medico_snapshot_centavos ??
              Math.round((r.valor_centavos * atualPct) / 100);
            const delta = sim.valorMedicoCentavos - atualValor;

            return (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap text-xs">
                  {fmtData(r.inicio)}
                </TableCell>
                <TableCell className="text-sm">
                  {r.medico_nome ?? r.medico_id.slice(0, 6)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize text-[10px]">
                    {r.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtBRL(r.valor_centavos)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtPct(atualPct)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {fmtBRL(atualValor)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtPct(sim.pctMedico)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {fmtBRL(sim.valorMedicoCentavos)}
                </TableCell>
                <TableCell className="text-right">
                  <DeltaCell cents={delta} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground capitalize">
                  {sim.origem}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function TabelaSlots({ rows, regrasVigentes, simulada }: SlotProps) {
  if (!rows.length) {
    return (
      <div className="rounded-md border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
        Nenhum slot particular futuro disponível com preço base configurado.
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Início</TableHead>
            <TableHead>Médico</TableHead>
            <TableHead className="text-right">Preço base</TableHead>
            <TableHead className="text-right">% vigente</TableHead>
            <TableHead className="text-right">R$ médico vigente</TableHead>
            <TableHead className="text-right">% simulado</TableHead>
            <TableHead className="text-right">R$ médico simulado</TableHead>
            <TableHead className="text-right">Δ</TableHead>
            <TableHead>Origem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const vig = resolverPctMedicoVigente(r.medico_id, regrasVigentes);
            const vigenteCents = Math.round((r.preco_centavos * vig.pct) / 100);
            const sim = simularRepasse(
              r.preco_centavos,
              r.medico_id,
              regrasVigentes,
              simulada,
            );
            const delta = sim.valorMedicoCentavos - vigenteCents;
            return (
              <TableRow key={r.slot_id}>
                <TableCell className="whitespace-nowrap text-xs">
                  {fmtData(r.inicio)}
                </TableCell>
                <TableCell className="text-sm">
                  {r.medico_nome ?? r.medico_id.slice(0, 6)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtBRL(r.preco_centavos)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtPct(vig.pct)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {fmtBRL(vigenteCents)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtPct(sim.pctMedico)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {fmtBRL(sim.valorMedicoCentavos)}
                </TableCell>
                <TableCell className="text-right">
                  <DeltaCell cents={delta} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground capitalize">
                  {sim.origem}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function DeltaCell({ cents }: { cents: number }) {
  if (cents === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
        <Minus className="h-3 w-3" /> R$ 0,00
      </span>
    );
  }
  const positivo = cents > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
        positivo ? "text-emerald-600" : "text-destructive",
      )}
    >
      {positivo ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {positivo ? "+" : ""}
      {fmtBRL(cents)}
    </span>
  );
}
