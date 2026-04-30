import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Search, Eye, AlertTriangle, History } from "lucide-react";
import { toast } from "sonner";
import { useImpersonation } from "@/lib/impersonation";
import { profiles } from "@/lib/profiles";

interface Alvo {
  user_id: string;
  nome: string;
  email: string;
  role: string;
}

interface LogRow {
  id: string;
  admin_email: string | null;
  target_email: string | null;
  target_role: string | null;
  motivo: string;
  iniciado_em: string;
  finalizado_em: string | null;
  duracao_seg: number | null;
}

const ROLE_BADGE: Record<string, string> = {
  paciente:   "bg-info/15 text-info",
  medico:     "bg-success/15 text-success",
  secretaria: "bg-warning/15 text-warning",
  empresa:    "bg-primary/15 text-primary",
  colaborador:"bg-muted text-muted-foreground",
};

export default function AdminImpersonar() {
  const navigate = useNavigate();
  const { start, active } = useImpersonation();

  const [busca, setBusca] = useState("");
  const [alvos, setAlvos] = useState<Alvo[]>([]);
  const [loading, setLoading] = useState(true);

  const [historico, setHistorico] = useState<LogRow[]>([]);

  const [escolhido, setEscolhido] = useState<Alvo | null>(null);
  const [motivo, setMotivo] = useState("");
  const [iniciando, setIniciando] = useState(false);

  async function buscar() {
    setLoading(true);
    const { data, error } = await supabase.rpc("impersonation_listar_alvos", {
      _busca: busca.trim() || null,
    });
    if (error) toast.error("Erro: " + error.message);
    setAlvos((data as Alvo[]) || []);
    setLoading(false);
  }

  async function carregarHistorico() {
    const { data } = await supabase
      .from("impersonation_log")
      .select("id,admin_email,target_email,target_role,motivo,iniciado_em,finalizado_em,duracao_seg")
      .order("iniciado_em", { ascending: false })
      .limit(15);
    setHistorico((data as LogRow[]) || []);
  }

  useEffect(() => {
    buscar();
    carregarHistorico();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirmar() {
    if (!escolhido) return;
    if (motivo.trim().length < 8) {
      toast.error("Informe um motivo com ao menos 8 caracteres");
      return;
    }
    setIniciando(true);
    try {
      await start(escolhido, motivo.trim());
      toast.success(`Visualizando como ${escolhido.nome}`);
      setEscolhido(null);
      setMotivo("");
      // Redireciona para a primeira rota do perfil simulado
      const pk = profiles[
        (escolhido.role === "colaborador" ? "secretaria" : escolhido.role) as keyof typeof profiles
      ];
      const dest = pk?.nav.find(n => n.to)?.to ?? "/app";
      navigate(dest);
    } catch (e: any) {
      toast.error("Falha ao iniciar: " + (e?.message ?? e));
    } finally {
      setIniciando(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visualizar como"
        description="Inspecione o sistema do ponto de vista de outro usuário (modo somente leitura). Toda sessão é registrada para auditoria."
      />

      {active && (
        <div className="rounded-lg border-2 border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="font-semibold text-destructive">⚠️ Sessão ativa</p>
          <p className="text-muted-foreground">
            Você já está visualizando como <strong>{active.target.nome}</strong>. Encerre pelo banner vermelho antes de iniciar uma nova sessão.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <p className="font-semibold text-warning">Como funciona</p>
            <ul className="mt-1 list-disc pl-5 text-muted-foreground space-y-0.5">
              <li>A interface assume o perfil escolhido — você vê o que o usuário veria.</li>
              <li><strong>Modo somente leitura</strong>: criar, editar e excluir ficam bloqueados.</li>
              <li>Sessão expira automaticamente em 60 minutos.</li>
              <li>Outros administradores não podem ser usados como alvo.</li>
              <li>Tudo fica registrado: quem, quando, por que e por quanto tempo.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Buscar */}
      <div className="card-elevated p-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Buscar por nome ou e-mail..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              onKeyDown={e => e.key === "Enter" && buscar()}
            />
          </div>
          <Button onClick={buscar} variant="outline">Buscar</Button>
        </div>
      </div>

      {/* Lista */}
      <div className="card-elevated overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : alvos.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Nenhum usuário encontrado</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="p-3 text-left font-semibold">Nome</th>
                <th className="p-3 text-left font-semibold">E-mail</th>
                <th className="p-3 text-left font-semibold">Perfil</th>
                <th className="p-3 text-right font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {alvos.map(a => (
                <tr key={a.user_id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3 font-medium">{a.nome}</td>
                  <td className="p-3 text-muted-foreground">{a.email}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${ROLE_BADGE[a.role] || "bg-muted text-muted-foreground"}`}>
                      {a.role}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => setEscolhido(a)} disabled={!!active}>
                      <Eye className="mr-1 h-3.5 w-3.5" /> Visualizar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Histórico */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Últimas sessões</h2>
        </div>
        <div className="card-elevated overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="p-3 text-left font-semibold">Quando</th>
                <th className="p-3 text-left font-semibold">Admin</th>
                <th className="p-3 text-left font-semibold">Alvo</th>
                <th className="p-3 text-left font-semibold">Perfil</th>
                <th className="p-3 text-left font-semibold">Motivo</th>
                <th className="p-3 text-right font-semibold">Duração</th>
              </tr>
            </thead>
            <tbody>
              {historico.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Sem registros</td></tr>
              ) : historico.map(h => (
                <tr key={h.id} className="border-t border-border">
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(h.iniciado_em).toLocaleString("pt-BR")}
                  </td>
                  <td className="p-3 text-xs">{h.admin_email || "—"}</td>
                  <td className="p-3 text-xs">{h.target_email || "—"}</td>
                  <td className="p-3 text-xs capitalize">{h.target_role || "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground max-w-[280px] truncate" title={h.motivo}>
                    {h.motivo}
                  </td>
                  <td className="p-3 text-right text-xs font-mono">
                    {h.duracao_seg != null ? `${Math.floor(h.duracao_seg / 60)}m ${h.duracao_seg % 60}s` :
                     h.finalizado_em ? "—" : <span className="text-warning">em curso</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmação */}
      <Dialog open={!!escolhido} onOpenChange={o => !o && setEscolhido(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Visualizar como {escolhido?.nome}?</DialogTitle>
            <DialogDescription>
              Você verá a aplicação no perfil <strong>{escolhido?.role}</strong>.
              Todas as ações de escrita ficarão desabilitadas. A sessão expira em 60 minutos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Motivo (obrigatório, mín. 8 caracteres)</label>
            <Textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              rows={3}
              placeholder="Ex.: investigação de chamado #1234 — usuário relatou erro na agenda"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEscolhido(null)} disabled={iniciando}>
              Cancelar
            </Button>
            <Button onClick={confirmar} disabled={iniciando || motivo.trim().length < 8}>
              {iniciando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Iniciar visualização
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
