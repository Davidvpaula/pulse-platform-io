import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { CheckCircle2, UploadCloud, X, ShieldCheck, Loader2 } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ESPECIALIDADES, ESTADOS_BR, DOC_LABEL,
  createMedico, uploadDocumento,
  type DocKind, type DocumentoMedico,
} from "@/lib/medicoRegistro";
import { cpfSchema, maskCpf } from "@/lib/validation/cpf";

const schema = z.object({
  nome: z.string().trim().min(3, "Informe seu nome completo").max(120),
  cpf: cpfSchema(),
  dataNascimento: z.string().refine(
    v => !!v && !Number.isNaN(Date.parse(v + "T00:00:00")),
    "Data de nascimento inválida",
  ),
  crm: z.string().trim().min(3, "CRM inválido").max(20),
  ufCrm: z.string().refine(v => ESTADOS_BR.includes(v), "Selecione o estado"),
  especialidade: z.string().min(1, "Selecione a especialidade"),
  telefone: z.string().trim().min(10, "Telefone inválido").max(20),
  email: z.string().trim().email("E-mail inválido").max(255),
});
type FormData = z.infer<typeof schema>;

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const REQUIRED_DOCS: DocKind[] = ["crm", "documento_pessoal"];

type LocalDoc = DocumentoMedico & { _file?: File };
type FieldErrors = Partial<Record<keyof FormData | "documentos", string>>;

export default function CadastroMedico() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [form, setForm] = useState({
    nome: "", cpf: "", dataNascimento: "", crm: "", ufCrm: "", especialidade: "",
    telefone: "", email: "",
  });
  const [docs, setDocs] = useState<Record<DocKind, LocalDoc | undefined>>({
    crm: undefined, rqe: undefined, documento_pessoal: undefined, selfie: undefined,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // só pode cadastrar se estiver logado como médico
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        toast({ title: "Faça login primeiro", description: "Crie sua conta como médico para enviar seus documentos.", variant: "destructive" });
        navigate("/auth?modo=cadastro", { replace: true });
        return;
      }
      const uid = data.session.user.id;
      setUserId(uid);
      setUserEmail(data.session.user.email ?? "");

      // pré-preenche com profile
      const { data: prof } = await supabase.from("profiles").select("nome, telefone, email").eq("id", uid).maybeSingle();
      setForm(p => ({
        ...p,
        nome: prof?.nome || p.nome,
        telefone: prof?.telefone || p.telefone,
        email: prof?.email || data.session?.user.email || p.email,
      }));

      // se já tem cadastro, manda pra tela de status
      const { data: existing } = await supabase.from("medicos").select("id, status").eq("user_id", uid).maybeSingle();
      if (existing) {
        navigate("/app/medico/aguardando-aprovacao", { replace: true });
      }
    });
  }, [navigate]);

  const completude = useMemo(() => {
    const fields = Object.values(form).filter(Boolean).length;
    const docsOk = REQUIRED_DOCS.filter(k => docs[k]).length;
    const total = Object.keys(form).length + REQUIRED_DOCS.length;
    return Math.round(((fields + docsOk) / total) * 100);
  }, [form, docs]);

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

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
    if (!userId) return;
    setErrors({});
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fe: FieldErrors = {};
      for (const issue of parsed.error.issues) fe[issue.path[0] as keyof FieldErrors] = issue.message;
      setErrors(fe);
      return;
    }
    const faltando = REQUIRED_DOCS.filter(k => !docs[k]);
    if (faltando.length) {
      setErrors({ documentos: `Envie: ${faltando.map(k => DOC_LABEL[k]).join(", ")}` });
      return;
    }

    setSubmitting(true);
    try {
      // 1) upload de cada doc para Storage
      const uploaded: DocumentoMedico[] = [];
      for (const d of Object.values(docs)) {
        if (!d || !d._file) continue;
        const meta = await uploadDocumento(userId, d.kind, d._file);
        uploaded.push(meta);
      }

      // 2) inserir registro do médico
      const data = parsed.data;
      await createMedico({
        user_id: userId,
        nome: data.nome,
        email: data.email || userEmail,
        telefone: data.telefone,
        crm: data.crm,
        crm_estado: data.ufCrm,
        especialidade: data.especialidade,
        cpf: data.cpf,
        data_nascimento: data.dataNascimento,
        documentos: uploaded,
      });

      toast({
        title: "Cadastro enviado!",
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
      title="Cadastro médico"
      subtitle="Complete seus dados profissionais e envie seus documentos para análise da equipe Lasmar."
    >
      <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <section className="card-elevated p-6">
            <h2 className="font-semibold">Dados profissionais</h2>
            <p className="mt-1 text-sm text-muted-foreground">Validamos esses dados antes de liberar o acesso.</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Nome completo" error={errors.nome}>
                <input className="input" value={form.nome} onChange={e => set("nome", e.target.value)} placeholder="Dr. João da Silva" />
              </Field>
              <Field label="CPF" error={errors.cpf}>
                <input
                  className="input"
                  value={form.cpf}
                  onChange={e => set("cpf", maskCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  maxLength={14}
                />
              </Field>
              <Field label="Data de nascimento" error={errors.dataNascimento}>
                <input
                  type="date"
                  className="input"
                  value={form.dataNascimento}
                  onChange={e => set("dataNascimento", e.target.value)}
                />
              </Field>
              <Field label="Especialidade" error={errors.especialidade}>
                <select className="input" value={form.especialidade} onChange={e => set("especialidade", e.target.value)}>
                  <option value="">Selecione...</option>
                  {ESPECIALIDADES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="CRM" error={errors.crm}>
                <input className="input" value={form.crm} onChange={e => set("crm", e.target.value)} placeholder="123456" />
              </Field>
              <Field label="Estado do CRM" error={errors.ufCrm}>
                <select className="input" value={form.ufCrm} onChange={e => set("ufCrm", e.target.value)}>
                  <option value="">UF</option>
                  {ESTADOS_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </Field>
              <Field label="Telefone" error={errors.telefone}>
                <input className="input" value={form.telefone} onChange={e => set("telefone", e.target.value)} placeholder="(11) 90000-0000" />
              </Field>
              <Field label="E-mail" error={errors.email}>
                <input type="email" className="input" value={form.email} onChange={e => set("email", e.target.value)} placeholder="voce@email.com" />
              </Field>
            </div>
          </section>

          <section className="card-elevated p-6">
            <h2 className="font-semibold">Documentos</h2>
            <p className="mt-1 text-sm text-muted-foreground">Aceitos: JPG, PNG, WEBP ou PDF · até 8 MB por arquivo.</p>
            <div className="mt-5 grid gap-3">
              <DocUpload kind="crm" required doc={docs.crm} onFile={f => handleFile("crm", f)} />
              <DocUpload kind="documento_pessoal" required doc={docs.documento_pessoal} onFile={f => handleFile("documento_pessoal", f)} />
              <DocUpload kind="rqe" doc={docs.rqe} onFile={f => handleFile("rqe", f)} />
              <DocUpload kind="selfie" doc={docs.selfie} onFile={f => handleFile("selfie", f)} />
            </div>
            {errors.documentos && <p className="mt-3 text-sm text-destructive">{errors.documentos}</p>}
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
                ["Dados profissionais", Object.values(form).every(Boolean)],
                ["Documento CRM", !!docs.crm],
                ["Documento pessoal", !!docs.documento_pessoal],
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

function Field({ label, error, children, className }: {
  label: string; error?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </label>
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
