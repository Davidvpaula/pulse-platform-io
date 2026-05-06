import { useEffect, useState, useCallback } from "react";
import { Building2, Save, Lock, Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { brl } from "@/lib/relatorios/utils";
import ContaSeguranca from "@/components/shared/ContaSeguranca";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEmpresaAtual } from "@/lib/useEmpresaAtual";

type EmpresaRow = {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  responsavel_nome: string | null;
  responsavel_email: string | null;
  responsavel_telefone: string | null;
  valor_colaborador_centavos: number;
  dia_fechamento: number;
  contrato_status: string;
  segmento: string | null;
};

export default function EmpresaPerfilPage() {
  const { empresa: empAtual } = useEmpresaAtual();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [empresa, setEmpresa] = useState<EmpresaRow | null>(null);
  const [email, setEmail] = useState("");
  const [totalFuncionarios, setTotalFuncionarios] = useState(0);

  // Form fields
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [responsavelNome, setResponsavelNome] = useState("");
  const [responsavelEmail, setResponsavelEmail] = useState("");
  const [responsavelTelefone, setResponsavelTelefone] = useState("");
  const [segmento, setSegmento] = useState("");

  const carregar = useCallback(async () => {
    if (!empAtual) return;
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) setEmail(u.user.email ?? "");

      const eid = empAtual.empresaId;

      const { data: emp, error } = await supabase
        .from("empresas")
        .select("id, razao_social, nome_fantasia, cnpj, responsavel_nome, responsavel_email, responsavel_telefone, valor_colaborador_centavos, dia_fechamento, contrato_status, segmento")
        .eq("id", eid)
        .maybeSingle();

      if (error) throw error;
      if (!emp) { setLoading(false); return; }

      setEmpresa(emp as EmpresaRow);
      setRazaoSocial(emp.razao_social ?? "");
      setNomeFantasia(emp.nome_fantasia ?? "");
      setCnpj(emp.cnpj ?? "");
      setResponsavelNome(emp.responsavel_nome ?? "");
      setResponsavelEmail(emp.responsavel_email ?? "");
      setResponsavelTelefone(emp.responsavel_telefone ?? "");
      setSegmento(emp.segmento ?? "");

      // Count employees
      const { count } = await supabase
        .from("empresas_funcionarios")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", eid);
      setTotalFuncionarios(count ?? 0);
    } catch (e: any) {
      toast.error(e.message || "Erro ao carregar perfil da empresa");
    } finally {
      setLoading(false);
    }
  }, [empAtual]);

  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresa) return;
    if (!razaoSocial.trim()) { toast.error("Razão social é obrigatória."); return; }
    setSaving(true);
    const { error } = await supabase
      .from("empresas")
      .update({
        razao_social: razaoSocial.trim(),
        nome_fantasia: nomeFantasia.trim() || null,
        cnpj: cnpj.trim() || null,
        responsavel_nome: responsavelNome.trim() || null,
        responsavel_email: responsavelEmail.trim() || null,
        responsavel_telefone: responsavelTelefone.trim() || null,
        segmento: segmento.trim() || null,
      })
      .eq("id", empresa.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Perfil atualizado com sucesso.");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Perfil corporativo" description="Dados cadastrais e plano contratado" />
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="space-y-6">
        <PageHeader title="Perfil corporativo" description="Dados cadastrais e plano contratado" />
        <div className="card-elevated p-12 text-center text-muted-foreground">
          Nenhuma empresa vinculada ao seu cadastro.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Perfil corporativo" description="Dados cadastrais e plano contratado" />
        <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
        </Button>
      </div>

      <Tabs defaultValue="dados" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dados"><Building2 className="mr-1.5 h-3.5 w-3.5" />Dados</TabsTrigger>
          <TabsTrigger value="conta">Conta & senha</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <form onSubmit={salvar} className="card-elevated space-y-5 p-6">
              <section>
                <h2 className="font-semibold">Dados da empresa</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Razão social *">
                    <Input required value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} />
                  </Field>
                  <Field label="Nome fantasia">
                    <Input value={nomeFantasia} onChange={e => setNomeFantasia(e.target.value)} />
                  </Field>
                  <Field label="CNPJ">
                    <Input value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
                  </Field>
                  <Field label="Segmento">
                    <Input value={segmento} onChange={e => setSegmento(e.target.value)} placeholder="Ex: Construção civil" />
                  </Field>
                </div>
              </section>

              <section>
                <h2 className="font-semibold">Responsável (RH)</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Nome">
                    <Input value={responsavelNome} onChange={e => setResponsavelNome(e.target.value)} />
                  </Field>
                  <Field label="E-mail">
                    <Input type="email" value={responsavelEmail} onChange={e => setResponsavelEmail(e.target.value)} />
                  </Field>
                  <Field label="Telefone">
                    <Input value={responsavelTelefone} onChange={e => setResponsavelTelefone(e.target.value)} />
                  </Field>
                  <Field label="Dia de fechamento (ciclo)">
                    <Input type="number" min={1} max={28} value={empresa.dia_fechamento} disabled className="bg-muted/40" />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Gerenciado pelo administrador</p>
                  </Field>
                </div>
              </section>

              <div className="flex justify-end">
                <Button type="submit" disabled={saving} className="bg-gradient-primary hover:opacity-90">
                  {saving
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando…</>
                    : <><Save className="mr-2 h-4 w-4" /> Salvar alterações</>}
                </Button>
              </div>
            </form>

            <aside className="space-y-4">
              <div className="card-elevated p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contrato</p>
                <p className="mt-2 text-lg font-bold capitalize">{empresa.contrato_status.replace(/_/g, " ")}</p>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <li>{totalFuncionarios} colaboradores ativos</li>
                  <li>{brl(empresa.valor_colaborador_centavos)} por vida/mês</li>
                  <li>Faturamento dia {empresa.dia_fechamento}</li>
                </ul>
              </div>
              <div className="card-elevated border-warning/30 bg-warning/5 p-5">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Lock className="h-4 w-4 text-warning" /> Privacidade contratual
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  A empresa não tem acesso ao prontuário, exames ou diagnósticos dos colaboradores. Apenas relatórios agregados são compartilhados com o RH.
                </p>
              </div>
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="conta" className="space-y-6">
          <ContaSeguranca emailAtual={email} onEmailChange={setEmail} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </label>
  );
}
