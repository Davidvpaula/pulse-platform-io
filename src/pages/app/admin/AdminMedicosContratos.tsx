import { useEffect, useState, useCallback, useMemo } from "react";
import { FileText, Download, CheckCircle2, XCircle, Clock, Loader2, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  medico_id: string;
  termo_id: string;
  arquivo_path: string;
  arquivo_nome: string;
  status: "pendente" | "em_analise" | "aprovado" | "reprovado";
  enviado_em: string;
  revisado_em: string | null;
  motivo_reprovacao: string | null;
  medicos: { nome: string; crm: string; crm_estado: string | null } | null;
  termos_condicoes: { versao: number; titulo: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  pendente: "Aguardando", em_analise: "Em análise", aprovado: "Aprovado", reprovado: "Reprovado",
};
const STATUS_CLS: Record<string, string> = {
  pendente: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  em_analise: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  aprovado: "bg-green-500/15 text-green-700 dark:text-green-400",
  reprovado: "bg-destructive/15 text-destructive",
};

export default function AdminMedicosContratos() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [filtro, setFiltro] = useState<string>("pendente");
  const [busca, setBusca] = useState("");
  const [reprovando, setReprovando] = useState<Row | null>(null);
  const [motivo, setMotivo] = useState("");
  const [acting, setActing] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("medicos_contratos")
      .select("*, medicos(nome,crm,crm_estado), termos_condicoes(versao,titulo)")
      .order("enviado_em", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as any) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const filtradas = useMemo(() => {
    return rows.filter((r) => {
      if (filtro !== "todos" && r.status !== filtro) return false;
      if (busca.trim()) {
        const q = busca.toLowerCase();
        if (!(r.medicos?.nome ?? "").toLowerCase().includes(q) &&
            !(r.medicos?.crm ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, filtro, busca]);

  async function baixar(r: Row) {
    const { data, error } = await supabase.storage
      .from("medico-docs").createSignedUrl(r.arquivo_path, 60);
    if (error) { toast.error(error.message); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function aprovar(r: Row) {
    setActing(true);
    const { error } = await supabase
      .from("medicos_contratos")
      .update({ status: "aprovado", revisado_em: new Date().toISOString(), motivo_reprovacao: null })
      .eq("id", r.id);
    setActing(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Contrato aprovado");
    carregar();
  }

  async function confirmarReprovacao() {
    if (!reprovando || !motivo.trim()) { toast.error("Informe o motivo"); return; }
    setActing(true);
    const { error } = await supabase
      .from("medicos_contratos")
      .update({ status: "reprovado", revisado_em: new Date().toISOString(), motivo_reprovacao: motivo.trim() })
      .eq("id", reprovando.id);
    setActing(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Contrato reprovado — médico será notificado");
    setReprovando(null);
    setMotivo("");
    carregar();
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Contratos médicos" description="Analise e aprove os contratos assinados enviados pelos médicos." />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px] max-w-sm">
          <Label className="text-xs text-muted-foreground mb-1 block">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Nome ou CRM…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </div>
        <div className="min-w-[160px]">
          <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Aguardando</SelectItem>
              <SelectItem value="em_analise">Em análise</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="reprovado">Reprovado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : filtradas.length === 0 ? (
        <div className="card-elevated p-10 text-center text-muted-foreground">
          <FileText className="mx-auto h-10 w-10 mb-3 opacity-40" />
          Nenhum contrato encontrado.
        </div>
      ) : (
        <div className="card-elevated overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr className="text-left text-muted-foreground">
                <th className="p-3">Médico</th>
                <th className="p-3">CRM</th>
                <th className="p-3">Versão</th>
                <th className="p-3">Enviado</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-3 font-medium">{r.medicos?.nome ?? "—"}</td>
                  <td className="p-3 text-xs">{r.medicos?.crm ?? "—"}/{r.medicos?.crm_estado ?? "—"}</td>
                  <td className="p-3 text-xs">v{r.termos_condicoes?.versao ?? "—"}</td>
                  <td className="p-3 text-xs">{new Date(r.enviado_em).toLocaleString("pt-BR")}</td>
                  <td className="p-3">
                    <Badge className={cn("font-normal", STATUS_CLS[r.status])} variant="outline">
                      {STATUS_LABEL[r.status]}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => baixar(r)} title="Baixar PDF assinado">
                        <Download className="h-4 w-4" />
                      </Button>
                      {r.status !== "aprovado" && (
                        <Button size="sm" variant="ghost" className="text-green-600" disabled={acting}
                          onClick={() => aprovar(r)} title="Aprovar">
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      {r.status !== "reprovado" && (
                        <Button size="sm" variant="ghost" className="text-destructive" disabled={acting}
                          onClick={() => { setReprovando(r); setMotivo(""); }} title="Reprovar">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!reprovando} onOpenChange={(o) => { if (!o) { setReprovando(null); setMotivo(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprovar contrato</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motivo da reprovação</Label>
            <Textarea
              rows={4}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Explique o motivo. O médico será notificado e poderá reenviar."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReprovando(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={acting || !motivo.trim()} onClick={confirmarReprovacao}>
              {acting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar reprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
