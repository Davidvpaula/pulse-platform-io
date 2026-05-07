import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, ClipboardList, Pill, Wallet, AlertCircle } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import DropzonePdf from "@/components/shared/DropzonePdf";
import type { ConsultaDetalhada } from "@/lib/clinico";

type Props = {
  consulta: ConsultaDetalhada | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onFinalizado?: () => void;
};

function formatBRL(c: number) {
  return (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function uploadDocPaciente(
  file: File,
  tipo: "prescricao" | "atestado",
  consulta: ConsultaDetalhada,
  userId: string,
) {
  // Storage path uses paciente's user_id as folder (matches existing RLS)
  // We need paciente's user_id — fetch it
  const { data: pac } = await supabase
    .from("pacientes")
    .select("user_id")
    .eq("id", consulta.paciente_id)
    .single();

  if (!pac?.user_id) throw new Error("Paciente sem vínculo de usuário — não é possível salvar o documento.");

  const ts = Date.now();
  const storagePath = `${pac.user_id}/${consulta.id}/${tipo}_${ts}.pdf`;

  const { error: errUpload } = await supabase.storage
    .from("paciente-docs")
    .upload(storagePath, file, { contentType: "application/pdf", upsert: false });

  if (errUpload) throw new Error(`Erro ao enviar ${tipo}: ${errUpload.message}`);

  const titulo = tipo === "prescricao" ? "Prescrição médica" : "Atestado médico";

  const { error: errDoc } = await supabase.from("documentos_paciente").insert({
    paciente_id: consulta.paciente_id,
    user_id: pac.user_id,
    tipo: tipo as any,
    titulo,
    descricao: `${consulta.especialidade_nome ?? "Consulta"} — ${new Date(consulta.inicio).toLocaleDateString("pt-BR")}`,
    storage_path: storagePath,
    mime_type: "application/pdf",
    tamanho_bytes: file.size,
    consulta_id: consulta.id,
    uploaded_by: userId,
  });

  if (errDoc) throw new Error(`Erro ao registrar ${tipo}: ${errDoc.message}`);
}

export function FinalizarAtendimentoDialog({ consulta, open, onOpenChange, onFinalizado }: Props) {
  const [salvando, setSalvando] = useState(false);

  // Prescrição (PDF)

  // Prescrição (PDF)
  const [criarPrescricao, setCriarPrescricao] = useState(false);
  const [prescricaoFile, setPrescricaoFile] = useState<File | null>(null);

  // Atestado (PDF)
  const [criarAtestado, setCriarAtestado] = useState(false);
  const [atestadoFile, setAtestadoFile] = useState<File | null>(null);

  // Pagamento
  const [pagamentoStatus, setPagamentoStatus] = useState<string | null>(null);
  const [marcarPago, setMarcarPago] = useState(false);

  useEffect(() => {
    if (!open || !consulta) return;
    setCriarPrescricao(false); setPrescricaoFile(null);
    setCriarAtestado(false); setAtestadoFile(null);
    setMarcarPago(false);
    setPagamentoStatus(null);

    supabase
      .from("pagamentos")
      .select("status")
      .eq("consulta_id", consulta.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setPagamentoStatus(data?.status ?? null));
  }, [open, consulta]);

  if (!consulta) return null;

  const valor = consulta.valor_centavos ?? 0;
  const semPagamento = !pagamentoStatus;
  const pagamentoPendente =
    pagamentoStatus === "pendente" ||
    pagamentoStatus === "processando" ||
    consulta.status === "aguardando_pagamento";

  async function finalizar() {
    if (!consulta) return;
    setSalvando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada — faça login novamente.");

      // 1) Prescrição (PDF upload)

      // 2) Prescrição (PDF upload)
      if (criarPrescricao && prescricaoFile) {
        await uploadDocPaciente(prescricaoFile, "prescricao", consulta, user.id);
      }

      // 3) Atestado (PDF upload)
      if (criarAtestado && atestadoFile) {
        await uploadDocPaciente(atestadoFile, "atestado", consulta, user.id);
      }

      // 4) Pagamento simulado
      if (marcarPago && valor > 0) {
        if (semPagamento) {
          const { error: errPag } = await supabase.from("pagamentos").insert({
            consulta_id: consulta.id,
            valor_centavos: valor,
            status: "pago",
            metodo: "simulado",
            provider: "mock",
            paid_at: new Date().toISOString(),
            metadata: { origem: "finalizacao_atendimento" } as any,
          });
          if (errPag) throw errPag;
        } else if (pagamentoPendente) {
          const { error: errUp } = await supabase
            .from("pagamentos")
            .update({
              status: "pago",
              paid_at: new Date().toISOString(),
              metodo: "simulado",
              provider: "mock",
            })
            .eq("consulta_id", consulta.id)
            .in("status", ["pendente", "processando"]);
          if (errUp) throw errUp;
        }
      }

      // 5) Atualiza status da consulta
      const { error: errCon } = await supabase
        .from("consultas")
        .update({ status: "concluida" })
        .eq("id", consulta.id);
      if (errCon) throw errCon;

      toast.success("Atendimento finalizado");
      onFinalizado?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível finalizar o atendimento");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Finalizar atendimento</DialogTitle>
          <DialogDescription>
            {consulta.paciente_nome ?? "Paciente"} · {consulta.especialidade_nome ?? "Consulta"} ·{" "}
            {new Date(consulta.inicio).toLocaleString("pt-BR")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Prescrição */}
          <section className="rounded-lg border border-border p-4">
            <header className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-primary" />
                <p className="font-semibold">Prescrição</p>
              </div>
              <Switch checked={criarPrescricao} onCheckedChange={setCriarPrescricao} />
            </header>
            {criarPrescricao && (
              <div className="mt-4">
                <DropzonePdf
                  label="Arraste o PDF da prescrição ou clique para selecionar"
                  file={prescricaoFile}
                  onFileSelected={setPrescricaoFile}
                  disabled={salvando}
                />
              </div>
            )}
          </section>

          {/* Atestado */}
          <section className="rounded-lg border border-border p-4">
            <header className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                <p className="font-semibold">Atestado</p>
              </div>
              <Switch checked={criarAtestado} onCheckedChange={setCriarAtestado} />
            </header>
            {criarAtestado && (
              <div className="mt-4">
                <DropzonePdf
                  label="Arraste o PDF do atestado ou clique para selecionar"
                  file={atestadoFile}
                  onFileSelected={setAtestadoFile}
                  disabled={salvando}
                />
              </div>
            )}
          </section>

          {/* Pagamento */}
          <section className="rounded-lg border border-border p-4">
            <header className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                <p className="font-semibold">Pagamento</p>
              </div>
              <span className="text-xs text-muted-foreground">{formatBRL(valor)}</span>
            </header>

            <div className="mt-3 space-y-2 text-sm">
              {valor === 0 && (
                <p className="text-muted-foreground">
                  Consulta sem cobrança (retorno gratuito ou cortesia).
                </p>
              )}
              {valor > 0 && pagamentoPendente && (
                <div className="flex items-start gap-2 rounded-md bg-warning/10 p-3 text-warning">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Existe pagamento <strong>pendente</strong> para esta consulta.</p>
                </div>
              )}
              {valor > 0 && semPagamento && (
                <div className="flex items-start gap-2 rounded-md bg-info/10 p-3 text-info">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Não há pagamento registrado. Será criado um lançamento simulado se você marcar como pago.</p>
                </div>
              )}
              {valor > 0 && pagamentoStatus === "pago" && (
                <p className="text-success">Pagamento já confirmado.</p>
              )}

              {valor > 0 && pagamentoStatus !== "pago" && (
                <label className="flex items-center gap-2">
                  <Switch checked={marcarPago} onCheckedChange={setMarcarPago} />
                  <span>Registrar como <strong>pago</strong> agora (simulado)</span>
                </label>
              )}
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            onClick={finalizar}
            disabled={salvando}
            className="bg-success text-success-foreground hover:opacity-90"
          >
            {salvando
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Finalizar atendimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
