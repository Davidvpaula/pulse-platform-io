import { useEffect, useState } from "react";
import { brl } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import PageShell from "@/components/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  ativo: "bg-success/10 text-success",
  inativo: "bg-destructive/10 text-destructive",
  arquivado: "bg-muted text-muted-foreground",
  encerramento_pendente: "bg-orange-100 text-orange-800",
  encerrado: "bg-red-100 text-red-800",
};

export default function AdminPlanosMedicos() {
  const [planos, setPlanos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("planos")
      .select("*, medicos!planos_medico_id_fkey(nome, especialidade)")
      .eq("nivel", "medico" as any)
      .order("created_at", { ascending: false });
    setPlanos(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  

  async function toggleAprovacao(p: any) {
    const novo = !p.aprovado_admin;
    const { error } = await supabase.from("planos").update({ aprovado_admin: novo }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(novo ? "Plano aprovado pelo Admin" : "Aprovação revogada");
    await load();
  }

  async function toggleAtivo(p: any) {
    const novo = p.status === "ativo" ? "inativo" : "ativo";
    const { error } = await supabase.from("planos").update({ status: novo as any }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(`Plano ${novo}`);
    await load();
  }

  return (
    <PageShell title="Planos de Médicos" subtitle="Planos personalizados criados pelos médicos — aprovação e controle">
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
                <TableHead>Aprovação</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
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
                  <TableCell>
                    {p.aprovado_admin ? (
                      <Badge className="bg-success/10 text-success">Aprovado</Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant={p.aprovado_admin ? "destructive" : "default"}
                        onClick={() => toggleAprovacao(p)}
                      >
                        {p.aprovado_admin ? <XCircle className="h-3.5 w-3.5 mr-1" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                        {p.aprovado_admin ? "Revogar" : "Aprovar"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleAtivo(p)}>
                        {p.status === "ativo" ? "Desativar" : "Ativar"}
                      </Button>
                    </div>
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
