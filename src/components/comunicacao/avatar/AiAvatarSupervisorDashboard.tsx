import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, ShieldAlert, ShieldOff, ShieldCheck, AlertTriangle, DollarSign, Bot, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/lib/permissions/usePermission";

type Stats = {
  totalLogs: number;
  autoReplies: number;
  handoffs: number;
  falhas: number;
  custoTotal: number;
  porRisco: Record<string, number>;
  porConfianca: Record<string, number>;
  porMotivoHandoff: Record<string, number>;
};

type Settings = {
  id: string;
  active: boolean;
  avatar_modo: string;
  avatar_kill_switch: boolean;
  avatar_kill_switch_motivo: string | null;
  avatar_kill_switch_at: string | null;
};

export function AiAvatarSupervisorDashboard() {
  const { allowed: perms } = usePermission(["ia.avatar.supervisionar", "ia.avatar.desligar"]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [killBusy, setKillBusy] = useState(false);

  async function load() {
    setLoading(true);
    const { data: s } = await supabase
      .from("ai_settings")
      .select("id,active,avatar_modo,avatar_kill_switch,avatar_kill_switch_motivo,avatar_kill_switch_at")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    setSettings((s as any) ?? null);

    const since = new Date(Date.now() - 7 * 86400_000).toISOString();
    const { data: logs } = await supabase
      .from("ai_logs")
      .select("auto_reply,risco,confianca,handoff_motivo,custo_estimado,motivo,created_at")
      .gte("created_at", since)
      .limit(2000);

    const arr = (logs as any[]) ?? [];
    const porRisco: Record<string, number> = {};
    const porConfianca: Record<string, number> = {};
    const porMotivoHandoff: Record<string, number> = {};
    let auto = 0, handoffs = 0, falhas = 0, custo = 0;

    for (const l of arr) {
      if (l.auto_reply) auto++;
      if (l.handoff_motivo) {
        handoffs++;
        porMotivoHandoff[l.handoff_motivo] = (porMotivoHandoff[l.handoff_motivo] || 0) + 1;
      }
      if (l.motivo && /erro|timeout|fail|falha/i.test(l.motivo)) falhas++;
      if (l.risco) porRisco[l.risco] = (porRisco[l.risco] || 0) + 1;
      if (l.confianca) porConfianca[l.confianca] = (porConfianca[l.confianca] || 0) + 1;
      custo += Number(l.custo_estimado || 0);
    }

    setStats({
      totalLogs: arr.length, autoReplies: auto, handoffs, falhas,
      custoTotal: custo, porRisco, porConfianca, porMotivoHandoff,
    });
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleKill(on: boolean) {
    setKillBusy(true);
    const motivo = on ? prompt("Motivo do desligamento global da IA Avatar?") || "manual" : null;
    const { error } = await supabase.rpc("ai_avatar_kill_switch", { _on: on, _motivo: motivo } as any);
    setKillBusy(false);
    if (error) return toast.error(error.message);
    toast.success(on ? "IA Avatar desligada globalmente" : "IA Avatar reativada");
    load();
  }

  if (loading) return <p className="text-sm text-muted-foreground p-4">Carregando…</p>;
  if (!settings) return <p className="text-sm text-muted-foreground p-4">Configure a IA primeiro.</p>;

  return (
    <div className="space-y-4">
      <Card className={settings.avatar_kill_switch ? "border-red-500/50" : ""}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            {settings.avatar_kill_switch ? <ShieldOff className="h-4 w-4 text-red-500" /> : <ShieldCheck className="h-4 w-4 text-emerald-500" />}
            Status Operacional
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={settings.active ? "default" : "outline"}>{settings.active ? "IA Ativa" : "IA Inativa"}</Badge>
            <Badge variant="outline">Modo: {settings.avatar_modo}</Badge>
            {settings.avatar_kill_switch && (
              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
                Kill-switch ON
              </Badge>
            )}
          </div>
          {settings.avatar_kill_switch && settings.avatar_kill_switch_motivo && (
            <p className="text-muted-foreground">Motivo: {settings.avatar_kill_switch_motivo}</p>
          )}
          {perms["ia.avatar.desligar"] && (
            <Button
              size="sm"
              variant={settings.avatar_kill_switch ? "outline" : "destructive"}
              disabled={killBusy}
              onClick={() => toggleKill(!settings.avatar_kill_switch)}
            >
              {killBusy && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              {settings.avatar_kill_switch ? "Reativar IA Avatar" : "Desligar IA Avatar (kill-switch)"}
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard icon={Bot} label="Execuções (7d)" value={stats?.totalLogs ?? 0} />
        <MetricCard icon={Activity} label="Auto-respostas" value={stats?.autoReplies ?? 0} />
        <MetricCard icon={AlertTriangle} label="Handoffs" value={stats?.handoffs ?? 0} color="text-orange-500" />
        <MetricCard icon={ShieldAlert} label="Falhas" value={stats?.falhas ?? 0} color="text-red-500" />
        <MetricCard icon={DollarSign} label="Custo (USD)" value={(stats?.custoTotal ?? 0).toFixed(4)} />
      </div>

      <div className="grid lg:grid-cols-3 gap-3">
        <DistributionCard title="Distribuição de Risco" data={stats?.porRisco ?? {}} colorMap={{
          critico: "bg-red-500/10 text-red-600 border-red-500/30",
          alto: "bg-orange-500/10 text-orange-600 border-orange-500/30",
          medio: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
          baixo: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
        }} />
        <DistributionCard title="Confiança" data={stats?.porConfianca ?? {}} />
        <DistributionCard title="Motivos de Handoff" data={stats?.porMotivoHandoff ?? {}} />
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color = "text-foreground" }: any) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">{label}</span>
          <Icon className={`h-3.5 w-3.5 ${color}`} />
        </div>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function DistributionCard({ title, data, colorMap }: { title: string; data: Record<string, number>; colorMap?: Record<string, string> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-xs">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-1">
        {entries.length === 0 && <p className="text-[11px] text-muted-foreground italic">Sem dados.</p>}
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between text-[11px]">
            <Badge variant="outline" className={`text-[10px] ${colorMap?.[k] ?? ""}`}>{k}</Badge>
            <span className="font-mono">{v}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
