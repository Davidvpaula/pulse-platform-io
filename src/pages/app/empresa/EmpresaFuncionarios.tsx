import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Upload, Search, UserMinus, UserCheck, History, X, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { isValidCpf, maskCpf, onlyDigits } from "@/lib/validation/cpf";
import {
  listFuncionarios, addFuncionario, setFuncionarioStatus, importFuncionariosCsv,
  SETORES_PADRAO,
  type Funcionario, type FuncionarioStatus,
} from "@/lib/empresa";

export default function EmpresaFuncionarios() {
  const [list, setList] = useState<Funcionario[]>([]);
  const [q, setQ] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FuncionarioStatus | "todos">("todos");
  const [filtroSetor, setFiltroSetor] = useState<string>("todos");
  const [showAdd, setShowAdd] = useState(false);
  const [historico, setHistorico] = useState<Funcionario | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const reload = () => setList(listFuncionarios());
    reload();
    window.addEventListener("lasmar:empresa-changed", reload);
    return () => window.removeEventListener("lasmar:empresa-changed", reload);
  }, []);

  const setores = useMemo(() => Array.from(new Set(list.map(f => f.setor))).sort(), [list]);
  const filtered = useMemo(() => list.filter(f => {
    if (filtroStatus !== "todos" && f.status !== filtroStatus) return false;
    if (filtroSetor !== "todos" && f.setor !== filtroSetor) return false;
    if (q) {
      const s = q.toLowerCase();
      return f.nome.toLowerCase().includes(s) || f.email.toLowerCase().includes(s) || f.cpf.includes(q);
    }
    return true;
  }), [list, q, filtroStatus, filtroSetor]);

  function handleImport(file: File) {
    const r = new FileReader();
    r.onload = () => {
      const { ok, ignored } = importFuncionariosCsv(String(r.result));
      toast({ title: `${ok} funcionário(s) importado(s)`, description: ignored ? `${ignored} linha(s) ignoradas.` : undefined });
    };
    r.readAsText(file);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">RH</p>
          <h1 className="font-display text-2xl font-bold">Funcionários</h1>
          <p className="text-sm text-muted-foreground">{list.length} cadastrados · {list.filter(f => f.status === "ativo").length} ativos</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={e => e.target.files?.[0] && handleImport(e.target.files[0])} />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Importar CSV
          </Button>
          <Button onClick={() => setShowAdd(true)} className="bg-gradient-primary hover:opacity-90">
            <Plus className="mr-2 h-4 w-4" /> Adicionar
          </Button>
        </div>
      </header>

      <div className="card-elevated p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nome, e-mail ou CPF" className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-sm" />
          </div>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as FuncionarioStatus | "todos")} className="rounded-md border border-input bg-background px-2 py-2 text-sm">
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
          </select>
          <select value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)} className="rounded-md border border-input bg-background px-2 py-2 text-sm">
            <option value="todos">Todos os setores</option>
            {setores.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="pb-2 pr-3">Nome</th><th className="pb-2 pr-3">Setor</th><th className="pb-2 pr-3">Cargo</th><th className="pb-2 pr-3">Consultas</th><th className="pb-2 pr-3">Última</th><th className="pb-2 pr-3">Status</th><th className="pb-2 text-right">Ações</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">Nenhum funcionário encontrado.</td></tr>
              )}
              {filtered.map(f => (
                <tr key={f.id} className="hover:bg-muted/40">
                  <td className="py-3 pr-3">
                    <div className="font-medium">{f.nome}</div>
                    <div className="text-xs text-muted-foreground">{f.email}</div>
                  </td>
                  <td className="py-3 pr-3 text-muted-foreground">{f.setor}</td>
                  <td className="py-3 pr-3 text-muted-foreground">{f.cargo ?? "—"}</td>
                  <td className="py-3 pr-3">{f.consultasTotal}</td>
                  <td className="py-3 pr-3 text-muted-foreground">{f.ultimaConsulta ? new Date(f.ultimaConsulta).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="py-3 pr-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${f.status === "ativo" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {f.status === "ativo" ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setHistorico(f)}>
                      <History className="mr-1 h-3.5 w-3.5" /> Histórico
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      setFuncionarioStatus(f.id, f.status === "ativo" ? "inativo" : "ativo");
                      toast({ title: f.status === "ativo" ? "Funcionário desativado" : "Funcionário reativado" });
                    }}>
                      {f.status === "ativo" ? <><UserMinus className="mr-1 h-3.5 w-3.5" /> Desativar</> : <><UserCheck className="mr-1 h-3.5 w-3.5" /> Ativar</>}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground">
          Formato CSV esperado: <code>nome,cpf,email,setor,cargo,admissao</code> · uma linha por funcionário · cabeçalho opcional.
        </p>
      </div>

      {showAdd && <ModalAdd onClose={() => setShowAdd(false)} />}
      {historico && <ModalHistorico funcionario={historico} onClose={() => setHistorico(null)} />}
    </div>
  );
}

