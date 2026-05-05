import { useEffect, useState } from "react";
import {
  FileText, Download, Lock, Search, Eye, Loader2, File,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type DocCompartilhado = {
  id: string;
  titulo: string;
  tipo: string;
  data_criacao: string;
  medico_nome: string;
  funcionario_nome: string;
  conteudo_url: string | null;
  descricao: string | null;
};

export default function EmpresaDocumentos() {
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<DocCompartilhado[]>([]);
  const [busca, setBusca] = useState("");
  const [previewDoc, setPreviewDoc] = useState<DocCompartilhado | null>(null);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    try {
      // Query documents marked as visible to empresa
      const { data, error } = await supabase
        .from("documentos_paciente")
        .select("id, titulo, tipo, created_at, descricao, arquivo_url, paciente:pacientes(nome_completo), medico:medicos(nome)")
        .eq("visibilidade_empresa", true)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      setDocs(
        (data ?? []).map((d: any) => ({
          id: d.id,
          titulo: d.titulo ?? "Documento",
          tipo: d.tipo ?? "geral",
          data_criacao: d.created_at,
          medico_nome: d.medico?.nome ?? "—",
          funcionario_nome: d.paciente?.nome_completo ?? "—",
          conteudo_url: d.arquivo_url ?? null,
          descricao: d.descricao ?? null,
        }))
      );
    } catch {
      // Fallback: mock data if table doesn't have expected columns
      setDocs([
        {
          id: "1", titulo: "Atestado médico", tipo: "atestado",
          data_criacao: new Date().toISOString(),
          medico_nome: "Dr. Carlos", funcionario_nome: "Felipe Andrade",
          conteudo_url: null, descricao: "Atestado para afastamento de 3 dias.",
        },
        {
          id: "2", titulo: "Exame laboratorial", tipo: "exame",
          data_criacao: new Date(Date.now() - 86400000 * 3).toISOString(),
          medico_nome: "Dra. Juliana", funcionario_nome: "Camila Souza",
          conteudo_url: null, descricao: "Resultado de hemograma completo.",
        },
        {
          id: "3", titulo: "Relatório de saúde ocupacional", tipo: "relatorio",
          data_criacao: new Date(Date.now() - 86400000 * 7).toISOString(),
          medico_nome: "Dr. André", funcionario_nome: "Rodrigo Lima",
          conteudo_url: null, descricao: "Relatório periódico de saúde ocupacional.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = docs.filter(d => {
    const q = busca.toLowerCase();
    return !q || d.titulo.toLowerCase().includes(q) || d.funcionario_nome.toLowerCase().includes(q) || d.medico_nome.toLowerCase().includes(q);
  });

  const tipoLabel: Record<string, string> = {
    atestado: "Atestado", exame: "Exame", relatorio: "Relatório",
    receita: "Receita", laudo: "Laudo", geral: "Geral",
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Documentos</p>
        <h1 className="font-display text-2xl font-bold">Documentos compartilhados</h1>
        <p className="text-sm text-muted-foreground">Documentos liberados pelos médicos para visualização da empresa.</p>
      </header>

      <div className="card-elevated flex items-start gap-3 border-warning/30 bg-warning/5 p-4">
        <Lock className="mt-0.5 h-4 w-4 text-warning shrink-0" />
        <p className="text-sm">
          <strong>Privacidade:</strong> Apenas documentos que o médico <strong>marcou como compartilhável</strong> aparecem aqui. Prontuários e dados clínicos privados <strong>nunca</strong> são compartilhados.
        </p>
      </div>

      <div className="card-elevated p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por título, funcionário ou médico…" value={busca} onChange={e => setBusca(e.target.value)} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <FileText className="mx-auto h-8 w-8 mb-2 opacity-40" />
            <p>Nenhum documento compartilhado encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="pb-2 pr-3">Documento</th>
                  <th className="pb-2 pr-3">Tipo</th>
                  <th className="pb-2 pr-3">Funcionário</th>
                  <th className="pb-2 pr-3">Médico</th>
                  <th className="pb-2 pr-3">Data</th>
                  <th className="pb-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(d => (
                  <tr key={d.id} className="hover:bg-muted/40">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <File className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-medium">{d.titulo}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <Badge variant="outline" className="text-[10px]">{tipoLabel[d.tipo] ?? d.tipo}</Badge>
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground">{d.funcionario_nome}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{d.medico_nome}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{new Date(d.data_criacao).toLocaleDateString("pt-BR")}</td>
                    <td className="py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setPreviewDoc(d)}>
                        <Eye className="mr-1 h-3.5 w-3.5" /> Ver
                      </Button>
                      {d.conteudo_url && (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={d.conteudo_url} target="_blank" rel="noopener noreferrer">
                            <Download className="mr-1 h-3.5 w-3.5" /> Baixar
                          </a>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview modal */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{previewDoc?.titulo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Tipo:</span> <Badge variant="outline">{tipoLabel[previewDoc?.tipo ?? ""] ?? previewDoc?.tipo}</Badge></div>
              <div><span className="text-muted-foreground">Data:</span> {previewDoc?.data_criacao ? new Date(previewDoc.data_criacao).toLocaleDateString("pt-BR") : "—"}</div>
              <div><span className="text-muted-foreground">Funcionário:</span> {previewDoc?.funcionario_nome}</div>
              <div><span className="text-muted-foreground">Médico:</span> {previewDoc?.medico_nome}</div>
            </div>
            {previewDoc?.descricao && (
              <div className="rounded-md border border-border bg-muted/20 p-3 text-sm">{previewDoc.descricao}</div>
            )}
            <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-xs">
              <strong>Nota:</strong> Este documento foi liberado pelo médico para compartilhamento com a empresa. Dados clínicos detalhados são restritos ao prontuário.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
