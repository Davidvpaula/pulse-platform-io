import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, UploadCloud, X, ShieldCheck, Loader2 } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ESTADOS_BR, DOC_LABEL,
  uploadDocumento,
  type DocKind, type DocumentoMedico,
} from "@/lib/medicoRegistro";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const REQUIRED_DOCS: DocKind[] = ["crm", "documento_pessoal"];

type LocalDoc = DocumentoMedico & { _file?: File };

export default function CadastroMedico() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [medicoId, setMedicoId] = useState<string | null>(null);
  const [medicoNome, setMedicoNome] = useState("");
  const [medicoCrm, setMedicoCrm] = useState("");
  const [medicoCrmEstado, setMedicoCrmEstado] = useState("");
  const [needsCrmEstado, setNeedsCrmEstado] = useState(false);
  const [docs, setDocs] = useState<Record<DocKind, LocalDoc | undefined>>({
    crm: undefined, rqe: undefined, documento_pessoal: undefined, selfie: undefined,
  });
  const [docError, setDocError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        toast({ title: "Faça login primeiro", description: "Crie sua conta como médico para enviar seus documentos.", variant: "destructive" });
        navigate("/auth?modo=cadastro", { replace: true });
        return;
      }
      const uid = data.session.user.id;
      setUserId(uid);

      // Busca registro do médico (criado automaticamente no signup)
      const { data: med } = await supabase
        .from("medicos")
        .select("id, nome, crm, crm_estado, documentos, status")
        .eq("user_id", uid)
        .maybeSingle();

      if (!med) {
        toast({ title: "Cadastro médico não encontrado", description: "Crie sua conta como médico primeiro.", variant: "destructive" });
        navigate("/auth?modo=cadastro", { replace: true });
        return;
      }

      // Já enviou documentos? Redireciona para status
      if (med.documentos && Array.isArray(med.documentos) && med.documentos.length > 0) {
        navigate("/app/medico/aguardando-aprovacao", { replace: true });
        return;
      }

      setMedicoId(med.id);
      setMedicoNome(med.nome);
      setMedicoCrm(med.crm);
      setMedicoCrmEstado(med.crm_estado || "");
      setNeedsCrmEstado(!med.crm_estado);
    });
  }, [navigate]);

  const completude = useMemo(() => {
    const docsOk = REQUIRED_DOCS.filter(k => docs[k]).length;
    const crmEstadoOk = medicoCrmEstado ? 1 : 0;
    const total = REQUIRED_DOCS.length + (needsCrmEstado ? 1 : 0);
    return Math.round(((docsOk + (needsCrmEstado ? crmEstadoOk : 0)) / total) * 100);
  }, [docs, medicoCrmEstado, needsCrmEstado]);

  function handleFile(kind: DocKind, file: File | null) {
    if (!file) { setDocs(p => ({ ...p, [kind]: undefined })); return; }
    if (!ALLOWED_MIME.includes(file.type)) {
      toast({ title: "Formato inválido", description: "Envie JPG, PNG, WEBP ou PDF.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "Arquivo muito grande", description: "Limite de 8 MB por arquivo.", variant: "destructive" });
      return;
    }
    setDocs(p => ({
      ...p,
      [kind]: {
        kind, fileName: file.name, size: file.size, mimeType: file.type,
        storagePath: "", uploadedAt: new Date().toISOString(),
        _file: file,
      },
    }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !medicoId) return;
    setDocError("");

    const faltando = REQUIRED_DOCS.filter(k => !docs[k]);
    if (faltando.length) {
      setDocError(`Envie: ${faltando.map(k => DOC_LABEL[k]).join(", ")}`);
      return;
    }

    if (needsCrmEstado && !medicoCrmEstado) {
      setDocError("Selecione o estado do CRM.");
      return;
    }

    setSubmitting(true);
    try {
      // Upload docs
      const uploaded: DocumentoMedico[] = [];
      for (const d of Object.values(docs)) {
        if (!d || !d._file) continue;
        const meta = await uploadDocumento(userId, d.kind, d._file);
        uploaded.push(meta);
      }

      // Atualiza registro do médico com documentos e crm_estado se necessário
      const updatePayload: Record<string, unknown> = { documentos: uploaded };
      if (needsCrmEstado && medicoCrmEstado) {
        updatePayload.crm_estado = medicoCrmEstado;
      }

      const { error } = await supabase
        .from("medicos")
        .update(updatePayload)
        .eq("id", medicoId);

      if (error) throw error;

      toast({
        title: "Documentos enviados!",
        description: "Aguarde a aprovação da equipe Lasmar. Você receberá um aviso por e-mail.",
      });
      navigate("/app/medico/aguardando-aprovacao", { replace: true });
    } catch (err: unknown) {
      toast({
        title: "Não foi possível enviar",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      title="Envio de documentos"
      subtitle={medicoNome ? `${medicoNome} · CRM ${medicoCrm}` : "Complete seu cadastro profissional enviando seus documentos para análise."}
    >
      <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          {needsCrmEstado && (
            <section className="card-elevated p-6">
              <h2 className="font-semibold">Estado do CRM</h2>
              <p className="mt-1 text-sm text-muted-foreground">Informe o estado de registro do seu CRM.</p>
              <div className="mt-4 max-w-xs">
                <Label htmlFor="crm-estado">UF do CRM <span className="text-destructive">*</span></Label>
                <Select value={medicoCrmEstado} onValueChange={setMedicoCrmEstado}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione o estado" /></SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BR.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </section>
          )}

          <section className="card-elevated p-6">
            <h2 className="font-semibold">Documentos</h2>
            <p className="mt-1 text-sm text-muted-foreground">Aceitos: JPG, PNG, WEBP ou PDF · até 8 MB por arquivo.</p>
            <div className="mt-5 grid gap-3">
              <DocUpload kind="crm" required doc={docs.crm} onFile={f => handleFile("crm", f)} />
              <DocUpload kind="documento_pessoal" required doc={docs.documento_pessoal} onFile={f => handleFile("documento_pessoal", f)} />
              <DocUpload kind="rqe" doc={docs.rqe} onFile={f => handleFile("rqe", f)} />
              <DocUpload kind="selfie" doc={docs.selfie} onFile={f => handleFile("selfie", f)} />
            </div>
            {docError && <p className="mt-3 text-sm text-destructive">{docError}</p>}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card-elevated p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Completude</p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-gradient-primary transition-all" style={{ width: `${completude}%` }} />
            </div>
            <p className="mt-2 text-2xl font-bold">{completude}%</p>
            <ul className="mt-4 space-y-2 text-sm">
              {[
                ["Documento CRM", !!docs.crm],
                ["Documento pessoal", !!docs.documento_pessoal],
                ...(needsCrmEstado ? [["Estado do CRM", !!medicoCrmEstado] as [string, boolean]] : []),
              ].map(([l, ok]) => (
                <li key={String(l)} className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${ok ? "text-success" : "text-muted-foreground/40"}`} />
                  <span className={ok ? "text-foreground" : "text-muted-foreground"}>{l}</span>
                </li>
              ))}
            </ul>
            <Button type="submit" disabled={submitting || !userId} className="mt-5 w-full bg-gradient-primary hover:opacity-90">
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : "Enviar para aprovação"}
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Após o envio, sua conta entrará em análise. O acesso aos atendimentos só é liberado depois da aprovação.
            </p>
          </div>
          <div className="card-elevated p-5">
            <p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> Seguro e auditado</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Documentos ficam em armazenamento privado. Todas as ações de aprovação são registradas em log de auditoria.
            </p>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Já tem cadastro? <Link to="/auth" className="font-semibold text-primary hover:underline">Entrar</Link>
          </p>
        </aside>
      </form>

      <style>{`.input{width:100%;border:1px solid hsl(var(--input));background:hsl(var(--background));border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem}.input:focus{outline:none;border-color:hsl(var(--ring));box-shadow:0 0 0 3px hsl(var(--ring)/0.2)}`}</style>
    </PageShell>
  );
}

function DocUpload({ kind, doc, onFile, required }: {
  kind: DocKind; doc?: LocalDoc; onFile: (f: File | null) => void; required?: boolean;
}) {
  const id = `doc-${kind}`;
  return (
    <div className="rounded-lg border border-dashed border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {DOC_LABEL[kind]}
            {required && <span className="ml-1 text-destructive">*</span>}
          </p>
          {doc ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {doc.fileName} · {(doc.size / 1024).toFixed(0)} KB
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Nenhum arquivo enviado</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {doc && (
            <button type="button" onClick={() => onFile(null)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Remover">
              <X className="h-4 w-4" />
            </button>
          )}
          <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted">
            <UploadCloud className="h-3.5 w-3.5" />
            {doc ? "Trocar" : "Enviar"}
          </label>
          <input id={id} type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => onFile(e.target.files?.[0] ?? null)} />
        </div>
      </div>
    </div>
  );
}
