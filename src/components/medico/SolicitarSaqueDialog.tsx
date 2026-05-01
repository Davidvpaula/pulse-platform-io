import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { brl, type SaqueConfig, type SaldoInfo } from "@/lib/saques";
import { useSession } from "@/lib/session";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  medicoId: string;
  saldo: SaldoInfo;
  config: SaqueConfig;
  onSuccess: () => void;
};

export function SolicitarSaqueDialog({ open, onOpenChange, medicoId, saldo, config, onSuccess }: Props) {
  const { session } = useSession();
  const [valor, setValor] = useState("");
  const [metodo, setMetodo] = useState<string>("pix");
  const [obs, setObs] = useState("");
  const [nfeFile, setNfeFile] = useState<File | null>(null);
  const [dadosBancarios, setDadosBancarios] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setValor((saldo.liberado_centavos / 100).toFixed(2));
      loadDadosBancarios();
    }
  }, [open]);

  async function loadDadosBancarios() {
    const { data } = await supabase
      .from("medico_dados_bancarios")
      .select("*")
      .eq("medico_id", medicoId)
      .eq("ativo", true)
      .maybeSingle();
    setDadosBancarios(data);
  }

  async function submit() {
    const centavos = Math.round(parseFloat(valor) * 100);
    if (isNaN(centavos) || centavos <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (centavos > saldo.liberado_centavos) {
      toast.error("Valor excede o saldo disponível");
      return;
    }
    if (centavos < config.valor_minimo_centavos) {
      toast.error(`Valor mínimo para saque: ${brl(config.valor_minimo_centavos)}`);
      return;
    }
    if (!dadosBancarios) {
      toast.error("Configure seus dados bancários antes de solicitar um saque");
      return;
    }

    setSubmitting(true);

    // Selecionar consultas elegíveis até atingir o valor
    let acumulado = 0;
    const itensSelecionados: { id: string; valor: number }[] = [];
    // Precisamos buscar os valores individuais
    const { data: consultas } = await supabase
      .from("consultas_financeiro")
      .select("id, valor_medico_centavos")
      .in("id", saldo.ids_elegiveis);

    for (const c of consultas ?? []) {
      if (acumulado >= centavos && !config.permitir_parcial) break;
      if (acumulado + c.valor_medico_centavos <= centavos || config.permitir_parcial) {
        itensSelecionados.push({ id: c.id, valor: c.valor_medico_centavos });
        acumulado += c.valor_medico_centavos;
        if (acumulado >= centavos) break;
      }
    }

    // Criar saque
    const { data: saque, error: saqueErr } = await supabase
      .from("saques_medicos")
      .insert({
        medico_id: medicoId,
        valor_centavos: Math.min(acumulado, centavos),
        metodo: metodo as any,
        dados_bancarios_id: dadosBancarios.id,
        observacao: obs.trim() || null,
        created_by: session?.user.id,
      })
      .select("id")
      .single();

    if (saqueErr) {
      toast.error(saqueErr.message);
      setSubmitting(false);
      return;
    }

    // Inserir itens
    const itens = itensSelecionados.map(i => ({
      saque_id: saque.id,
      consulta_financeiro_id: i.id,
      valor_medico_centavos: i.valor,
    }));
    if (itens.length) {
      await supabase.from("saque_medico_itens").insert(itens);
    }

    // Upload NFe se houver
    if (nfeFile && session) {
      const path = `${session.user.id}/${saque.id}_${nfeFile.name}`;
      const { error: upErr } = await supabase.storage.from("medico-nfes").upload(path, nfeFile);
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("medico-nfes").getPublicUrl(path);
        await supabase.from("medico_nfes").insert({
          medico_id: medicoId,
          saque_id: saque.id,
          arquivo_url: urlData.publicUrl,
        });
      }
    }

    toast.success("Saque solicitado com sucesso!");
    setSubmitting(false);
    onOpenChange(false);
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar saque</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-center">
            <p className="text-xs text-muted-foreground">Saldo disponível</p>
            <p className="text-lg font-bold text-success">{brl(saldo.liberado_centavos)}</p>
          </div>

          <div>
            <Label>Valor do saque (R$)</Label>
            <Input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} />
            <p className="mt-1 text-[11px] text-muted-foreground">Mínimo: {brl(config.valor_minimo_centavos)}</p>
          </div>

          <div>
            <Label>Método</Label>
            <Select value={metodo} onValueChange={setMetodo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">Pix</SelectItem>
                <SelectItem value="ted">TED</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dadosBancarios ? (
            <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground space-y-1">
              <p><b>Titular:</b> {dadosBancarios.titular_nome}</p>
              <p><b>Banco:</b> {dadosBancarios.banco}</p>
              <p><b>Pix:</b> {dadosBancarios.pix_chave ? "Configurado" : "Não configurado"}</p>
            </div>
          ) : (
            <p className="text-xs text-destructive">Dados bancários não configurados. Acesse seu perfil para cadastrar.</p>
          )}

          {config.exigir_nfe && (
            <div>
              <Label>Nota Fiscal (obrigatória)</Label>
              <Input type="file" accept=".pdf,.xml,.jpg,.png" onChange={e => setNfeFile(e.target.files?.[0] ?? null)} />
            </div>
          )}

          {!config.exigir_nfe && (
            <div>
              <Label>Nota Fiscal (opcional)</Label>
              <Input type="file" accept=".pdf,.xml,.jpg,.png" onChange={e => setNfeFile(e.target.files?.[0] ?? null)} />
            </div>
          )}

          <div>
            <Label>Observação (opcional)</Label>
            <Textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={submitting || !dadosBancarios} className="bg-gradient-primary">
            {submitting ? "Enviando…" : "Solicitar saque"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
