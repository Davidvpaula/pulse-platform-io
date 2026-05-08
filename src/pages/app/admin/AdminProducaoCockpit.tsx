import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle, Rocket, RotateCcw, RefreshCw, Send } from "lucide-react";
import { ProducaoStatusBadge } from "@/components/comunicacao/producao/ProducaoStatusBadge";
import { WabaHealthCard } from "@/components/comunicacao/producao/WabaHealthCard";
import { ChecklistGoLiveItem } from "@/components/comunicacao/producao/ChecklistGoLiveItem";

type ChecklistRow = {
  key: string;
  label: string;
  descricao: string | null;
  obrigatorio: boolean;
  ordem: number;
  ativo: boolean;
};

type ChecklistStatus = {
  item_key: string;
  ok: boolean;
  evidencia: string | null;
};

export default function AdminProducaoCockpit() {
  const [modo, setModo] = useState<string>("sandbox");
  const [healthStatus, setHealthStatus] = useState<string>("unknown");
  const [items, setItems] = useState<ChecklistRow[]>([]);
  const [status, setStatus] = useState<Record<string, ChecklistStatus>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tplSyncBusy, setTplSyncBusy] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [{ data: settings }, { data: health }, { data: cl }, { data: cs }] = await Promise.all([
        supabase.from("app_settings").select("value").eq("key", "whatsapp.modo").maybeSingle(),
        supabase
          .from("meta_waba_health")
          .select("status")
          .order("last_check_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("producao_checklist")
          .select("key,label,descricao,obrigatorio,ordem,ativo")
          .eq("ativo", true)
          .order("ordem"),
        supabase.from("producao_checklist_status").select("item_key,ok,evidencia"),
      ]);

      const v = (settings as any)?.value;
      const m = typeof v === "string" ? v : v?.value ?? "sandbox";
      setModo(m);
      setHealthStatus((health as any)?.status ?? "unknown");
      setItems((cl ?? []) as ChecklistRow[]);
      const map: Record<string, ChecklistStatus> = {};
      (cs ?? []).forEach((r: any) => { map[r.item_key] = r; });
      setStatus(map);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  const obrigatorios = items.filter((i) => i.obrigatorio);
  const completos = obrigatorios.filter((i) => status[i.key]?.ok).length;
  const checklistOk = obrigatorios.length > 0 && completos === obrigatorios.length;
  const podeAtivar = checklistOk && healthStatus === "ok";

  async function ativarProducao() {
    if (!podeAtivar) {
      toast.error("Bloqueado: requer checklist completo + WABA saudável");
      return;
    }
    if (!confirm("Ativar modo PRODUÇÃO? Mensagens reais serão enviadas via Meta.")) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("producao_ativar" as any);
      if (error) throw error;
      toast.success("Produção ativada");
      await loadAll();
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao ativar");
    } finally {
      setBusy(false);
    }
  }

  async function rollbackSandbox() {
    if (!confirm("Voltar para modo SANDBOX? Envios reais serão suspensos imediatamente.")) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "whatsapp.modo", value: { value: "sandbox" } as any });
      if (error) throw error;
      toast.success("Rollback para sandbox concluído");
      await loadAll();
    } catch (e: any) {
      toast.error(e.message ?? "Falha no rollback");
    } finally {
      setBusy(false);
    }
  }

  async function syncTemplates() {
    setTplSyncBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-template-sync", { body: {} });
      if (error) throw error;
      toast.success(
        data?.dry_run
          ? `Dry-run: ${data?.count ?? 0} templates`
          : `Sincronizados: ${data?.count ?? 0}`,
      );
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao sincronizar");
    } finally {
      setTplSyncBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cockpit de Produção — Comunicação"
        description="Status do canal WhatsApp, checklist go-live e ativação controlada de produção."
        actions={
          <div className="flex items-center gap-2">
            <ProducaoStatusBadge modo={modo} />
            <Button size="sm" variant="outline" onClick={loadAll} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        }
      />

      {modo !== "producao" && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Modo SANDBOX ativo</AlertTitle>
          <AlertDescription>
            Nenhum envio real de WhatsApp ocorre. Mensagens são gravadas como{" "}
            <code className="text-xs">mock_sent</code>. Complete o checklist e a verificação de
            saúde para liberar a produção.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WabaHealthCard />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ativação de produção</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant={checklistOk ? "default" : "secondary"}>
                Checklist: {completos}/{obrigatorios.length}
              </Badge>
              <Badge variant={healthStatus === "ok" ? "default" : "secondary"}>
                Health: {healthStatus}
              </Badge>
              <Badge variant={podeAtivar ? "default" : "destructive"}>
                {podeAtivar ? "Pronto para ativar" : "Bloqueado"}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button onClick={ativarProducao} disabled={!podeAtivar || busy || modo === "producao"}>
                <Rocket className="h-4 w-4 mr-1.5" />
                Ativar produção
              </Button>
              <Button variant="outline" onClick={rollbackSandbox} disabled={busy || modo === "sandbox"}>
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Rollback sandbox
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              A ativação chama o RPC <code>producao_ativar()</code> que valida checklist, saúde e
              permissões. Tudo é auditado em observabilidade.
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="checklist">
        <TabsList>
          <TabsTrigger value="checklist">Checklist Go-Live</TabsTrigger>
          <TabsTrigger value="templates">Templates Meta</TabsTrigger>
        </TabsList>

        <TabsContent value="checklist" className="space-y-2">
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item configurado.</p>
          ) : (
            items.map((i) => (
              <ChecklistGoLiveItem
                key={i.key}
                itemKey={i.key}
                label={i.label}
                descricao={i.descricao}
                obrigatorio={i.obrigatorio}
                ok={!!status[i.key]?.ok}
                evidencia={status[i.key]?.evidencia ?? null}
                onChange={loadAll}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Sincronização com Meta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Sem credenciais reais, opera em <strong>dry-run</strong> e registra cada execução
                em <code>meta_template_sync_log</code>. Nenhum template local é alterado.
              </p>
              <Button size="sm" onClick={syncTemplates} disabled={tplSyncBusy}>
                <Send className="h-4 w-4 mr-1.5" />
                {tplSyncBusy ? "Sincronizando..." : "Sincronizar agora"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
