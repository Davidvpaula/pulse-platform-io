import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, RefreshCw, Link2, Unlink, CheckCircle2, Clock,
  Search, User, Stethoscope, Eye,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";

/* ── Types ── */
type MedicoLocal = {
  id: string;
  nome: string;
  crm: string;
  crm_estado: string;
  especialidade: string;
  status: string;
  feegow_professional_id: string | null;
  feegow_vinculado_em: string | null;
  feegow_metadata: Record<string, unknown> | null;
  feegow_especialidade_id: number | null;
};

type FeegowProf = {
  profissional_id: number;
  nome: string;
  tratamento: string;
  ativo: boolean;
  conselho: string;
  documento_conselho: string;
  uf_conselho: string;
  rqe: string;
  foto: string;
  especialidades: Array<{ especialidade_id: number; nome_especialidade?: string; nome?: string }>;
};

/* ── Helpers ── */
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function FeegowProfissionais() {
  const [medicos, setMedicos] = useState<MedicoLocal[]>([]);
  const [feegowProfs, setFeegowProfs] = useState<FeegowProf[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFeegow, setLoadingFeegow] = useState(false);
  const [buscarAberto, setBuscarAberto] = useState(false);
  const [medicoSelecionado, setMedicoSelecionado] = useState<MedicoLocal | null>(null);
  const [detalhesAberto, setDetalhesAberto] = useState(false);
  const [medicoDetalhe, setMedicoDetalhe] = useState<MedicoLocal | null>(null);
  const [vinculando, setVinculando] = useState<number | null>(null);
  const [desvinculando, setDesvinculando] = useState<string | null>(null);
  const [filterFeegow, setFilterFeegow] = useState("");

  const loadMedicos = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("medicos")
      .select("id, nome, crm, crm_estado, especialidade, status, feegow_professional_id, feegow_vinculado_em, feegow_metadata, feegow_especialidade_id")
      .order("nome");
    if (error) {
      toast.error("Erro ao carregar médicos");
      console.error(error);
    }
    setMedicos((data ?? []) as unknown as MedicoLocal[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadMedicos(); }, [loadMedicos]);

  const buscarProfissionaisFeegow = async () => {
    setLoadingFeegow(true);
    try {
      const { data, error } = await supabase.functions.invoke("feegow-profissionais");
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Erro desconhecido");
      setFeegowProfs(data.profissionais ?? []);
      toast.success(`${data.total} profissional(is) encontrado(s)`);
    } catch (e: unknown) {
      toast.error("Erro ao buscar profissionais Feegow: " + (e as Error).message);
    } finally {
      setLoadingFeegow(false);
    }
  };

  const abrirVinculacao = (medico: MedicoLocal) => {
    setMedicoSelecionado(medico);
    if (feegowProfs.length === 0) buscarProfissionaisFeegow();
    setBuscarAberto(true);
  };

  const vincular = async (medico: MedicoLocal, prof: FeegowProf) => {
    setVinculando(prof.profissional_id);
    try {
      const { data, error } = await supabase.functions.invoke("feegow-vincular-profissional", {
        body: {
          medico_id: medico.id,
          feegow_profissional_id: prof.profissional_id,
          feegow_metadata: prof,
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Erro");
      toast.success(`${medico.nome} vinculado a ${prof.nome}`);
      setBuscarAberto(false);
      setMedicoSelecionado(null);
      await loadMedicos();
    } catch (e: unknown) {
      toast.error("Erro ao vincular: " + (e as Error).message);
    } finally {
      setVinculando(null);
    }
  };

  const desvincular = async (medico: MedicoLocal) => {
    if (!confirm(`Desvincular ${medico.nome} do profissional Feegow?`)) return;
    setDesvinculando(medico.id);
    try {
      const { data, error } = await supabase.functions.invoke("feegow-vincular-profissional", {
        body: { medico_id: medico.id, action: "desvincular" },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Erro");
      toast.success(`${medico.nome} desvinculado`);
      await loadMedicos();
    } catch (e: unknown) {
      toast.error("Erro ao desvincular: " + (e as Error).message);
    } finally {
      setDesvinculando(null);
    }
  };

  const verDetalhes = (medico: MedicoLocal) => {
    setMedicoDetalhe(medico);
    setDetalhesAberto(true);
  };

  const vinculados = medicos.filter(m => m.feegow_professional_id);
  const naoVinculados = medicos.filter(m => !m.feegow_professional_id);

  const feegowFiltrados = feegowProfs.filter(p =>
    !filterFeegow ||
    p.nome.toLowerCase().includes(filterFeegow.toLowerCase()) ||
    p.documento_conselho?.includes(filterFeegow)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profissionais · Vínculo Feegow"
        description="Vincule médicos locais a profissionais da Feegow. Apenas vínculo manual — sem sincronização automática."
      />

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-elevated p-4 flex items-center gap-3">
          <User className="h-5 w-5 text-primary" />
          <div>
            <p className="text-2xl font-bold">{medicos.length}</p>
            <p className="text-xs text-muted-foreground">Médicos locais</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <div>
            <p className="text-2xl font-bold">{vinculados.length}</p>
            <p className="text-xs text-muted-foreground">Vinculados à Feegow</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-warning" />
          <div>
            <p className="text-2xl font-bold">{naoVinculados.length}</p>
            <p className="text-xs text-muted-foreground">Sem vínculo</p>
          </div>
        </div>
      </div>

      {/* Botão buscar */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={buscarProfissionaisFeegow}
          disabled={loadingFeegow}
        >
          {loadingFeegow ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Buscar profissionais Feegow
        </Button>
        {feegowProfs.length > 0 && (
          <span className="text-xs text-muted-foreground self-center">
            {feegowProfs.length} profissional(is) carregado(s)
          </span>
        )}
      </div>

      {/* Tabela de médicos */}
      <div className="card-elevated overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-5 py-3">
          <h3 className="font-semibold text-sm">Médicos locais</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Médico</TableHead>
              <TableHead>CRM</TableHead>
              <TableHead>Especialidade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Profissional Feegow</TableHead>
              <TableHead>Vinculado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {medicos.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhum médico cadastrado.
                </TableCell>
              </TableRow>
            )}
            {medicos.map(m => {
              const meta = m.feegow_metadata as FeegowProf | null;
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.nome}</TableCell>
                  <TableCell>{m.crm}/{m.crm_estado}</TableCell>
                  <TableCell>{m.especialidade}</TableCell>
                  <TableCell>
                    <span className={`text-xs rounded-full border px-2 py-0.5 ${
                      m.status === "aprovado"
                        ? "border-success/30 bg-success/10 text-success"
                        : "border-warning/30 bg-warning/10 text-warning"
                    }`}>
                      {m.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {m.feegow_professional_id ? (
                      <span className="flex items-center gap-1 text-sm">
                        <Link2 className="h-3 w-3 text-success" />
                        {meta?.nome ?? `ID ${m.feegow_professional_id}`}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{fmtDate(m.feegow_vinculado_em)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {m.feegow_professional_id ? (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => verDetalhes(m)} title="Ver detalhes">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => desvincular(m)}
                            disabled={desvinculando === m.id}
                          >
                            {desvinculando === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => abrirVinculacao(m)}>
                          <Link2 className="h-4 w-4 mr-1" /> Vincular
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Dialog: buscar e vincular profissional Feegow */}
      <Dialog open={buscarAberto} onOpenChange={setBuscarAberto}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Vincular {medicoSelecionado?.nome} a profissional Feegow
            </DialogTitle>
            <DialogDescription>
              Selecione o profissional correto da Feegow. O vínculo é apenas local — não altera dados na Feegow.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar por nome ou CRM..."
              value={filterFeegow}
              onChange={e => setFilterFeegow(e.target.value)}
              className="flex-1"
            />
          </div>

          {loadingFeegow ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Carregando da Feegow…</span>
            </div>
          ) : feegowFiltrados.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {feegowProfs.length === 0
                ? 'Clique "Buscar profissionais Feegow" primeiro.'
                : "Nenhum resultado para o filtro."}
            </p>
          ) : (
            <div className="divide-y divide-border">
              {feegowFiltrados.map(p => {
                const jaVinculado = medicos.some(
                  m => m.feegow_professional_id === String(p.profissional_id) && m.id !== medicoSelecionado?.id
                );
                return (
                  <div key={p.profissional_id} className="flex items-center gap-3 py-3">
                    {p.foto ? (
                      <img src={p.foto} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Stethoscope className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {p.tratamento} {p.nome}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.conselho} {p.documento_conselho}/{p.uf_conselho}
                        {p.especialidades?.length > 0 && ` · ${p.especialidades.map(e => e.nome).join(", ")}`}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {jaVinculado ? (
                        <span className="text-xs text-muted-foreground">Já vinculado</span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => medicoSelecionado && vincular(medicoSelecionado, p)}
                          disabled={vinculando === p.profissional_id}
                        >
                          {vinculando === p.profissional_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Link2 className="h-4 w-4 mr-1" /> Vincular
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: detalhes do vínculo */}
      <Dialog open={detalhesAberto} onOpenChange={setDetalhesAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do vínculo Feegow</DialogTitle>
            <DialogDescription>{medicoDetalhe?.nome}</DialogDescription>
          </DialogHeader>
          {medicoDetalhe?.feegow_metadata && (
            <div className="space-y-3 text-sm">
              {(() => {
                const meta = medicoDetalhe.feegow_metadata as unknown as FeegowProf & { snapshot_at?: string };
                return (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <span className="text-muted-foreground">ID Feegow</span>
                      <span className="font-medium">{meta.profissional_id}</span>
                      <span className="text-muted-foreground">Nome Feegow</span>
                      <span className="font-medium">{meta.tratamento} {meta.nome}</span>
                      <span className="text-muted-foreground">Conselho</span>
                      <span>{meta.conselho} {meta.documento_conselho}/{meta.uf_conselho}</span>
                      <span className="text-muted-foreground">RQE</span>
                      <span>{meta.rqe || "—"}</span>
                      <span className="text-muted-foreground">Ativo</span>
                      <span>{meta.ativo ? "Sim" : "Não"}</span>
                      <span className="text-muted-foreground">Vinculado em</span>
                      <span>{fmtDate(medicoDetalhe.feegow_vinculado_em)}</span>
                      <span className="text-muted-foreground">Snapshot em</span>
                      <span>{fmtDate(meta.snapshot_at ?? null)}</span>
                    </div>
                    {meta.especialidades?.length > 0 && (
                      <div>
                        <p className="text-muted-foreground mb-1">Especialidades Feegow:</p>
                        <div className="flex flex-wrap gap-1">
                          {meta.especialidades.map((e: { especialidade_id: number; nome: string }) => (
                            <span key={e.especialidade_id} className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-xs text-primary">
                              {e.nome}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
