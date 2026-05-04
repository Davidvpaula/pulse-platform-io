import { useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { uploadDocumentoPaciente, type DocumentoPacienteTipo } from "@/lib/clinico";
import { toast } from "sonner";

const TIPO_LABEL: Record<DocumentoPacienteTipo, string> = {
  exame: "Exames", laudo: "Laudos", receita: "Receitas",
  identidade: "Identidade", plano: "Plano de saúde", vacina: "Vacinas", outro: "Outros",
};

export default function UploadDialogContent({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [tipo, setTipo] = useState<DocumentoPacienteTipo>("exame");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (!file) { toast.error("Selecione um arquivo."); return; }
    if (!titulo.trim()) { toast.error("Informe um título."); return; }
    setEnviando(true);
    const r = await uploadDocumentoPaciente({ file, tipo, titulo, descricao });
    setEnviando(false);
    if (!r.ok) { toast.error(r.error ?? "Falha no envio."); return; }
    toast.success("Documento anexado.");
    setFile(null); setTitulo(""); setDescricao(""); setTipo("exame");
    onSaved();
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Anexar documento</DialogTitle>
        <DialogDescription>
          PDF ou imagem (JPG/PNG), até 20 MB. Os arquivos ficam vinculados ao seu cadastro.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Arquivo *</Label>
          <Input type="file" accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              if (f && !titulo) setTitulo(f.name.replace(/\.[^.]+$/, ""));
            }} />
          {file && (
            <p className="text-[11px] text-muted-foreground">
              {file.name} · {(file.size / 1024).toFixed(0)} KB
            </p>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Categoria</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as DocumentoPacienteTipo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(TIPO_LABEL) as DocumentoPacienteTipo[]).map((k) => (
                  <SelectItem key={k} value={k}>{TIPO_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Título *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Hemograma 03/2026" maxLength={120} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Descrição (opcional)</Label>
          <Textarea rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)}
            placeholder="Notas sobre o documento" maxLength={500} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={enviando}>Cancelar</Button>
        <Button onClick={enviar} disabled={enviando} className="bg-gradient-primary hover:opacity-90">
          {enviando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando…</> : <><Upload className="mr-2 h-4 w-4" /> Enviar</>}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
