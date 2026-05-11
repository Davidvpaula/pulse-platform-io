import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, X, ImageIcon } from "lucide-react";
import { processServiceImage } from "@/lib/imageProcessing";

interface Props {
  servicoId?: string;
  value: string | null;
  onChange: (url: string | null) => void;
}

export default function ServicoImagemUploader({ servicoId, value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const processed = await processServiceImage(file);
      setPreview(processed.previewUrl);

      const folder = servicoId ?? `tmp-${crypto.randomUUID()}`;
      const path = `${folder}/${crypto.randomUUID()}.${processed.ext}`;
      const { error: upErr } = await supabase.storage
        .from("servico-imagens")
        .upload(path, processed.blob, { contentType: processed.mime, upsert: true, cacheControl: "31536000" });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("servico-imagens").getPublicUrl(path);
      onChange(pub.publicUrl);
      toast({ title: "Imagem enviada" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar imagem", description: err?.message ?? String(err), variant: "destructive" });
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }, [servicoId, onChange]);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  async function remove() {
    onChange(null);
    setPreview(null);
    // Best-effort: tenta remover do bucket se ainda for url do bucket
    if (value && value.includes("/servico-imagens/")) {
      try {
        const path = value.split("/servico-imagens/")[1]?.split("?")[0];
        if (path) await supabase.storage.from("servico-imagens").remove([path]);
      } catch { /* silencioso */ }
    }
  }

  const displayUrl = preview ?? value;

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative aspect-[16/10] w-full overflow-hidden rounded-xl border-2 border-dashed transition ${
          dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30"
        }`}
      >
        {uploading ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/70 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Otimizando e enviando…</p>
          </div>
        ) : null}

        {displayUrl ? (
          <img
            src={displayUrl}
            alt="Preview do serviço"
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ImageIcon className="h-10 w-10 opacity-60" />
            <p className="text-sm font-medium">Arraste uma imagem ou clique para enviar</p>
            <p className="text-[11px]">PNG, JPG, WEBP · será recortada para 16:10 · até 8 MB</p>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={onPick}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {displayUrl ? "Substituir imagem" : "Enviar imagem"}
        </Button>
        {displayUrl && !uploading && (
          <Button type="button" size="sm" variant="ghost" onClick={remove}>
            <X className="h-4 w-4 mr-2" /> Remover
          </Button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        A imagem será comprimida automaticamente (WebP, máx 1600×1000) para manter o site rápido.
      </p>
    </div>
  );
}
