import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, Pencil } from "lucide-react";
import { RepasseSplitInput } from "@/components/financeiro/RepasseSplitInput";
import { broadcastAtendimentoImediatoConfigChanged } from "@/lib/clinico";

type Tipo = "consulta" | "pronto_atendimento" | "pacote";
type Modelo = "percentual" | "valor_fixo";

type Servico = {
  id: string;
  nome: string;
  slug: string | null;
  tipo: Tipo;
  modelo: Modelo;
  comissao_pct: number | null;
  valor_fixo_centavos: number | null;
  duracao_min: number;
  valor_paciente_centavos: number;
  prioridade: number;
  especialidade_id: string | null;
  ativo: boolean;
  requer_aprovacao_medico: boolean;
  descricao: string | null;
  descricao_publica: string | null;
  icone: string | null;
};

type Esp = { id: string; nome: string };

const empty: Partial<Servico> = {
  nome: "",
  tipo: "consulta",
  modelo: "percentual",
  comissao_pct: 50,
  duracao_min: 30,
  valor_paciente_centavos: 10000,
  prioridade: 100,
  ativo: true,
  requer_aprovacao_medico: false,
};

function brl(c: number) {
  return (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function slugify(s: string) {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function AdminServicos() {
  const [rows, setRows] = useState<Servico[]>([]);
  const [esp, setEsp] = useState<Esp[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroAtivo, setFiltroAtivo] = useState<string>("todos");
  const [editing, setEditing] = useState<Partial<Servico> | null>(null);
  const [saving, setSaving] = useState(false);
  const [pctValid, setPctValid] = useState<boolean>(true);
  const [paServicoId, setPaServicoId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: s }, { data: e }, { data: ms }, { data: cfg }] = await Promise.all([
      supabase.from("servicos_financeiros").select("*").order("prioridade").order("nome"),
      supabase.from("especialidades").select("id,nome").order("nome"),
      supabase.from("medico_servicos").select("servico_id").eq("ativo", true).eq("status", "ativo"),
      supabase.from("app_settings").select("value").eq("key", "atendimento_imediato.servico_id").maybeSingle(),
    ]);
    setRows((s ?? []) as Servico[]);
    setEsp((e ?? []) as Esp[]);
    const c: Record<string, number> = {};
    (ms ?? []).forEach((r: any) => { c[r.servico_id] = (c[r.servico_id] ?? 0) + 1; });
    setCounts(c);
    setPaServicoId((cfg?.value as string | null) ?? null);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function salvarPa(id: string | null) {
    setSavingPa(true);
    const { error } = await supabase
      .from("app_settings")
      .update({ value: id as any })
      .eq("key", "atendimento_imediato.servico_id");
    setSavingPa(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setPaServicoId(id);
    broadcastAtendimentoImediatoConfigChanged();
    toast({ title: id ? "Atendimento imediato configurado" : "Atendimento imediato desativado" });
  }

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (t && !r.nome.toLowerCase().includes(t)) return false;
      if (filtroTipo !== "todos" && r.tipo !== filtroTipo) return false;
      if (filtroAtivo === "ativos" && !r.ativo) return false;
      if (filtroAtivo === "inativos" && r.ativo) return false;
      return true;
    });
  }, [rows, search, filtroTipo, filtroAtivo]);

  async function toggleAtivo(s: Servico, v: boolean) {
    const { error } = await supabase.from("servicos_financeiros").update({ ativo: v }).eq("id", s.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: v ? "Serviço ativado" : "Serviço desativado" });
    load();
  }

  async function save() {
    if (!editing) return;
    if (!editing.nome?.trim()) return toast({ title: "Nome obrigatório", variant: "destructive" });
    if (editing.modelo === "valor_fixo"
        && (editing.valor_fixo_centavos ?? 0) > (editing.valor_paciente_centavos ?? 0)) {
      return toast({ title: "Valor fixo maior que valor do paciente", variant: "destructive" });
    }
    if ((editing.duracao_min ?? 0) % 5 !== 0) {
      return toast({ title: "Duração deve ser múltiplo de 5", variant: "destructive" });
    }
    if (editing.modelo === "percentual" && !pctValid) {
      return toast({ title: "Corrija o percentual de repasse", variant: "destructive" });
    }
    setSaving(true);
    const payload: any = {
      nome: editing.nome,
      slug: editing.slug || slugify(editing.nome ?? ""),
      tipo: editing.tipo,
      modelo: editing.modelo,
      comissao_pct: editing.modelo === "percentual" ? editing.comissao_pct : null,
      valor_fixo_centavos: editing.modelo === "valor_fixo" ? editing.valor_fixo_centavos : null,
      duracao_min: editing.duracao_min,
      valor_paciente_centavos: editing.valor_paciente_centavos,
      prioridade: editing.prioridade,
      especialidade_id: editing.especialidade_id || null,
      requer_aprovacao_medico: editing.requer_aprovacao_medico ?? false,
      ativo: editing.ativo ?? true,
      descricao: editing.descricao || null,
      descricao_publica: editing.descricao_publica || null,
      icone: editing.icone || null,
    };
    let error;
    if (editing.id) {
      ({ error } = await supabase.from("servicos_financeiros").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("servicos_financeiros").insert(payload));
    }
    setSaving(false);
    if (error) return toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    toast({ title: editing.id ? "Serviço atualizado" : "Serviço criado" });
    if (editing.id && editing.id === paServicoId) broadcastAtendimentoImediatoConfigChanged();
    setEditing(null);
    load();
  }

  // preview de repasse
  const preview = useMemo(() => {
    if (!editing) return null;
    const v = editing.valor_paciente_centavos ?? 0;
    if (editing.modelo === "valor_fixo") {
      const m = editing.valor_fixo_centavos ?? 0;
      return { medico: m, plataforma: Math.max(0, v - m) };
    }
    const m = Math.round(v * (editing.comissao_pct ?? 0) / 100);
    return { medico: m, plataforma: v - m };
  }, [editing]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Serviços da plataforma</h1>
          <p className="text-muted-foreground">Catálogo comercial — pronto atendimento, consultas, pacotes.</p>
        </div>
        <Button onClick={() => setEditing({ ...empty })}>
          <Plus className="h-4 w-4 mr-2" /> Novo serviço
        </Button>
      </div>

      {/* Configuração da porta pública /atendimento-imediato */}
      <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
        <CardHeader>
          <CardTitle className="text-base">⚡ Atendimento imediato (porta pública)</CardTitle>
          <CardDescription>
            Escolha qual serviço de Pronto Atendimento alimenta a página pública{" "}
            <code className="text-xs">/atendimento-imediato</code>. Apenas serviços ativos
            do tipo "pronto_atendimento" com pelo menos 1 médico aderido aparecem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={paServicoId ?? "none"}
              onValueChange={(v) => salvarPa(v === "none" ? null : v)}
              disabled={savingPa}
            >
              <SelectTrigger className="w-80">
                <SelectValue placeholder="Selecione um serviço" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Desativar porta pública —</SelectItem>
                {rows
                  .filter((r) => r.ativo && r.tipo === "pronto_atendimento" && (counts[r.id] ?? 0) > 0)
                  .map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nome} · {brl(r.valor_paciente_centavos)} · {counts[r.id]} médico(s)
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {paServicoId && (
              <Button asChild variant="outline" size="sm">
                <a href="/atendimento-imediato" target="_blank" rel="noreferrer">
                  Abrir página pública →
                </a>
              </Button>
            )}
            <Button asChild size="sm">
              <a href="/app/admin/atendimento-imediato">
                Abrir painel completo →
              </a>
            </Button>
          </div>
          {rows.filter((r) => r.ativo && r.tipo === "pronto_atendimento" && (counts[r.id] ?? 0) > 0).length === 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Nenhum serviço de Pronto Atendimento elegível. Crie um serviço tipo "pronto_atendimento", ative-o e tenha ao menos 1 médico aderido.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>{filtered.length} serviços</CardTitle>
              <CardDescription>Ordenados por prioridade.</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar" className="pl-8 w-56"
                  value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="consulta">Consulta</SelectItem>
                  <SelectItem value="pronto_atendimento">Pronto atendimento</SelectItem>
                  <SelectItem value="pacote">Pacote</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroAtivo} onValueChange={setFiltroAtivo}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativos">Ativos</SelectItem>
                  <SelectItem value="inativos">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Valor paciente</TableHead>
                    <TableHead>Repasse</TableHead>
                    <TableHead>Prio</TableHead>
                    <TableHead>Médicos</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      Nenhum serviço cadastrado
                    </TableCell></TableRow>
                  ) : filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.nome}</div>
                        <div className="text-xs text-muted-foreground">{r.slug ?? "—"}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{r.tipo}</Badge></TableCell>
                      <TableCell>{r.duracao_min} min</TableCell>
                      <TableCell>{brl(r.valor_paciente_centavos)}</TableCell>
                      <TableCell>
                        {r.modelo === "percentual"
                          ? `${r.comissao_pct ?? 0}%`
                          : brl(r.valor_fixo_centavos ?? 0)}
                      </TableCell>
                      <TableCell>{r.prioridade}</TableCell>
                      <TableCell>{counts[r.id] ?? 0}</TableCell>
                      <TableCell>
                        <Switch checked={r.ativo} onCheckedChange={(v) => toggleAtivo(r, v)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drawer de edição */}
      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing?.id ? "Editar serviço" : "Novo serviço"}</SheetTitle>
            <SheetDescription>Configure preço, repasse e regras.</SheetDescription>
          </SheetHeader>
          {editing && (
            <Tabs defaultValue="dados" className="mt-4">
              <TabsList>
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                <TabsTrigger value="publicacao">Publicação</TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={editing.nome ?? ""} onChange={(e) => setEditing({ ...editing, nome: e.target.value, slug: editing.slug || slugify(e.target.value) })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={editing.tipo} onValueChange={(v: Tipo) => setEditing({ ...editing, tipo: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consulta">Consulta</SelectItem>
                        <SelectItem value="pronto_atendimento">Pronto atendimento</SelectItem>
                        <SelectItem value="pacote">Pacote</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Especialidade (opcional)</Label>
                    <Select
                      value={editing.especialidade_id ?? "none"}
                      onValueChange={(v) => setEditing({ ...editing, especialidade_id: v === "none" ? null : v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Qualquer</SelectItem>
                        {esp.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Duração (min, múltiplo de 5)</Label>
                    <Input type="number" min={5} max={480} step={5}
                      value={editing.duracao_min ?? 30}
                      onChange={(e) => setEditing({ ...editing, duracao_min: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Prioridade (menor aparece antes)</Label>
                    <Input type="number" min={1} max={999}
                      value={editing.prioridade ?? 100}
                      onChange={(e) => setEditing({ ...editing, prioridade: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded border p-3">
                  <Label>Requer aprovação do médico</Label>
                  <Switch checked={!!editing.requer_aprovacao_medico}
                    onCheckedChange={(v) => setEditing({ ...editing, requer_aprovacao_medico: v })} />
                </div>
                <div className="flex items-center justify-between rounded border p-3">
                  <Label>Ativo</Label>
                  <Switch checked={editing.ativo ?? true}
                    onCheckedChange={(v) => setEditing({ ...editing, ativo: v })} />
                </div>
              </TabsContent>

              <TabsContent value="financeiro" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Valor cobrado do paciente (R$)</Label>
                  <Input type="number" min={0} step={0.01}
                    value={(editing.valor_paciente_centavos ?? 0) / 100}
                    onChange={(e) => setEditing({ ...editing, valor_paciente_centavos: Math.round(Number(e.target.value) * 100) })} />
                </div>
                <div className="space-y-2">
                  <Label>Modelo de repasse</Label>
                  <Select value={editing.modelo} onValueChange={(v: Modelo) => setEditing({ ...editing, modelo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentual">Percentual</SelectItem>
                      <SelectItem value="valor_fixo">Valor fixo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editing.modelo === "percentual" ? (
                  <div className="space-y-2">
                    <Label>Divisão do valor da consulta</Label>
                    <RepasseSplitInput
                      medicoPct={editing.comissao_pct ?? 0}
                      onChange={(v) => setEditing({ ...editing, comissao_pct: v })}
                      onValidityChange={setPctValid}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Valor fixo do médico (R$)</Label>
                    <Input type="number" min={0} step={0.01}
                      value={(editing.valor_fixo_centavos ?? 0) / 100}
                      onChange={(e) => setEditing({ ...editing, valor_fixo_centavos: Math.round(Number(e.target.value) * 100) })} />
                  </div>
                )}
                {preview && (
                  <Card className="bg-muted/30">
                    <CardContent className="pt-4 grid grid-cols-2 gap-2 text-sm">
                      <div>Médico recebe</div>
                      <div className="text-right font-bold text-emerald-600">{brl(preview.medico)}</div>
                      <div>Plataforma fica com</div>
                      <div className="text-right font-bold text-primary">{brl(preview.plataforma)}</div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="publicacao" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Slug (URL)</Label>
                  <Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })} />
                  <p className="text-xs text-muted-foreground">/servicos/{editing.slug || "..."}</p>
                </div>
                <div className="space-y-2">
                  <Label>Descrição interna</Label>
                  <Textarea value={editing.descricao ?? ""} onChange={(e) => setEditing({ ...editing, descricao: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Descrição pública (site)</Label>
                  <Textarea value={editing.descricao_publica ?? ""} onChange={(e) => setEditing({ ...editing, descricao_publica: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Ícone (lucide name)</Label>
                  <Input placeholder="Stethoscope" value={editing.icone ?? ""} onChange={(e) => setEditing({ ...editing, icone: e.target.value })} />
                </div>
              </TabsContent>
            </Tabs>
          )}
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
