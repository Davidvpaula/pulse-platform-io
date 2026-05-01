import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageShell from "@/components/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  ativo: "bg-success/10 text-success",
  inativo: "bg-destructive/10 text-destructive",
  arquivado: "bg-muted text-muted-foreground",
};

export default function AdminPlanosMedicos() {
  const [planos, setPlanos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("planos")
        .select("*, medicos!planos_medico_id_fkey(nome, especialidade)")
        .eq("nivel", "medico" as any)
        .order("created_at", { ascending: false });
      setPlanos(data ?? []);
      setLoading(false);
    })();
  }, []);

  const toReais = (c: number) => `R$ ${((c || 0) / 100).toFixed(2).replace(".", ",")}`;

  return (
    <PageShell title="Planos de Médicos" subtitle="Planos personalizados criados pelos médicos da plataforma">
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : planos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum plano de médico cadastrado ainda.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plano</TableHead>
                <TableHead>Médico</TableHead>
                <TableHead>Especialidade</TableHead>
                <TableHead>Valor mensal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {planos.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell>{(p.medicos as any)?.nome ?? "—"}</TableCell>
                  <TableCell>{(p.medicos as any)?.especialidade ?? "—"}</TableCell>
                  <TableCell>{toReais(p.valor_mensal_centavos)}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[p.status] ?? ""}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </PageShell>
  );
}
