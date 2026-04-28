import { useState } from "react";
import { Building2, Save, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { getPerfil, savePerfil, getKpis, brl, type EmpresaPerfil } from "@/lib/empresa";

export default function EmpresaPerfilPage() {
  const [perfil, setPerfil] = useState<EmpresaPerfil>(() => getPerfil());
  const kpis = getKpis();
  const set = (k: keyof EmpresaPerfil, v: string | number) => setPerfil(p => ({ ...p, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    savePerfil(perfil);
    toast({ title: "Perfil atualizado" });
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Empresa</p>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Building2 className="h-5 w-5" /> Perfil corporativo</h1>
        <p className="text-sm text-muted-foreground">Dados cadastrais e plano contratado</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <form onSubmit={submit} className="card-elevated space-y-5 p-6">
          <section>
            <h2 className="font-semibold">Dados da empresa</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Razão social"><input className="input" value={perfil.razaoSocial} onChange={e => set("razaoSocial", e.target.value)} /></Field>
              <Field label="Nome fantasia"><input className="input" value={perfil.nomeFantasia} onChange={e => set("nomeFantasia", e.target.value)} /></Field>
              <Field label="CNPJ"><input className="input" value={perfil.cnpj} onChange={e => set("cnpj", e.target.value)} /></Field>
              <Field label="Plano contratado"><input className="input" value={perfil.plano} onChange={e => set("plano", e.target.value)} /></Field>
            </div>
          </section>

          <section>
            <h2 className="font-semibold">Responsável (RH)</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Nome"><input className="input" value={perfil.responsavel} onChange={e => set("responsavel", e.target.value)} /></Field>
              <Field label="E-mail"><input type="email" className="input" value={perfil.responsavelEmail} onChange={e => set("responsavelEmail", e.target.value)} /></Field>
              <Field label="Telefone"><input className="input" value={perfil.responsavelTelefone} onChange={e => set("responsavelTelefone", e.target.value)} /></Field>
              <Field label="Dia de fechamento (ciclo)"><input type="number" min={1} max={28} className="input" value={perfil.cicloFechamento} onChange={e => set("cicloFechamento", Number(e.target.value))} /></Field>
            </div>
          </section>

          <section>
            <h2 className="font-semibold">Contrato</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Vidas contratadas"><input type="number" min={1} className="input" value={perfil.vidasContratadas} onChange={e => set("vidasContratadas", Number(e.target.value))} /></Field>
              <Field label="Preço por vida (R$)"><input type="number" min={0} className="input" value={perfil.precoPorVida} onChange={e => set("precoPorVida", Number(e.target.value))} /></Field>
            </div>
          </section>

          <div className="flex justify-end">
            <Button type="submit" className="bg-gradient-primary hover:opacity-90"><Save className="mr-2 h-4 w-4" /> Salvar alterações</Button>
          </div>
          <style>{`.input{width:100%;border:1px solid hsl(var(--input));background:hsl(var(--background));border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem}`}</style>
        </form>

        <aside className="space-y-4">
          <div className="card-elevated p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plano contratado</p>
            <p className="mt-2 text-lg font-bold">{perfil.plano}</p>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              <li>{perfil.vidasContratadas} vidas contratadas</li>
              <li>{kpis.ativos} colaboradores ativos</li>
              <li>{brl(perfil.precoPorVida)} por vida/mês</li>
              <li>Faturamento dia {perfil.cicloFechamento}</li>
            </ul>
          </div>
          <div className="card-elevated border-warning/30 bg-warning/5 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold"><Lock className="h-4 w-4 text-warning" /> Privacidade contratual</p>
            <p className="mt-2 text-xs text-muted-foreground">
              A empresa não tem acesso ao prontuário, exames ou diagnósticos dos colaboradores. Apenas relatórios agregados são compartilhados com o RH.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-medium">{label}</span><div className="mt-1">{children}</div></label>;
}
