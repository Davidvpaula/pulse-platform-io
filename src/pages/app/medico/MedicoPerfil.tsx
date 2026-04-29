import { useEffect, useMemo, useState } from "react";
import { User, Save, Star, MapPin, Stethoscope, Video, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session";
import { getMedicoAtual, updateMedicoPerfil, type MedicoRow } from "@/lib/clinico";

const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
  <div>
    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
    <div className="mt-1.5">{children}</div>
    {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className={cn("w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary", p.className)} />
);

const Section = ({
  title,
  icon: Icon,
  children,
  action,
  tone,
}: {
  title: string;
  icon: typeof User;
  children: React.ReactNode;
  action?: React.ReactNode;
  tone?: "default" | "warning" | "success";
}) => (
  <section
    className={cn(
      "card-elevated p-6",
      tone === "warning" && "border-warning/40",
      tone === "success" && "border-success/40"
    )}
  >
    <div className="mb-4 flex items-center justify-between gap-2 border-b border-border pb-3">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", tone === "warning" ? "text-warning" : tone === "success" ? "text-success" : "text-primary")} />
        <h3 className="font-display text-lg font-semibold">{title}</h3>
      </div>
      {action}
    </div>
    {children}
  </section>
);

export default function MedicoPerfil() {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [medico, setMedico] = useState<MedicoRow | null>(null);

  // form state
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [bio, setBio] = useState("");
  const [linkSala, setLinkSala] = useState("");
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      // modo demo (sem login) — preenche com dados ilustrativos
      setNome("Dr. Rafael Lasmar");
      setTelefone("(31) 99999-0000");
      setBio("Cardiologista com 12 anos de atuação clínica. Foco em prevenção e telemedicina.");
      setLinkSala("");
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const m = await getMedicoAtual();
      if (m) {
        setMedico(m);
        setNome(m.nome ?? "");
        setTelefone(m.telefone ?? "");
        setBio(m.bio ?? "");
        setLinkSala(m.link_sala_padrao ?? "");
      }
      setLoading(false);
    })();
  }, [session]);

  const onPickFoto = (file: File | null) => {
    if (!file) {
      setFotoUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setFotoUrl(url);
  };

  const iniciais = useMemo(() => {
    const partes = nome.replace(/^Dr[a]?\.?\s*/i, "").trim().split(/\s+/);
    return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || "DR";
  }, [nome]);

  const linkValido = useMemo(() => {
    if (!linkSala.trim()) return null;
    return /^https:\/\/.+/i.test(linkSala.trim());
  }, [linkSala]);

  async function salvar() {
    if (!session) {
      toast.success("Perfil atualizado (modo demo)");
      return;
    }
    if (linkSala.trim() && linkValido === false) {
      toast.error("O link da sala precisa começar com https://");
      return;
    }
    setSaving(true);
    const res = await updateMedicoPerfil({
      nome: nome.trim(),
      telefone: telefone.trim() || null,
      bio: bio.trim() || null,
      link_sala_padrao: linkSala.trim() || null,
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error ?? "Erro ao salvar");
      return;
    }
    toast.success("Perfil atualizado");
  }

  const linkConfigurado = !!medico?.link_sala_padrao;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu perfil"
        description="Informações que aparecem no seu perfil público e configuração da sala de atendimento online."
        actions={
          <Button className="bg-gradient-primary hover:opacity-90" onClick={salvar} disabled={saving || loading}>
            <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando…" : "Salvar perfil"}
          </Button>
        }
      />

      {/* ─── Sala de atendimento online ─── */}
      <Section
        icon={Video}
        title="Sala de atendimento online"
        tone={session ? (linkConfigurado ? "success" : "warning") : "default"}
        action={
          session ? (
            linkConfigurado ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
                <CheckCircle2 className="h-3 w-3" /> Configurado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning">
                <AlertTriangle className="h-3 w-3" /> Pendente
              </span>
            )
          ) : null
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Cole abaixo o link fixo da sua sala (Google Meet, Zoom, Jitsi, etc.). Esse link será enviado automaticamente
            ao paciente em toda consulta online.
          </p>

          {!linkConfigurado && session && (
            <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-xs text-warning-foreground">
              <b>Atenção:</b> sem o link configurado, você <b>não consegue criar horários online</b>.
            </div>
          )}

          <Field label="Link da sala" hint="Precisa começar com https://. Ex.: https://meet.google.com/abc-defg-hij">
            <Input
              type="url"
              placeholder="https://meet.google.com/..."
              value={linkSala}
              onChange={(e) => setLinkSala(e.target.value)}
              className={cn(linkValido === false && "border-destructive focus:border-destructive")}
            />
          </Field>

          {linkValido && (
            <a
              href={linkSala}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Testar link
            </a>
          )}
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-[1fr,420px]">
        <Section icon={User} title="Perfil profissional">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome completo">
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </Field>
            <Field label="Telefone">
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
            </Field>
            <Field label="CRM">
              <Input value={medico ? `${medico.crm} / ${medico.crm_estado}` : ""} disabled />
            </Field>
            <Field label="Especialidade principal">
              <Input value={medico?.especialidade ?? ""} disabled />
            </Field>
            <Field label="Foto de perfil" hint="Recomendado: 400×400px, fundo neutro, rosto centralizado.">
              <Input type="file" accept="image/*" onChange={(e) => onPickFoto(e.target.files?.[0] ?? null)} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Bio">
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </Field>
            </div>
          </div>
        </Section>

        {/* Prévia ao vivo */}
        <div className="space-y-4">
          <div className="card-elevated p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                Prévia
              </span>
              <h4 className="text-sm font-semibold">Como você aparecerá no site</h4>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="relative h-24 bg-gradient-primary" />
              <div className="px-5 pb-5">
                <div className="-mt-10 mb-3 flex items-end gap-3">
                  <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-card bg-muted shadow-sm">
                    {fotoUrl ? (
                      <img src={fotoUrl} alt={nome} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-primary text-lg font-semibold text-primary-foreground">
                        {iniciais}
                      </div>
                    )}
                  </div>
                  <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                    <span className="font-medium text-foreground">4.9</span>
                    <span>· 128 avaliações</span>
                  </div>
                </div>

                <h5 className="font-display text-base font-semibold leading-tight">{nome || "Nome do médico"}</h5>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Stethoscope className="h-3 w-3" />
                    {medico?.especialidade || "Especialidade"}
                  </span>
                  <span>·</span>
                  <span>{medico ? `${medico.crm}/${medico.crm_estado}` : "CRM"}</span>
                </div>
                <p className="mt-3 line-clamp-3 text-xs text-muted-foreground">
                  {bio || "Adicione uma bio para que pacientes conheçam sua atuação."}
                </p>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MapPin className="h-3 w-3" /> Telemedicina
                  </span>
                  <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                    Agendar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
