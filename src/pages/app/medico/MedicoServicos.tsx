import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Clock, DollarSign, AlertCircle } from "lucide-react";
import { RepasseSplitInput } from "@/components/financeiro/RepasseSplitInput";

type Servico = {
  id: string;
  nome: string;
  tipo: string;
  duracao_min: number;
  valor_paciente_centavos: number;
  modelo: "percentual" | "valor_fixo";
  comissao_pct: number | null;
  valor_fixo_centavos: number | null;
  requer_aprovacao_medico: boolean;
  descricao_publica: string | null;
};

type Adesao = {
  servico_id: string;
  status: "ativo" | "pendente" | "recusado" | "desativado";
  ativo: boolean;
};

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function MedicoServicos() {
  const { user } = useSession();
  const [medicoId, setMedicoId] = useState<string | null>(null);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [adesoes, setAdesoes] = useState<Record<string, Adesao>>({});
  const [recebe, setRecebe] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [overrideOpen, setOverrideOpen] = useState<Servico | null>(null);
  const [overrideMotivo, setOverrideMotivo] = useState("");
  const [overridePct, setOverridePct] = useState<number>(0); // % MÉDICO desejado (UI)
  const [overrideValid, setOverrideValid] = useState<boolean>(true);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data: med } = await supabase.from("medicos").select("id").eq("user_id", user.id).maybeSingle();
    if (!med) { setLoading(false); return; }
    setMedicoId(med.id);

    const [{ data: s }, { data: a }] = await Promise.all([
      supabase.from("servicos_financeiros").select("*").eq("ativo", true).order("prioridade"),
      supabase.from("medico_servicos").select("servico_id,status,ativo").eq("medico_id", med.id),
    ]);
    setServicos((s ?? []) as Servico[]);
    const m: Record<string, Adesao> = {};
    (a ?? []).forEach((r: any) => { m[r.servico_id] = r; });
    setAdesoes(m);

    // calcula quanto cada um paga ao médico
    const re: Record<string, number> = {};
    await Promise.all((s ?? []).map(async (sv: any) => {
      const { data } = await supabase.rpc("fn_resolver_comissao", {
        _medico_id: med.id,
        _servico_id: sv.id,
        _valor_bruto_centavos: sv.valor_paciente_centavos,
      });
      const row: any = Array.isArray(data) ? data[0] : data;
      re[sv.id] = row?.valor_medico_centavos ?? 0;
    }));
    setRecebe(re);
    setLoading(false);
  }
  useEffect(() => { load(); }, [user]);

  async function toggle(s: Servico, on: boolean) {
    if (!medicoId) return;
    if (on) {
      const status = s.requer_aprovacao_medico ? "pendente" : "ativo";
      const { error } = await supabase.from("medico_servicos").upsert({
        medico_id: medicoId, servico_id: s.id, ativo: true, status,
      }, { onConflict: "medico_id,servico_id" });
      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
      toast({ title: status === "pendente" ? "Adesão solicitada" : "Você agora atende este serviço" });
    } else {
      const { error } = await supabase.from("medico_servicos").update({
        ativo: false, status: "desativado", desativado_em: new Date().toISOString(),
      }).eq("medico_id", medicoId).eq("servico_id", s.id);
      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
      toast({ title: "Adesão removida" });
    }
    load();
  }

  async function solicitarOverride() {
    if (!overrideOpen || !medicoId) return;
    if (!overrideValid) {
      return toast({ title: "Corrija o percentual antes de enviar", variant: "destructive" });
    }
    // overridePct é o % desejado pelo médico (UI). No banco gravamos % plataforma = 100 - médico.
    const plataformaPct = Math.round((100 - overridePct) * 100) / 100;
    const { error } = await supabase.from("medico_comissao_override").insert({
      medico_id: medicoId,
      servico_id: overrideOpen.id,
      comissao_pct: plataformaPct,
      motivo: overrideMotivo,
      ativo: false, // Admin precisa ativar
    });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Solicitação enviada", description: "O administrador vai analisar." });
    setOverrideOpen(null);
    setOverrideMotivo(""); setOverridePct(0);
  }

  const totalAderidos = Object.values(adesoes).filter((a) => a.status === "ativo" && a.ativo).length;

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!medicoId) return <div className="p-6"><Card><CardContent className="pt-6">Cadastro médico não encontrado.</CardContent></Card></div>;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Serviços que eu atendo</h1>
        <p className="text-muted-foreground">
          Você atende {totalAderidos} de {servicos.length} serviços disponíveis na plataforma.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {servicos.map((s) => {
          const a = adesoes[s.id];
          const ativo = a?.status === "ativo" && a?.ativo;
          const pendente = a?.status === "pendente";
          return (
            <Card key={s.id} className={ativo ? "border-primary" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{s.nome}</CardTitle>
                    <Badge variant="outline" className="mt-1">{s.tipo}</Badge>
                  </div>
                  {pendente
                    ? <Badge variant="secondary">Pendente</Badge>
                    : <Switch checked={!!ativo} onCheckedChange={(v) => toggle(s, v)} />}
                </div>
                {s.descricao_publica && <CardDescription className="mt-2">{s.descricao_publica}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" /> {s.duracao_min} min
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" /> Paciente paga {brl(s.valor_paciente_centavos)}
                </div>
                <div className="rounded bg-emerald-50 dark:bg-emerald-950 p-3">
                  <div className="text-xs text-muted-foreground">Você recebe</div>
                  <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                    {brl(recebe[s.id] ?? 0)}
                  </div>
                </div>
                {s.requer_aprovacao_medico && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <AlertCircle className="h-3 w-3 mt-0.5" />
                    Adesão requer aprovação do administrador.
                  </div>
                )}
                {ativo && (
                  <Button variant="outline" size="sm" className="w-full"
                    onClick={() => {
                      setOverrideOpen(s);
                      // s.comissao_pct é % plataforma; mostramos a % do médico atual como ponto de partida
                      const atualMedicoPct = s.comissao_pct == null
                        ? 56
                        : Math.round((100 - Number(s.comissao_pct)) * 100) / 100;
                      setOverridePct(atualMedicoPct);
                    }}>
                    Solicitar override de repasse
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
        {servicos.length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="pt-6 text-center text-muted-foreground">
              Nenhum serviço disponível na plataforma ainda.
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!overrideOpen} onOpenChange={(o) => !o && setOverrideOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar override de repasse</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sua solicitação para <b>{overrideOpen?.nome}</b> será analisada pelo administrador.
            </p>
            <div className="space-y-2">
              <Label>Percentual desejado (%)</Label>
              <input type="number" min={0} max={100} step={0.01}
                className="w-full border rounded px-3 py-2"
                value={overridePct} onChange={(e) => setOverridePct(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Textarea rows={4} value={overrideMotivo} onChange={(e) => setOverrideMotivo(e.target.value)}
                placeholder="Justifique por que solicita um repasse diferente" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideOpen(null)}>Cancelar</Button>
            <Button onClick={solicitarOverride} disabled={overrideMotivo.length < 10}>
              Enviar solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
