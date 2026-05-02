import { useEffect, useState } from "react";
import { FileText, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  buscarTermosPendentes, registrarAceite, TERMO_TIPO_LABELS,
  type TermoRow,
} from "@/lib/termos";
import MeusAceites from "@/components/shared/MeusAceites";

export default function EmpresaTermos() {
  const [pendentes, setPendentes] = useState<TermoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [aceitando, setAceitando] = useState<TermoRow | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    try {
      // Empresa uses same terms flow — check for "empresa" category or general terms
      const todos = await buscarTermosPendentes("empresa");
      setPendentes(todos);
    } catch {
      setPendentes([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAceitar() {
    if (!aceitando) return;
    setSaving(true);
    try {
      await registrarAceite(aceitando.id);
      toast.success("Termo aceito com sucesso");
      setPendentes(prev => prev.filter(t => t.id !== aceitando.id));
      setAceitando(null);
    } catch (e: any) {
      toast.error("Erro ao aceitar termo", { description: e.message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Legal</p>
        <h1 className="font-display text-2xl font-bold">Termos e condições</h1>
        <p className="text-sm text-muted-foreground">Aceite obrigatório e histórico de versões aceitas.</p>
      </header>

      {/* Pendentes */}
      {pendentes.length > 0 && (
        <div className="card-elevated border-warning/30 bg-warning/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h2 className="font-semibold">Termos pendentes de aceite</h2>
          </div>
          <ul className="space-y-2">
            {pendentes.map(t => (
              <li key={t.id} className="flex items-center justify-between rounded-lg border border-border p-3 bg-background">
                <div>
                  <p className="text-sm font-medium">
                    {TERMO_TIPO_LABELS[t.tipo as keyof typeof TERMO_TIPO_LABELS] ?? t.tipo}
                  </p>
                  <p className="text-xs text-muted-foreground">Versão {t.versao}</p>
                </div>
                <Button size="sm" onClick={() => setAceitando(t)}>
                  <FileText className="mr-1 h-3.5 w-3.5" /> Ler e aceitar
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pendentes.length === 0 && (
        <div className="card-elevated flex items-center gap-3 border-primary/20 bg-primary/5 p-4">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <p className="text-sm font-medium">Todos os termos obrigatórios foram aceitos.</p>
        </div>
      )}

      {/* Histórico de aceites */}
      <MeusAceites />

      {/* Modal de aceite */}
      <Dialog open={!!aceitando} onOpenChange={() => !saving && setAceitando(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {aceitando && (TERMO_TIPO_LABELS[aceitando.tipo as keyof typeof TERMO_TIPO_LABELS] ?? aceitando.tipo)}
              {aceitando && <Badge variant="outline" className="ml-2">v{aceitando.versao}</Badge>}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh] rounded-md border border-border p-4">
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {aceitando?.conteudo ?? "Conteúdo não disponível."}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAceitando(null)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleAceitar} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Li e aceito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
