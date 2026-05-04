import { useEffect, useMemo, useState } from "react";
import { User, Save, Star, MapPin, Stethoscope, Landmark, FileText, Receipt, Upload, GraduationCap, Plus, Trash2, Award } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session";
import { getMedicoAtual, updateMedicoPerfil, type MedicoRow } from "@/lib/clinico";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MedicoDadosPessoais } from "@/components/medico/MedicoDadosPessoais";
import { MedicoDadosBancarios } from "@/components/medico/MedicoDadosBancarios";
import { MedicoDocumentosFiscais } from "@/components/medico/MedicoDocumentosFiscais";
import MeusAceites from "@/components/shared/MeusAceites";

/* ── Formação type ── */
type Formacao = {
  id?: string;
  titulo: string;
  instituicao: string;
  status: "concluido" | "em_andamento";
  ordem: number;
};

const EMPTY_FORMACAO = (ordem: number): Formacao => ({
  titulo: "", instituicao: "", status: "concluido", ordem,
});

export default function MedicoPerfil() {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [medico, setMedico] = useState<MedicoRow | null>(null);
  const [nome, setNome] = useState("");
  
  const [bio, setBio] = useState("");
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  // Formações
  const [formacoes, setFormacoes] = useState<Formacao[]>([]);
  const [savingFormacoes, setSavingFormacoes] = useState(false);

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const m = await getMedicoAtual();
      if (m) {
        setMedico(m);
        setNome(m.nome ?? "");
        // telefone is managed in Dados Pessoais
        setBio(m.bio ?? "");
        setFotoUrl((m as any).foto_url ?? null);
        loadFormacoes(m.id);
      }
      setLoading(false);
    })();
  }, [session]);

  async function loadFormacoes(medicoId: string) {
    const { data } = await supabase
      .from("medico_formacoes")
      .select("*")
      .eq("medico_id", medicoId)
      .order("ordem");
    if (data) {
      setFormacoes(data.map((r: any) => ({
        id: r.id, titulo: r.titulo, instituicao: r.instituicao,
        status: r.status, ordem: r.ordem,
      })));
    }
  }

  const iniciais = useMemo(() => {
    const partes = nome.replace(/^Dr[a]?\.?\s*/i, "").trim().split(/\s+/);
    return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || "DR";
  }, [nome]);

  const displayFoto = fotoPreview ?? fotoUrl;

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { toast.error("A foto deve ter no máximo 2MB."); return; }
    setFotoFile(f);
    setFotoPreview(URL.createObjectURL(f));
  }

  async function uploadFoto(): Promise<string | null> {
    if (!fotoFile || !session) return fotoUrl;
    setUploadingFoto(true);
    const ext = fotoFile.name.split(".").pop() ?? "jpg";
    const path = `${session.user.id}/avatar_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("medico-avatars").upload(path, fotoFile, { upsert: true });
    setUploadingFoto(false);
    if (error) { toast.error("Erro ao enviar foto: " + error.message); return fotoUrl; }
    const { data: urlData } = supabase.storage.from("medico-avatars").getPublicUrl(path);
    return urlData.publicUrl;
  }

  async function salvarPerfilPublico() {
    if (!session) { toast.error("Sessão expirada."); return; }
    setSaving(true);
    let newFotoUrl = fotoUrl;
    if (fotoFile) newFotoUrl = await uploadFoto();
    const res = await updateMedicoPerfil({
      nome: nome.trim(),
      bio: bio.trim() || null,
      foto_url: newFotoUrl,
    } as any);
    setSaving(false);
    if (!res.ok) { toast.error(res.error ?? "Erro ao salvar"); return; }
    setFotoUrl(newFotoUrl);
    setFotoFile(null);
    setFotoPreview(null);
    toast.success("Perfil atualizado");
  }

  /* ── Formação CRUD ── */
  function addFormacao() {
    if (formacoes.length >= 3) { toast.error("Máximo de 3 formações."); return; }
    const nextOrdem = formacoes.length + 1;
    setFormacoes(prev => [...prev, EMPTY_FORMACAO(nextOrdem)]);
  }

  function removeFormacao(idx: number) {
    setFormacoes(prev => {
      const next = prev.filter((_, i) => i !== idx);
      return next.map((f, i) => ({ ...f, ordem: i + 1 }));
    });
  }

  function updateFormacao(idx: number, patch: Partial<Formacao>) {
    setFormacoes(prev => prev.map((f, i) => i === idx ? { ...f, ...patch } : f));
  }

  async function salvarFormacoes() {
    if (!medico) return;
    for (const f of formacoes) {
      if (!f.titulo.trim() || !f.instituicao.trim()) {
        toast.error("Preencha título e instituição de todas as formações.");
        return;
      }
      if (f.titulo.length > 120 || f.instituicao.length > 120) {
        toast.error("Título e instituição devem ter no máximo 120 caracteres.");
        return;
      }
    }
    setSavingFormacoes(true);

    // Delete existing then insert all (simpler than diffing)
    await supabase.from("medico_formacoes").delete().eq("medico_id", medico.id);
    if (formacoes.length > 0) {
      const { error } = await supabase.from("medico_formacoes").insert(
        formacoes.map(f => ({
          medico_id: medico.id,
          titulo: f.titulo.trim(),
          instituicao: f.instituicao.trim(),
          status: f.status,
          ordem: f.ordem,
        }))
      );
      if (error) { toast.error(error.message); setSavingFormacoes(false); return; }
    }
    toast.success("Formações salvas");
    setSavingFormacoes(false);
    loadFormacoes(medico.id);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Meu perfil" description="Gerencie seu perfil público, dados pessoais e dados bancários." />

      <Tabs defaultValue="publico" className="space-y-6">
        <TabsList>
          <TabsTrigger value="publico"><User className="mr-1.5 h-3.5 w-3.5" />Perfil Público</TabsTrigger>
          <TabsTrigger value="pessoal"><FileText className="mr-1.5 h-3.5 w-3.5" />Dados Pessoais</TabsTrigger>
          <TabsTrigger value="bancario"><Landmark className="mr-1.5 h-3.5 w-3.5" />Dados Bancários</TabsTrigger>
          <TabsTrigger value="fiscal"><Receipt className="mr-1.5 h-3.5 w-3.5" />Documentos Fiscais</TabsTrigger>
          <TabsTrigger value="termos"><FileText className="mr-1.5 h-3.5 w-3.5" />Termos</TabsTrigger>
        </TabsList>

        {/* ── PERFIL PÚBLICO ── */}
        <TabsContent value="publico" className="space-y-6">
          <div className="flex justify-end">
            <Button className="bg-gradient-primary hover:opacity-90" onClick={salvarPerfilPublico} disabled={saving || loading || uploadingFoto}>
              <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando…" : "Salvar perfil"}
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
            {/* ── Coluna esquerda: Perfil + Formação ── */}
            <div className="space-y-6">
              {/* Perfil profissional */}
              <section className="card-elevated p-6">
                <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
                  <User className="h-4 w-4 text-primary" />
                  <h3 className="font-display text-lg font-semibold">Perfil profissional</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome completo</Label>
                    <Input value={nome} onChange={e => setNome(e.target.value)} className="mt-1.5" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CRM</Label>
                    <Input value={medico ? `${medico.crm} / ${medico.crm_estado ?? ""}` : ""} disabled className="mt-1.5 bg-muted/40" />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Editável em Dados Pessoais</p>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Especialidade principal</Label>
                    <Input value={medico?.especialidade ?? ""} disabled className="mt-1.5 bg-muted/40" />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Editável em Dados Pessoais</p>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Foto de perfil</Label>
                    <p className="text-[11px] text-muted-foreground mb-1.5">400×400px. Máx 2MB.</p>
                    <div className="flex items-center gap-3">
                      {displayFoto ? (
                        <img src={displayFoto} alt="Foto" className="h-14 w-14 rounded-full object-cover border-2 border-border shadow-sm" />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-lg font-semibold text-primary-foreground shadow-sm">{iniciais}</div>
                      )}
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/50 transition-colors">
                        <Upload className="h-3.5 w-3.5" />
                        {displayFoto ? "Trocar foto" : "Enviar foto"}
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFotoChange} />
                      </label>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bio</Label>
                    <textarea rows={3} value={bio} onChange={e => setBio(e.target.value)} maxLength={500}
                      className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary resize-none" />
                    <p className="text-[11px] text-muted-foreground text-right">{bio.length}/500</p>
                  </div>
                </div>
              </section>

              {/* Formação acadêmica */}
              <section className="card-elevated p-6">
                <div className="mb-4 flex items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    <h3 className="font-display text-lg font-semibold">Formação acadêmica</h3>
                    <Badge variant="secondary" className="text-[10px]">{formacoes.length}/3</Badge>
                  </div>
                  <div className="flex gap-2">
                    {formacoes.length > 0 && (
                      <Button size="sm" onClick={salvarFormacoes} disabled={savingFormacoes} className="bg-gradient-primary hover:opacity-90">
                        <Save className="mr-1.5 h-3.5 w-3.5" /> {savingFormacoes ? "Salvando…" : "Salvar formações"}
                      </Button>
                    )}
                    {formacoes.length < 3 && (
                      <Button size="sm" variant="outline" onClick={addFormacao}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar
                      </Button>
                    )}
                  </div>
                </div>

                {formacoes.length === 0 ? (
                  <div className="text-center py-8">
                    <GraduationCap className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhuma formação cadastrada.</p>
                    <p className="text-xs text-muted-foreground mt-1">Adicione até 3 formações que serão exibidas no seu perfil público.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formacoes.map((f, idx) => (
                      <div key={idx} className="rounded-lg border border-border p-4 space-y-3 relative group">
                        <div className="flex items-start justify-between gap-2">
                          <Badge variant="outline" className="text-[10px] shrink-0">#{f.ordem}</Badge>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeFormacao(idx)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <Label className="text-xs">Título da formação</Label>
                            <Input value={f.titulo} onChange={e => updateFormacao(idx, { titulo: e.target.value })}
                              placeholder="Ex: Residência em Psiquiatria" maxLength={120} className="mt-1" />
                            <p className="text-[10px] text-muted-foreground text-right">{f.titulo.length}/120</p>
                          </div>
                          <div>
                            <Label className="text-xs">Instituição</Label>
                            <Input value={f.instituicao} onChange={e => updateFormacao(idx, { instituicao: e.target.value })}
                              placeholder="Ex: Hospital Albert Einstein" maxLength={120} className="mt-1" />
                            <p className="text-[10px] text-muted-foreground text-right">{f.instituicao.length}/120</p>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Status</Label>
                          <Select value={f.status} onValueChange={v => updateFormacao(idx, { status: v as any })}>
                            <SelectTrigger className="mt-1 w-48"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="concluido">Concluído</SelectItem>
                              <SelectItem value="em_andamento">Em andamento</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* ── Coluna direita: Prévia ── */}
            <div className="lg:sticky lg:top-6 self-start">
              <div className="card-elevated overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/30">
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">Prévia</span>
                  <h4 className="text-sm font-semibold">Como você aparecerá no site</h4>
                </div>

                <div className="overflow-hidden rounded-b-xl">
                  {/* Cover gradient */}
                  <div className="relative h-20 bg-gradient-to-br from-primary/80 to-primary" />
                  <div className="px-5 pb-5">
                    {/* Avatar + rating */}
                    <div className="-mt-10 mb-3 flex items-end gap-3">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-card bg-muted shadow-md">
                        {displayFoto ? (
                          <img src={displayFoto} alt={nome} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-primary text-lg font-bold text-primary-foreground">{iniciais}</div>
                        )}
                      </div>
                      <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                        <span className="font-medium text-foreground">—</span>
                        <span>· sem avaliações</span>
                      </div>
                    </div>

                    {/* Name + specialty */}
                    <h5 className="font-display text-base font-semibold leading-tight">{nome || "Seu nome"}</h5>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Stethoscope className="h-3 w-3" />
                        {medico?.especialidade || "Especialidade"}
                      </span>
                      <span>·</span>
                      <span>{medico ? `CRM ${medico.crm}/${medico.crm_estado}` : "CRM"}</span>
                    </div>

                    {/* Bio */}
                    <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {bio || "Adicione uma bio para que os pacientes conheçam você."}
                    </p>

                    {/* Formações */}
                    {formacoes.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          <Award className="h-3 w-3" /> Formação
                        </div>
                        {formacoes.filter(f => f.titulo.trim()).map((f, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <GraduationCap className="h-3 w-3 mt-0.5 shrink-0 text-primary/60" />
                            <div className="min-w-0">
                              <span className="font-medium text-foreground">{f.titulo}</span>
                              <span className="mx-1">·</span>
                              <span>{f.instituicao}</span>
                              {f.status === "em_andamento" && (
                                <Badge variant="outline" className="ml-1.5 text-[9px] py-0 px-1 border-warning/50 text-warning">Em andamento</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPin className="h-3 w-3" /> Telemedicina
                      </span>
                      <span className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                        Agendar
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── DADOS PESSOAIS ── */}
        <TabsContent value="pessoal">
          <div className="card-elevated p-6">
            {medico ? <MedicoDadosPessoais medico={medico} /> : (
              <p className="text-sm text-muted-foreground">Carregando dados do médico…</p>
            )}
          </div>
        </TabsContent>

        {/* ── DADOS BANCÁRIOS ── */}
        <TabsContent value="bancario">
          <div className="card-elevated p-6">
            {medico ? <MedicoDadosBancarios medicoId={medico.id} /> : (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            )}
          </div>
        </TabsContent>

        {/* ── DOCUMENTOS FISCAIS ── */}
        <TabsContent value="fiscal">
          <div className="card-elevated p-6">
            {medico ? <MedicoDocumentosFiscais medicoId={medico.id} /> : (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="termos">
          <MeusAceites />
        </TabsContent>
      </Tabs>
    </div>
  );
}
