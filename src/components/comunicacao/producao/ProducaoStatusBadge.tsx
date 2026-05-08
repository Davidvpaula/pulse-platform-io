import { Badge } from "@/components/ui/badge";

type Modo = "sandbox" | "staging" | "producao";

export function ProducaoStatusBadge({ modo }: { modo: Modo | string }) {
  if (modo === "producao") {
    return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">Produção</Badge>;
  }
  if (modo === "staging") {
    return <Badge className="bg-amber-500 hover:bg-amber-500 text-white">Staging</Badge>;
  }
  return <Badge variant="secondary">Sandbox</Badge>;
}
