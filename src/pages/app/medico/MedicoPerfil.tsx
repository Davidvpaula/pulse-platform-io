import { useMemo, useState } from "react";
import { User, Save, Star, MapPin, Stethoscope } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

const Section = ({ title, icon: Icon, children, action }: { title: string; icon: typeof User; children: React.ReactNode; action?: React.ReactNode }) => (
  <section className="card-elevated p-6">
    <div className="mb-4 flex items-center justify-between gap-2 border-b border-border pb-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-display text-lg font-semibold">{title}</h3>
      </div>
      {action}
    </div>
    {children}
  </section>
);

export default function MedicoPerfil() {
  const [nome, setNome] = useState("Dr. Rafael Lasmar");
  const [crm, setCrm] = useState("CRM/MG 12345");
  const [especialidade, setEspecialidade] = useState("Cardiologia");
  const [bio, setBio] = useState("Cardiologista com 12 anos de atuação clínica. Foco em prevenção e telemedicina.");
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu perfil"
        description="Informações que aparecem no seu perfil público e nos cards do site."
        actions={
          <Button className="bg-gradient-primary hover:opacity-90" onClick={() => toast.success("Perfil atualizado")}>
            <Save className="mr-2 h-4 w-4" /> Salvar perfil
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr,420px]">
        <Section icon={User} title="Perfil profissional">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome completo">
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </Field>
            <Field label="CRM">
              <Input value={crm} onChange={(e) => setCrm(e.target.value)} />
            </Field>
            <Field label="Especialidade principal">
              <Input value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} />
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

            {/* Card estilo catálogo público */}
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
                    {especialidade || "Especialidade"}
                  </span>
                  <span>·</span>
                  <span>{crm || "CRM"}</span>
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

            <p className="mt-3 text-[11px] text-muted-foreground">
              ↑ Esta prévia é atualizada em tempo real conforme você edita ao lado.
            </p>
          </div>

          {/* Mini card alternativo (lista) */}
          <div className="card-elevated p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Em listas e busca
            </p>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
              <div className="h-12 w-12 overflow-hidden rounded-full bg-muted">
                {fotoUrl ? (
                  <img src={fotoUrl} alt={nome} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-primary text-sm font-semibold text-primary-foreground">
                    {iniciais}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{nome}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {especialidade} · {crm}
                </p>
              </div>
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">
                Disponível
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
