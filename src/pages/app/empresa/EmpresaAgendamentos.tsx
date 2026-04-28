import { useEffect, useMemo, useState } from "react";
import { Plus, Layers, Calendar, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  listFuncionarios, listAgendamentos, addAgendamento,
  ESPECIALIDADES_OPS, STATUS_AGEND_LABEL,
  type Funcionario, type AgendamentoCorporativo,
} from "@/lib/empresa";

export default function EmpresaAgendamentos() {
  const [funcs, setFuncs] = useState<Funcionario[]>([]);
  const [list, setList] = useState<AgendamentoCorporativo[]>([]);
  const [showInd, setShowInd] = useState(false);
  const [showLote, setShowLote] = useState(false);

  useEffect(() => {
    const reload = () => { setFuncs(listFuncionarios()); setList(listAgendamentos()); };
    reload();
    window.addEventListener("lasmar:empresa-changed", reload);
    return () => window.removeEventListener("lasmar:empresa-changed", reload);
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Operação</p>
          <h1 className="font-display text-2xl font-bold">Agendamentos corporativos</h1>
          <p className="text-sm text-muted-foreground">Empresa → sistema → Feegow → médico → confirmação</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowLote(true)}><Layers className="mr-2 h-4 w-4" /> Em lote</Button>
          <Button onClick={() => setShowInd(true)} className="bg-gradient-primary hover:opacity-90"><Plus className="mr-2 h-4 w-4" /> Novo agendamento</Button>
        </div>
      </header>

      {/* fluxo visual */}
      <div className="card-elevated p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fluxo do agendamento</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {["Empresa", "Sistema Lasmar", "Feegow", "Médico", "Confirmação"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">{s}</span>
              {i < 4 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </div>

      <div className="card-elevated p-4">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Agendamentos</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="pb-2 pr-3">Funcionário</th><th className="pb-2 pr-3">Especialidade</th><th className="pb-2 pr-3">Data</th><th className="pb-2 pr-3">Origem</th><th className="pb-2">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Nenhum agendamento.</td></tr>}
              {list.map(a => (
                <tr key={a.id}>
                  <td className="py-3 pr-3 font-medium">{a.funcionarioNome}</td>
                  <td className="py-3 pr-3 text-muted-foreground">{a.especialidade}</td>
                  <td className="py-3 pr-3 text-muted-foreground">{new Date(a.data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="py-3 pr-3"><span className="rounded bg-muted px-2 py-0.5 text-[10px] capitalize">{a.origem}</span></td>
                  <td className="py-3"><span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{STATUS_AGEND_LABEL[a.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showInd && <ModalIndividual funcs={funcs} onClose={() => setShowInd(false)} />}
      {showLote && <ModalLote funcs={funcs} onClose={() => setShowLote(false)} />}
    </div>
  );
}

function ModalIndividual({ funcs, onClose }: { funcs: Funcionario[]; onClose: () => void }) {
  const ativos = funcs.filter(f => f.status === "ativo");
  const [form, setForm] = useState({
    funcionarioId: ativos[0]?.id ?? "",
    especialidade: ESPECIALIDADES_OPS[0],
    data: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
  });
  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.funcionarioId) { toast({ title: "Selecione um funcionário", variant: "destructive" }); return; }
    addAgendamento({
      funcionarioId: form.funcionarioId,
      especialidade: form.especialidade,
      data: new Date(form.data).toISOString(),
      origem: "individual",
    });
    toast({ title: "Agendamento criado", description: "Enviado para o Feegow para alocação do médico." });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onClick={e => e.stopPropagation()} onSubmit={submit} className="card-elevated w-full max-w-lg p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Novo agendamento</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 space-y-3">
          <Field label="Funcionário">
            <select className="input" value={form.funcionarioId} onChange={e => set("funcionarioId", e.target.value)}>
              {ativos.map(f => <option key={f.id} value={f.id}>{f.nome} · {f.setor}</option>)}
            </select>
          </Field>
          <Field label="Especialidade">
            <select className="input" value={form.especialidade} onChange={e => set("especialidade", e.target.value)}>
              {ESPECIALIDADES_OPS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Data e hora"><input type="datetime-local" className="input" value={form.data} onChange={e => set("data", e.target.value)} /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="bg-gradient-primary hover:opacity-90">Enviar para Feegow</Button>
        </div>
        <style>{`.input{width:100%;border:1px solid hsl(var(--input));background:hsl(var(--background));border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem}`}</style>
      </form>
    </div>
  );
}

function ModalLote({ funcs, onClose }: { funcs: Funcionario[]; onClose: () => void }) {
  const ativos = funcs.filter(f => f.status === "ativo");
  const [selected, setSelected] = useState<string[]>([]);
  const [especialidade, setEspecialidade] = useState(ESPECIALIDADES_OPS[0]);
  const [dataBase, setDataBase] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const setores = useMemo(() => Array.from(new Set(ativos.map(f => f.setor))).sort(), [ativos]);

  function toggle(id: string) {
    setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  }
  function selectSetor(setor: string) {
    const ids = ativos.filter(f => f.setor === setor).map(f => f.id);
    setSelected(p => Array.from(new Set([...p, ...ids])));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.length === 0) { toast({ title: "Selecione ao menos 1 funcionário", variant: "destructive" }); return; }
    selected.forEach((id, i) => {
      const dt = new Date(`${dataBase}T09:00:00`);
      dt.setMinutes(dt.getMinutes() + i * 30);
      addAgendamento({ funcionarioId: id, especialidade, data: dt.toISOString(), origem: "lote" });
    });
    toast({ title: `${selected.length} agendamentos criados em lote` });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onClick={e => e.stopPropagation()} onSubmit={submit} className="card-elevated w-full max-w-2xl p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Agendamento em lote</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Especialidade">
            <select className="input" value={especialidade} onChange={e => setEspecialidade(e.target.value)}>
              {ESPECIALIDADES_OPS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Data base"><input type="date" className="input" value={dataBase} onChange={e => setDataBase(e.target.value)} /></Field>
        </div>
        <div className="mt-3">
          <p className="text-xs font-semibold">Selecionar por setor:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {setores.map(s => (
              <button type="button" key={s} onClick={() => selectSetor(s)} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted">+ {s}</button>
            ))}
            <button type="button" onClick={() => setSelected([])} className="rounded-full border border-destructive/40 px-3 py-1 text-xs text-destructive hover:bg-destructive/5">Limpar</button>
          </div>
        </div>
        <div className="mt-3 max-h-64 overflow-y-auto rounded-md border border-border">
          {ativos.map(f => (
            <label key={f.id} className="flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2 last:border-0 hover:bg-muted/40">
              <input type="checkbox" checked={selected.includes(f.id)} onChange={() => toggle(f.id)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{f.nome}</p>
                <p className="text-xs text-muted-foreground">{f.setor} · {f.cargo ?? "—"}</p>
              </div>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{selected.length} selecionado(s) · horários iniciam às 09:00 com intervalos de 30min.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="bg-gradient-primary hover:opacity-90">Enviar lote para Feegow</Button>
        </div>
        <style>{`.input{width:100%;border:1px solid hsl(var(--input));background:hsl(var(--background));border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem}`}</style>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-medium">{label}</span><div className="mt-1">{children}</div></label>;
}