function ModalAdd({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    nome: "", cpf: "", email: "", setor: SETORES_PADRAO[0], cargo: "",
    admissao: new Date().toISOString().slice(0, 10),
  });
  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim() || !form.email.trim()) {
      toast({ title: "Nome e e-mail são obrigatórios", variant: "destructive" });
      return;
    }
    if (form.cpf.trim() && !isValidCpf(form.cpf)) {
      toast({ title: "CPF inválido", description: "Verifique os dígitos informados.", variant: "destructive" });
      return;
    }
    addFuncionario({ ...form, cpf: onlyDigits(form.cpf), status: "ativo" });
    toast({ title: "Funcionário adicionado" });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onClick={e => e.stopPropagation()} onSubmit={submit} className="card-elevated w-full max-w-lg p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Novo funcionário</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Nome completo *"><input className="input" value={form.nome} onChange={e => set("nome", e.target.value)} /></Field>
          <Field label="E-mail *"><input type="email" className="input" value={form.email} onChange={e => set("email", e.target.value)} /></Field>
          <Field label="CPF"><input className="input" maxLength={14} value={form.cpf} onChange={e => set("cpf", maskCpf(e.target.value))} placeholder="000.000.000-00" /></Field>
          <Field label="Cargo"><input className="input" value={form.cargo} onChange={e => set("cargo", e.target.value)} /></Field>
          <Field label="Setor">
            <select className="input" value={form.setor} onChange={e => set("setor", e.target.value)}>
              {SETORES_PADRAO.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Admissão"><input type="date" className="input" value={form.admissao} onChange={e => set("admissao", e.target.value)} /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="bg-gradient-primary hover:opacity-90">Adicionar</Button>
        </div>
        <style>{`.input{width:100%;border:1px solid hsl(var(--input));background:hsl(var(--background));border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem}`}</style>
      </form>
    </div>
  );
}

function ModalHistorico({ funcionario, onClose }: { funcionario: Funcionario; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="card-elevated w-full max-w-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">{funcionario.nome}</h2>
            <p className="text-xs text-muted-foreground">{funcionario.setor} · {funcionario.cargo ?? "—"}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <Stat label="Consultas" value={funcionario.consultasTotal.toString()} />
          <Stat label="Última" value={funcionario.ultimaConsulta ? new Date(funcionario.ultimaConsulta).toLocaleDateString("pt-BR") : "—"} />
          <Stat label="Admissão" value={new Date(funcionario.admissao).toLocaleDateString("pt-BR")} />
        </div>
        <div className="mt-5 rounded-md border border-warning/30 bg-warning/5 p-3 text-xs">
          <strong>Privacidade:</strong> a empresa visualiza apenas o agregado de consultas. O conteúdo do prontuário é restrito ao paciente e à equipe médica.
        </div>
        <div className="mt-5 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => toast({ title: "Em breve", description: "Exportação individual." })}>
            <Download className="mr-2 h-4 w-4" /> Exportar resumo
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-medium">{label}</span><div className="mt-1">{children}</div></label>;
}
function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-muted/40 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div>;
}
