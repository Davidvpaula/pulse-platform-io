import { useEffect, useState, useCallback } from "react";
import {
  FileText, Plus, Eye, ToggleLeft, ToggleRight, Loader2,
  ChevronDown, ChevronRight, Users, Clock, Shield,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  listarTermos, criarTermo, ativarTermo, desativarTermo, listarAceitesDoTermo,
  TERMO_TIPO_LABELS, TERMO_CATEGORIAS,
  type TermoRow, type TermoTipo,
} from "@/lib/termos";
import { cn } from "@/lib/utils";

export default function AdminTermosCondicoes() {
  const [loading, setLoading] = useState(true);
  const [termos, setTermos] = useState<TermoRow[]>([]);
  const [expandedTipo, setExpandedTipo] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createTipo, setCreateTipo] = useState<TermoTipo | "">("");
  const [createTitulo, setCreateTitulo] = useState("");
  const [createConteudo, setCreateConteudo] = useState("");
  const [createStatus, setCreateStatus] = useState<"ativo" | "inativo">("inativo");
  const [saving, setSaving] = useState(false);

  // Aceites viewer
  const [viewAceites, setViewAceites] = useState<string | null>(null);
  const [aceites, setAceites] = useState<any[]>([]);
  const [loadingAceites, setLoadingAceites] = useState(false);

  // Preview
  const [previewTermo, setPreviewTermo] = useState<TermoRow | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listarTermos();
      setTermos(data);
    } catch (e: any) {
      toast.error("Erro ao carregar termos: " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const handleCriar = async () => {
    if (!createTipo || !createTitulo.trim() || !createConteudo.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    setSaving(true);
    try {
      await criarTermo({
        tipo: createTipo as TermoTipo,
        titulo: createTitulo.trim(),
        conteudo: createConteudo.trim(),
        status: createStatus,
      });
      toast.success("Termo criado com sucesso!");
      setShowCreate(false);
      setCreateTipo("");
      setCreateTitulo("");
      setCreateConteudo("");
      setCreateStatus("inativo");
      await carregar();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (t: TermoRow) => {
    try {
      if (t.status === "ativo") {
        await desativarTermo(t.id);
        toast.success("Termo desativado");
      } else {
        await ativarTermo(t.id);
        toast.success("Termo ativado — versões anteriores desativadas automaticamente");
      }
      await carregar();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  };

  const handleVerAceites = async (termoId: string) => {
    setViewAceites(termoId);
    setLoadingAceites(true);
    try {
      const data = await listarAceitesDoTermo(termoId);
      setAceites(data);
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setLoadingAceites(false);
    }
  };

  const handleNovaVersao = (tipo: TermoTipo) => {
    const ativo = termos.find(t => t.tipo === tipo && t.status === "ativo");
    setCreateTipo(tipo);
    setCreateTitulo(ativo?.titulo ?? TERMO_TIPO_LABELS[tipo]);
    setCreateConteudo(ativo?.conteudo ?? "");
    setCreateStatus("inativo");
    setShowCreate(true);
  };

  const termosPorTipo = (tipo: TermoTipo) => termos.filter(t => t.tipo === tipo);
  const termoAtivo = (tipo: TermoTipo) => termos.find(t => t.tipo === tipo && t.status === "ativo");

  const renderCategoria = (label: string, tipos: TermoTipo[]) => (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" /> {label}
      </h3>
      {tipos.map(tipo => {
        const ativo = termoAtivo(tipo);
        const versoes = termosPorTipo(tipo);
        const isExpanded = expandedTipo === tipo;
        return (
          <div key={tipo} className="border rounded-lg bg-card">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition"
              onClick={() => setExpandedTipo(isExpanded ? null : tipo)}
            >
              <div className="flex items-center gap-3">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <div>
                  <p className="font-medium">{TERMO_TIPO_LABELS[tipo]}</p>
                  <p className="text-xs text-muted-foreground">
                    {versoes.length} versão(ões) • {ativo ? `v${ativo.versao} ativa` : "Nenhuma ativa"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {ativo && <Badge variant="default" className="bg-green-600">Ativo v{ativo.versao}</Badge>}
                {!ativo && <Badge variant="secondary">Sem versão ativa</Badge>}
                <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); handleNovaVersao(tipo); }}>
                  <Plus className="h-3 w-3 mr-1" /> Nova versão
                </Button>
              </div>
            </div>
            {isExpanded && (
              <div className="border-t px-4 pb-4">
                {versoes.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-3">Nenhum termo cadastrado para este tipo.</p>
                ) : (
                  <table className="w-full text-sm mt-3">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="py-2">Versão</th>
                        <th>Título</th>
                        <th>Status</th>
                        <th>Criado em</th>
                        <th>Publicado em</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {versoes.map(t => (
                        <tr key={t.id} className="border-b last:border-0">
                          <td className="py-2 font-mono">v{t.versao}</td>
                          <td className="truncate max-w-[200px]">{t.titulo}</td>
                          <td>
                            <Badge variant={t.status === "ativo" ? "default" : "secondary"} className={cn(t.status === "ativo" && "bg-green-600")}>
                              {t.status}
                            </Badge>
                          </td>
                          <td className="text-xs">{new Date(t.created_at).toLocaleDateString("pt-BR")}</td>
                          <td className="text-xs">{t.published_at ? new Date(t.published_at).toLocaleDateString("pt-BR") : "—"}</td>
                          <td>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" title="Visualizar" onClick={() => setPreviewTermo(t)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" title={t.status === "ativo" ? "Desativar" : "Ativar"} onClick={() => handleToggle(t)}>
                                {t.status === "ativo" ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4" />}
                              </Button>
                              <Button size="icon" variant="ghost" title="Ver aceites" onClick={() => handleVerAceites(t.id)}>
                                <Users className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando termos…
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader icon={FileText} title="Termos & Condições" subtitle="Gerencie todos os termos legais da plataforma com versionamento completo." />

      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Criar novo termo
        </Button>
      </div>

      <Tabs defaultValue="paciente">
        <TabsList>
          <TabsTrigger value="paciente">Paciente</TabsTrigger>
          <TabsTrigger value="medico">Médico</TabsTrigger>
        </TabsList>
        <TabsContent value="paciente" className="mt-4">
          {renderCategoria("Termos para Pacientes", TERMO_CATEGORIAS.paciente)}
        </TabsContent>
        <TabsContent value="medico" className="mt-4">
          {renderCategoria("Termos para Médicos", TERMO_CATEGORIAS.medico)}
        </TabsContent>
      </Tabs>

      {/* Dialog: Criar termo */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar novo termo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select value={createTipo} onValueChange={v => setCreateTipo(v as TermoTipo)}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TERMO_TIPO_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Título</Label>
              <Input value={createTitulo} onChange={e => setCreateTitulo(e.target.value)} placeholder="Ex: Termos de uso da plataforma" maxLength={200} />
            </div>
            <div>
              <Label>Conteúdo (suporta HTML)</Label>
              <Textarea value={createConteudo} onChange={e => setCreateConteudo(e.target.value)} rows={12} placeholder="Conteúdo completo do termo..." />
            </div>
            <div>
              <Label>Status inicial</Label>
              <Select value={createStatus} onValueChange={v => setCreateStatus(v as "ativo" | "inativo")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inativo">Inativo (rascunho)</SelectItem>
                  <SelectItem value="ativo">Ativo (publica imediatamente)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCriar} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Preview */}
      <Dialog open={!!previewTermo} onOpenChange={() => setPreviewTermo(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTermo?.titulo} (v{previewTermo?.versao})</DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: previewTermo?.conteudo ?? "" }} />
        </DialogContent>
      </Dialog>

      {/* Dialog: Aceites */}
      <Dialog open={!!viewAceites} onOpenChange={() => setViewAceites(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registros de aceite</DialogTitle>
          </DialogHeader>
          {loadingAceites ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : aceites.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">Nenhum aceite registrado.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b text-muted-foreground">
                  <th className="py-2">Usuário</th>
                  <th>Data</th>
                  <th>IP</th>
                  <th>User Agent</th>
                </tr>
              </thead>
              <tbody>
                {aceites.map((a: any) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="py-2">{a.profiles?.nome_completo ?? a.profiles?.email ?? a.user_id}</td>
                    <td className="text-xs">{new Date(a.aceito_em).toLocaleString("pt-BR")}</td>
                    <td className="text-xs font-mono">{a.ip_address ?? "—"}</td>
                    <td className="text-xs truncate max-w-[200px]" title={a.user_agent}>{a.user_agent?.substring(0, 40) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
