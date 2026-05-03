import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings2, Clock, Stethoscope, Loader2 } from "lucide-react";
import { toast } from "sonner";

type InboxConfig = {
  transferencia_antes_min: number;
  janela_pos_consulta_dias: number;
  medico_iniciar_pos_consulta: boolean;
};

export default function InboxConfiguracoes() {
  const [config, setConfig] = useState<InboxConfig>({
    transferencia_antes_min: 10,
    janela_pos_consulta_dias: 7,
    medico_iniciar_pos_consulta: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", [
        "inbox.transferencia_antes_min",
        "inbox.janela_pos_consulta_dias",
        "inbox.medico_iniciar_pos_consulta",
      ]);
    const map: Record<string, any> = {};
    for (const row of data || []) map[row.key] = row.value;
    setConfig({
      transferencia_antes_min: Number(map["inbox.transferencia_antes_min"] ?? 10),
      janela_pos_consulta_dias: Number(map["inbox.janela_pos_consulta_dias"] ?? 7),
      medico_iniciar_pos_consulta: map["inbox.medico_iniciar_pos_consulta"] === true || map["inbox.medico_iniciar_pos_consulta"] === "true",
    });
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function salvar() {
    setSaving(true);
    const updates = [
      { key: "inbox.transferencia_antes_min", value: config.transferencia_antes_min },
      { key: "inbox.janela_pos_consulta_dias", value: config.janela_pos_consulta_dias },
      { key: "inbox.medico_iniciar_pos_consulta", value: config.medico_iniciar_pos_consulta },
    ];
    for (const u of updates) {
      await supabase
        .from("app_settings")
        .upsert({ key: u.key, value: u.value as any, updated_at: new Date().toISOString() }, { onConflict: "key" });
    }
    setSaving(false);
    toast.success("Configurações do Inbox salvas");
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações do Inbox"
        description="Regras de transferência automática, janela de acesso médico e permissões."
      />

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Transferência Automática
            </CardTitle>
            <CardDescription>
              A conversa do paciente é vinculada ao médico automaticamente antes da consulta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Minutos antes da consulta</Label>
              <Input
                type="number"
                min={1}
                max={60}
                value={config.transferencia_antes_min}
                onChange={e => setConfig({ ...config, transferencia_antes_min: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                A conversa será transferida para o médico {config.transferencia_antes_min} minutos antes do início da consulta.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-purple-500" />
              Janela Pós-Consulta
            </CardTitle>
            <CardDescription>
              Período que o médico pode acessar a conversa após concluir a consulta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Dias de acesso pós-consulta</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={config.janela_pos_consulta_dias}
                onChange={e => setConfig({ ...config, janela_pos_consulta_dias: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Após {config.janela_pos_consulta_dias} dias, o médico perde acesso automaticamente.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Médico pode iniciar mensagem pós-consulta</Label>
                <p className="text-xs text-muted-foreground">Permite enviar mensagem ao paciente após a consulta.</p>
              </div>
              <Switch
                checked={config.medico_iniciar_pos_consulta}
                onCheckedChange={v => setConfig({ ...config, medico_iniciar_pos_consulta: v })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Regras de Visibilidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs space-y-2 text-muted-foreground">
            <p><strong>Admin:</strong> Vê todas as conversas. Pode transferir, encerrar, auditar e conceder acesso temporário.</p>
            <p><strong>Colaborador/Secretaria:</strong> Vê apenas conversas atribuídas a si. Com permissão <code>comunicacao.ver_todas</code>, vê todas as operacionais.</p>
            <p><strong>Supervisor:</strong> Vê todas se tiver <code>comunicacao.ver_todas</code>. Pode transferir entre setores.</p>
            <p><strong>Médico:</strong> Só vê conversas vinculadas às suas consultas, dentro da janela temporal configurada. Nunca acessa o Inbox geral.</p>
            <p><strong>Paciente:</strong> Vê apenas suas próprias conversas.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={salvar} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar configurações
        </Button>
      </div>
    </div>
  );
}
