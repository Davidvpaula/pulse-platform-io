import { useEffect, useState, useCallback } from "react";
import { FileText, Upload, Download, CheckCircle2, Loader2, Star, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Modelo = {
  id: string;
  versao: string;
  titulo: string;
  arquivo_path: string;
  arquivo_nome: string;
  ativo: boolean;
  publicado_em: string | null;
  observacoes: string | null;
  created_at: string;
};

export default function AdminContratosModelo() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Modelo[]>([]);
  const [openNovo, setOpenNovo] = useState(false);
  const [versao, setVersao] = useState("");
  const [titulo, setTitulo] = useState("Contrato de Parceria — Médico");
  const [observacoes, setObservacoes] = useState("");
  const [ativarAgora, setAtivarAgora] = useState(true);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contratos_modelo")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as any) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function resetForm() {
    setVersao(""); setTitulo("Contrato de Parceria — Médico");
    setObservacoes(""); setAtivarAgora(true); setArquivo(null);
  }

  async function salvar() {
    if (!arquivo) { toast.error("Selecione o PDF"); return; }
    if (arquivo.type !== "application/pdf") { toast.error("Envie um PDF"); return; }
    if (arquivo.size > 15 * 1024 * 1024) { toast.error("Máximo 15MB"); return; }
    if (!versao.trim() || !titulo.trim()) { toast.error("Versão e título obrigatórios"); return; }

    setSalvando(true);
    try {
      const fname = `${crypto.randomUUID()}.pdf`;
      const path = `modelos/${fname}`;
      const { error: upErr } = await supabase.storage
        .from("contratos-modelo")
        .upload(path, arquivo, { contentType: "application/pdf", upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("contratos_modelo").insert({
        versao: versao.trim(),
        titulo: titulo.trim(),
        arquivo_path: path,
        arquivo_nome: arquivo.name,
        observacoes: observacoes.trim() || null,
        ativo: ativarAgora,
      });
      if (insErr) throw insErr;

      toast.success(ativarAgora ? "Modelo publicado e ativado" : "Modelo salvo (inativo)");
      setOpenNovo(false);
      resetForm();
      carregar();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  async function baixar(r: Modelo) {
    const { data, error } = await supabase.storage
      .from("contratos-modelo").createSignedUrl(r.arquivo_path, 60);
    if (error) { toast.error(error.message); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function ativar(r: Modelo) {
    setActing(r.id);
    const { error } = await supabase
      .from("contratos_modelo")
      .update({ ativo: true })
      .eq("id", r.id);
    setActing(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Modelo ativado");
    carregar();
  }

  async function excluir(r: Modelo) {
    if (r.ativo) { toast.error("Desative antes de excluir"); return; }
    if (!confirm(`Excluir modelo ${r.versao}? Essa ação não pode ser desfeita.`)) return;
    setActing(r.id);
    await supabase.storage.from("contratos-modelo").remove([r.arquivo_path]);
    const { error } = await supabase.from("contratos_modelo").delete().eq("id", r.id);
    setActing(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Modelo excluído");
    carregar();
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Contrato modelo (PDF)"
        description="Gerencie as versões do PDF oficial de contrato que os médicos baixam, assinam e reenviam."
      />

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Apenas <strong>1 modelo</strong> fica ativo por vez. Ativar uma versão desativa as anteriores automaticamente.
        </p>
        <Dialog open={openNovo} onOpenChange={(o) => { setOpenNovo(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Upload className="mr-2 h-4 w-4" />Nova versão</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Publicar novo modelo de contrato</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Versão</Label>
                  <Input placeholder="ex: v1.0" value={versao} onChange={(e) => setVersao(e.target.value)} />
                </div>
                <div className="flex items-end gap-2 text-sm">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={ativarAgora} onChange={(e) => setAtivarAgora(e.target.checked)} />
                    Ativar imediatamente
                  </label>
                </div>
              </div>
              <div>
                <Label>Título</Label>
                <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
              </div>
              <div>
                <Label>PDF do contrato</Label>
                <Input type="file" accept="application/pdf" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
                {arquivo && <p className="text-xs text-muted-foreground mt-1">{arquivo.name} · {(arquivo.size/1024/1024).toFixed(2)}MB</p>}
              </div>
              <div>
                <Label>Observações (opcional)</Label>
                <Textarea rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Notas internas sobre esta versão" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenNovo(false)}>Cancelar</Button>
              <Button onClick={salvar} disabled={salvando}>
                {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Publicar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : rows.length === 0 ? (
        <div className="card-elevated p-10 text-center text-muted-foreground">
          <FileText className="mx-auto h-10 w-10 mb-3 opacity-40" />
          Nenhum modelo publicado. Use "Nova versão" para enviar o primeiro PDF.
        </div>
      ) : (
        <div className="card-elevated overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr className="text-left text-muted-foreground">
                <th className="p-3">Versão</th>
                <th className="p-3">Título</th>
                <th className="p-3">Arquivo</th>
                <th className="p-3">Publicado</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-3 font-semibold">{r.versao}</td>
                  <td className="p-3">{r.titulo}</td>
                  <td className="p-3 text-xs text-muted-foreground">{r.arquivo_nome}</td>
                  <td className="p-3 text-xs">{r.publicado_em ? new Date(r.publicado_em).toLocaleString("pt-BR") : "—"}</td>
                  <td className="p-3">
                    {r.ativo ? (
                      <Badge className={cn("font-normal", "bg-green-500/15 text-green-700 dark:text-green-400")} variant="outline">
                        <CheckCircle2 className="h-3 w-3 mr-1" />Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="font-normal">Inativo</Badge>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => baixar(r)} title="Baixar PDF">
                        <Download className="h-4 w-4" />
                      </Button>
                      {!r.ativo && (
                        <Button size="sm" variant="ghost" className="text-amber-600" disabled={acting === r.id}
                          onClick={() => ativar(r)} title="Ativar este modelo">
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      {!r.ativo && (
                        <Button size="sm" variant="ghost" className="text-destructive" disabled={acting === r.id}
                          onClick={() => excluir(r)} title="Excluir">
                          <Trash2 className="h-4 w-4" />
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
    </div>
  );
}
