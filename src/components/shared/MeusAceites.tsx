import { useEffect, useState } from "react";
import { Download, Eye, FileText, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  listarMeusAceites, TERMO_TIPO_LABELS, type TermoRow,
} from "@/lib/termos";

type AceiteComTermo = Awaited<ReturnType<typeof listarMeusAceites>>[number];

function downloadHtml(titulo: string, versao: number, conteudo: string) {
  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${titulo} — v${versao}</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;line-height:1.6}
h1{font-size:1.4rem;border-bottom:1px solid #ccc;padding-bottom:.5rem}</style></head>
<body><h1>${titulo} <small>(v${versao})</small></h1>${conteudo}</body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${titulo.replace(/\s+/g, "_")}_v${versao}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MeusAceites() {
  const [loading, setLoading] = useState(true);
  const [aceites, setAceites] = useState<AceiteComTermo[]>([]);
  const [preview, setPreview] = useState<AceiteComTermo | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await listarMeusAceites();
        setAceites(data);
      } catch (e: any) {
        toast.error("Erro ao carregar aceites: " + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando seus termos aceitos…
      </div>
    );
  }

  if (aceites.length === 0) {
    return (
      <div className="card-elevated flex flex-col items-center gap-3 p-12 text-center">
        <Shield className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Você ainda não aceitou nenhum termo.</p>
      </div>
    );
  }

  return (
    <>
      <section className="card-elevated p-6 space-y-4">
        <header className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="font-display text-lg font-semibold">Termos aceitos</h3>
          <Badge variant="secondary" className="ml-auto">{aceites.length}</Badge>
        </header>

        <div className="divide-y divide-border rounded-lg border">
          {aceites.map((a) => {
            const t = a.termos_condicoes;
            return (
              <div key={a.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">
                    {t?.titulo ?? "Termo removido"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t ? TERMO_TIPO_LABELS[t.tipo as keyof typeof TERMO_TIPO_LABELS] ?? t.tipo : "—"}
                    {t && <> • v{t.versao}</>}
                    {" • "}Aceito em {new Date(a.aceito_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {t?.conteudo && (
                    <>
                      <Button size="icon" variant="ghost" title="Visualizar" onClick={() => setPreview(a)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" title="Baixar HTML"
                        onClick={() => downloadHtml(t.titulo, t.versao, t.conteudo)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Preview dialog */}
      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {preview?.termos_condicoes?.titulo} (v{preview?.termos_condicoes?.versao})
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mb-3">
            Aceito em {preview && new Date(preview.aceito_em).toLocaleString("pt-BR")}
          </p>
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: preview?.termos_condicoes?.conteudo ?? "" }}
          />
          <div className="flex justify-end mt-4">
            <Button variant="outline" size="sm"
              onClick={() => {
                const t = preview?.termos_condicoes;
                if (t) downloadHtml(t.titulo, t.versao, t.conteudo);
              }}>
              <Download className="h-4 w-4 mr-2" /> Baixar HTML
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
