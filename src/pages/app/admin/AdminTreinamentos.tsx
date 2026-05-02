import { useEffect, useState } from "react";
import {
  BookOpen, Plus, Pencil, Trash2, Loader2, AlertCircle, Power, ExternalLink, Youtube,
  Users, CheckCircle2, XCircle, Search, ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  listModulosComAulas,
  adminCreateModulo, adminUpdateModulo, adminDeleteModulo,
  adminCreateAula, adminUpdateAula, adminDeleteAula,
  extrairYoutubeId, youtubeThumbnail, adminListConclusoesPorModulo,
  type ModuloComAulas, type TreinamentoAula,
} from "@/lib/treinamentos";

type MedicoRow = { id: string; user_id: string; nome: string; crm: string; especialidade: string };

export default function AdminTreinamentos() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [modulos, setModulos] = useState<ModuloComAulas[]>([]);
  const [tab, setTab] = useState("modulos");

  // Completion tracking
  const [medicos, setMedicos] = useState<MedicoRow[]>([]);
  const [conclusoes, setConclusoes] = useState<{ user_id: string; aula_id: string }[]>([]);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [buscaMedico, setBuscaMedico] = useState("");

  // Diálogos
  const [moduloEdit, setModuloEdit] = useState<{ id?: string; titulo: string; descricao: string; ordem: number; obrigatorio: boolean } | null>(null);
  const [aulaEdit, setAulaEdit] = useState<{
    id?: string; modulo_id: string; titulo: string; descricao: string;
    video_url: string; duracao_min: string; ordem: number;
  } | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setLoading(true);
    const [mods, concs, { data: meds }] = await Promise.all([
      listModulosComAulas({ incluirInativos: true }),
      adminListConclusoesPorModulo(),
      supabase.from("medicos").select("id, user_id, nome, crm, especialidade").eq("status", "aprovado").order("nome"),
    ]);
    setModulos(mods);
    setConclusoes(concs);
    setMedicos(meds ?? []);
    setLoading(false);
  }

  useEffect(() => { void carregar(); }, []);

  /* ─── Módulos ─── */
  async function salvarModulo() {
    if (!moduloEdit?.titulo.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    setSalvando(true);
    const payload = {
      titulo: moduloEdit.titulo.trim(),
      descricao: moduloEdit.descricao.trim() || undefined,
      ordem: Number(moduloEdit.ordem) || 0,
      obrigatorio: moduloEdit.obrigatorio,
    };
    const res = moduloEdit.id
      ? await adminUpdateModulo(moduloEdit.id, payload)
      : await adminCreateModulo(payload);
    setSalvando(false);
    if (res.error) {
      toast({ title: "Erro", description: res.error.message, variant: "destructive" });
      return;
    }
    toast({ title: moduloEdit.id ? "Módulo atualizado" : "Módulo criado" });
    setModuloEdit(null);
    void carregar();
  }

  async function excluirModulo(id: string) {
    if (!confirm("Excluir este módulo e todas as aulas dele?")) return;
    const { error } = await adminDeleteModulo(id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Módulo excluído" });
    void carregar();
  }

  async function toggleModulo(m: ModuloComAulas) {
    const { error } = await adminUpdateModulo(m.id, { ativo: !m.ativo });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    void carregar();
  }

  /* ─── Aulas ─── */
  async function salvarAula() {
    if (!aulaEdit?.titulo.trim() || !aulaEdit.video_url.trim()) {
      toast({ title: "Título e URL obrigatórios", variant: "destructive" });
      return;
    }
    if (!extrairYoutubeId(aulaEdit.video_url)) {
      toast({ title: "URL do YouTube inválida", description: "Cole um link do YouTube (youtu.be ou youtube.com).", variant: "destructive" });
      return;
    }
    setSalvando(true);
    const payload = {
      modulo_id: aulaEdit.modulo_id,
      titulo: aulaEdit.titulo.trim(),
      descricao: aulaEdit.descricao.trim() || undefined,
      video_url: aulaEdit.video_url.trim(),
      duracao_min: aulaEdit.duracao_min ? Number(aulaEdit.duracao_min) : undefined,
      ordem: Number(aulaEdit.ordem) || 0,
    };
    const res = aulaEdit.id
      ? await adminUpdateAula(aulaEdit.id, payload)
      : await adminCreateAula(payload);
    setSalvando(false);
    if (res.error) {
      toast({ title: "Erro", description: res.error.message, variant: "destructive" });
      return;
    }
    toast({ title: aulaEdit.id ? "Aula atualizada" : "Aula criada" });
    setAulaEdit(null);
    void carregar();
  }

  async function excluirAula(id: string) {
    if (!confirm("Excluir esta aula?")) return;
    const { error } = await adminDeleteAula(id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Aula excluída" });
    void carregar();
  }

  async function toggleAula(a: TreinamentoAula) {
    const { error } = await adminUpdateAula(a.id, { ativo: !a.ativo });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    void carregar();
  }

  // Compute per-doctor completion
  const aulasObrigatorias = modulos.filter(m => m.obrigatorio && m.ativo).flatMap(m => m.aulas.map(a => a.id));
  const totalObrigatorias = aulasObrigatorias.length;

  function medicoCompletou(userId: string): { feitas: number; total: number; completo: boolean } {
    if (totalObrigatorias === 0) return { feitas: 0, total: 0, completo: true };
    const feitas = aulasObrigatorias.filter(aulaId =>
      conclusoes.some(c => c.user_id === userId && c.aula_id === aulaId)
    ).length;
    return { feitas, total: totalObrigatorias, completo: feitas >= totalObrigatorias };
  }

  const medicosFiltrados = medicos.filter(m => {
    const q = buscaMedico.trim().toLowerCase();
    if (q && !m.nome?.toLowerCase().includes(q) && !m.crm?.toLowerCase().includes(q)) return false;
    if (filtroStatus === "concluido" && !medicoCompletou(m.user_id).completo) return false;
    if (filtroStatus === "pendente" && medicoCompletou(m.user_id).completo) return false;
    return true;
  });

  const totalConcluiram = medicos.filter(m => medicoCompletou(m.user_id).completo).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Treinamento"
        description="Crie módulos, adicione vídeos e acompanhe a conclusão dos médicos."
        actions={
          <Button
            onClick={() => setModuloEdit({ titulo: "", descricao: "", ordem: modulos.length, obrigatorio: false })}
            className="bg-gradient-primary hover:opacity-90"
          >
            <Plus className="mr-2 h-4 w-4" /> Novo módulo
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="modulos">Módulos & Aulas</TabsTrigger>
          <TabsTrigger value="conclusoes">
            Conclusão por Médico
            {totalObrigatorias > 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px]">
                {totalConcluiram}/{medicos.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="modulos" className="space-y-4 mt-4">
          {loading ? (
            <div className="card-elevated flex items-center justify-center p-12 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : modulos.length === 0 ? (
            <div className="card-elevated flex flex-col items-center gap-3 p-12 text-center text-muted-foreground">
              <BookOpen className="h-10 w-10 opacity-40" />
              <p className="text-sm">Nenhum módulo criado ainda.</p>
              <Button
                onClick={() => setModuloEdit({ titulo: "", descricao: "", ordem: 0, obrigatorio: false })}
                variant="outline" size="sm"
              >
                <Plus className="mr-2 h-4 w-4" /> Criar primeiro módulo
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {modulos.map(m => (
                <div key={m.id} className="card-elevated overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono">#{m.ordem}</Badge>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-lg font-semibold">{m.titulo}</h3>
                          {!m.ativo && <Badge variant="outline" className="border-warning/40 text-warning">Inativo</Badge>}
                          {m.obrigatorio && (
                            <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">
                              <ShieldCheck className="mr-1 h-3 w-3" /> Obrigatório
                            </Badge>
                          )}
                        </div>
                        {m.descricao && <p className="text-sm text-muted-foreground">{m.descricao}</p>}
                        <p className="text-xs text-muted-foreground">{m.aulas.length} aula(s)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 text-xs">
                        <Switch checked={m.ativo} onCheckedChange={() => toggleModulo(m)} />
                        <span className="text-muted-foreground">Ativo</span>
                      </div>
                      <Button
                        size="sm" variant="outline"
                        onClick={() => setAulaEdit({
                          modulo_id: m.id, titulo: "", descricao: "",
                          video_url: "", duracao_min: "", ordem: m.aulas.length,
                        })}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" /> Aula
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => setModuloEdit({
                          id: m.id, titulo: m.titulo, descricao: m.descricao ?? "", ordem: m.ordem, obrigatorio: m.obrigatorio,
                        })}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => excluirModulo(m.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {m.aulas.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Nenhuma aula. Clique em "Aula" para adicionar um vídeo.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {m.aulas.map(a => {
                        const thumb = youtubeThumbnail(a.video_url);
                        return (
                          <div key={a.id} className="flex flex-wrap items-center gap-3 p-4">
                            <div className="grid h-12 w-20 place-items-center overflow-hidden rounded-lg bg-muted">
                              {thumb ? (
                                <img src={thumb} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Youtube className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate font-medium">{a.titulo}</p>
                                {!a.ativo && <Badge variant="outline" className="border-warning/40 text-warning text-[10px]">Inativa</Badge>}
                                {a.duracao_min && <Badge variant="secondary" className="text-[10px]">{a.duracao_min} min</Badge>}
                              </div>
                              <a
                                href={a.video_url}
                                target="_blank" rel="noreferrer"
                                className="inline-flex items-center gap-1 truncate text-xs text-primary hover:underline"
                              >
                                {a.video_url} <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="ghost" onClick={() => toggleAula(a)} title={a.ativo ? "Desativar" : "Ativar"}>
                                <Power className={`h-3.5 w-3.5 ${a.ativo ? "text-success" : "text-muted-foreground"}`} />
                              </Button>
                              <Button
                                size="sm" variant="ghost"
                                onClick={() => setAulaEdit({
                                  id: a.id, modulo_id: a.modulo_id, titulo: a.titulo,
                                  descricao: a.descricao ?? "", video_url: a.video_url,
                                  duracao_min: a.duracao_min?.toString() ?? "", ordem: a.ordem,
                                })}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => excluirAula(a.id)}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="conclusoes" className="space-y-4 mt-4">
          {totalObrigatorias === 0 ? (
            <div className="card-elevated p-12 text-center text-muted-foreground">
              <BookOpen className="mx-auto mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">Nenhum módulo marcado como obrigatório.</p>
              <p className="text-xs mt-1">Marque um módulo como "Obrigatório" para acompanhar a conclusão dos médicos.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px] max-w-sm">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar médico…" value={buscaMedico} onChange={e => setBuscaMedico(e.target.value)} className="pl-9" />
                  </div>
                </div>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="card-elevated overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Médico</TableHead>
                      <TableHead>CRM</TableHead>
                      <TableHead>Especialidade</TableHead>
                      <TableHead>Progresso</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {medicosFiltrados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum médico encontrado.
                        </TableCell>
                      </TableRow>
                    ) : medicosFiltrados.map(m => {
                      const comp = medicoCompletou(m.user_id);
                      const pct = comp.total > 0 ? Math.round((comp.feitas / comp.total) * 100) : 100;
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.nome || "—"}</TableCell>
                          <TableCell className="text-sm">{m.crm || "—"}</TableCell>
                          <TableCell className="text-sm">{m.especialidade || "—"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={`h-full transition-all ${comp.completo ? "bg-success" : "bg-primary"}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">{comp.feitas}/{comp.total}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {comp.completo ? (
                              <Badge variant="secondary" className="bg-success/15 text-success text-xs">
                                <CheckCircle2 className="mr-1 h-3 w-3" /> Concluído
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-warning/15 text-warning text-xs">
                                <XCircle className="mr-1 h-3 w-3" /> Pendente
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Diálogo Módulo */}
      <Dialog open={!!moduloEdit} onOpenChange={(o) => !o && setModuloEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{moduloEdit?.id ? "Editar módulo" : "Novo módulo"}</DialogTitle>
            <DialogDescription>Agrupador de aulas exibido aos médicos.</DialogDescription>
          </DialogHeader>
          {moduloEdit && (
            <div className="space-y-3">
              <div>
                <Label>Título *</Label>
                <Input
                  value={moduloEdit.titulo}
                  onChange={e => setModuloEdit({ ...moduloEdit, titulo: e.target.value })}
                  placeholder="Ex.: Primeiros passos"
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  rows={3}
                  value={moduloEdit.descricao}
                  onChange={e => setModuloEdit({ ...moduloEdit, descricao: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Ordem (menor aparece primeiro)</Label>
                  <Input
                    type="number"
                    value={moduloEdit.ordem}
                    onChange={e => setModuloEdit({ ...moduloEdit, ordem: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <Switch
                    checked={moduloEdit.obrigatorio}
                    onCheckedChange={v => setModuloEdit({ ...moduloEdit, obrigatorio: v })}
                  />
                  <div>
                    <Label className="text-sm">Obrigatório</Label>
                    <p className="text-[11px] text-muted-foreground">Médico precisa concluir para aparecer na busca</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModuloEdit(null)} disabled={salvando}>Cancelar</Button>
            <Button onClick={salvarModulo} disabled={salvando}>
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo Aula */}
      <Dialog open={!!aulaEdit} onOpenChange={(o) => !o && setAulaEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{aulaEdit?.id ? "Editar aula" : "Nova aula"}</DialogTitle>
            <DialogDescription>Cole o link do vídeo do YouTube. O thumbnail é gerado automaticamente.</DialogDescription>
          </DialogHeader>
          {aulaEdit && (
            <div className="space-y-3">
              <div>
                <Label>Título *</Label>
                <Input
                  value={aulaEdit.titulo}
                  onChange={e => setAulaEdit({ ...aulaEdit, titulo: e.target.value })}
                  placeholder="Ex.: Visão geral do dashboard"
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  rows={2}
                  value={aulaEdit.descricao}
                  onChange={e => setAulaEdit({ ...aulaEdit, descricao: e.target.value })}
                />
              </div>
              <div>
                <Label>URL do YouTube *</Label>
                <Input
                  value={aulaEdit.video_url}
                  onChange={e => setAulaEdit({ ...aulaEdit, video_url: e.target.value })}
                  placeholder="https://youtu.be/... ou https://www.youtube.com/watch?v=..."
                />
                {aulaEdit.video_url && !extrairYoutubeId(aulaEdit.video_url) && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    URL não reconhecida como vídeo do YouTube
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Duração (minutos)</Label>
                  <Input
                    type="number"
                    value={aulaEdit.duracao_min}
                    onChange={e => setAulaEdit({ ...aulaEdit, duracao_min: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Ordem</Label>
                  <Input
                    type="number"
                    value={aulaEdit.ordem}
                    onChange={e => setAulaEdit({ ...aulaEdit, ordem: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAulaEdit(null)} disabled={salvando}>Cancelar</Button>
            <Button onClick={salvarAula} disabled={salvando}>
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
