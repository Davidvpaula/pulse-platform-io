import { useEffect, useState } from "react";
import { FileText, Upload, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { toast } from "sonner";

type Nfe = {
  id: string;
  saque_id: string | null;
  arquivo_url: string;
  numero_nota: string | null;
  valor_centavos: number | null;
  status: string;
  created_at: string;
};

const STATUS_MAP: Record<string, { label: string; variant: "default" | "outline" | "secondary" | "destructive" }> = {
  pendente: { label: "Pendente", variant: "secondary" },
  aprovada: { label: "Aprovada", variant: "default" },
  rejeitada: { label: "Rejeitada", variant: "destructive" },
};

export function MedicoDocumentosFiscais({ medicoId }: { medicoId: string }) {
  const { session } = useSession();
  const [nfes, setNfes] = useState<Nfe[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    load();
  }, [medicoId]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("medico_nfes")
      .select("*")
      .eq("medico_id", medicoId)
      .order("created_at", { ascending: false })
      .limit(100);
    setNfes((data as any[]) ?? []);
    setLoading(false);
  }

  async function uploadAvulso() {
    if (!file || !session) return;
    setUploading(true);
    const path = `${session.user.id}/avulso_${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from("medico-nfes").upload(path, file);
    if (upErr) {
      toast.error("Erro ao enviar arquivo");
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("medico-nfes").getPublicUrl(path);
    await supabase.from("medico_nfes").insert({
      medico_id: medicoId,
      arquivo_url: urlData.publicUrl,
    });
    toast.success("Documento fiscal enviado");
    setFile(null);
    setUploading(false);
    load();
  }

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-4 w-4 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Upload avulso */}
      <div className="rounded-lg border border-border p-4 space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" /> Enviar documento fiscal avulso
        </h4>
        <p className="text-xs text-muted-foreground">
          Envie notas fiscais independentes de saques. Formatos aceitos: PDF, XML, JPG, PNG.
        </p>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label className="text-xs">Arquivo</Label>
            <Input type="file" accept=".pdf,.xml,.jpg,.png" onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <Button size="sm" onClick={uploadAvulso} disabled={!file || uploading} className="bg-gradient-primary">
            {uploading ? "Enviando…" : "Enviar"}
          </Button>
        </div>
      </div>

      {/* Lista */}
      {nfes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum documento fiscal enviado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Data</th>
                <th className="px-4 py-2 text-left">Vinculado a saque</th>
                <th className="px-4 py-2 text-left">Nº Nota</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Ação</th>
              </tr>
            </thead>
            <tbody>
              {nfes.map(nfe => {
                const st = STATUS_MAP[nfe.status] ?? { label: nfe.status, variant: "outline" as const };
                return (
                  <tr key={nfe.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {new Date(nfe.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-2.5">
                      {nfe.saque_id ? (
                        <Badge variant="outline" className="border-info/40 text-info text-[10px]">Sim</Badge>
                      ) : (
                        <Badge variant="outline" className="border-muted text-muted-foreground text-[10px]">Avulso</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs">{nfe.numero_nota ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={st.variant} className="text-[10px]">{st.label}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <a href={nfe.arquivo_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <Download className="h-3 w-3" /> Baixar
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
