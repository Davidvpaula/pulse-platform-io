import { useEffect, useState, useCallback } from "react";
import { Download, Upload, FileText, CheckCircle2, Clock, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { gerarContratoMedicoPdf } from "@/lib/gerarContratoMedicoPdf";
import { buscarTermoAtivo } from "@/lib/termos";
import { cn } from "@/lib/utils";

type ContratoRow = {
  id: string;
  medico_id: string;
  termo_id: string;
  arquivo_path: string;
  arquivo_nome: string;
  status: "pendente" | "em_analise" | "aprovado" | "reprovado";
  enviado_em: string;
  revisado_em: string | null;
  motivo_reprovacao: string | null;
};

const STATUS: Record<string, { label: string; cls: string; icon: any }> = {
  nao_enviado: { label: "Não enviado", cls: "bg-muted text-muted-foreground", icon: AlertCircle },
  pendente:    { label: "Aguardando análise", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400", icon: Clock },
  em_analise:  { label: "Em análise", cls: "bg-blue-500/15 text-blue-700 dark:text-blue-400", icon: Clock },
  aprovado:    { label: "Aprovado", cls: "bg-green-500/15 text-green-700 dark:text-green-400", icon: CheckCircle2 },
  reprovado:   { label: "Reprovado", cls: "bg-destructive/15 text-destructive", icon: XCircle },
};

export default function MedicoContratoPlataforma({ medicoId }: { medicoId: string }) {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [contrato, setContrato] = useState<ContratoRow | null>(null);
  const [versaoAtiva, setVersaoAtiva] = useState<number | null>(null);
  const [modeloAtivo, setModeloAtivo] = useState<{ id: string; versao: string; titulo: string; arquivo_path: string; arquivo_nome: string } | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [{ data: rows }, termo, { data: modelo }] = await Promise.all([
      supabase
        .from("medicos_contratos")
        .select("*")
        .eq("medico_id", medicoId)
        .order("enviado_em", { ascending: false })
        .limit(1),
      buscarTermoAtivo("contrato_medico" as any),
      supabase
        .from("contratos_modelo")
        .select("id,versao,titulo,arquivo_path,arquivo_nome")
        .eq("ativo", true)
        .maybeSingle(),
    ]);
    setContrato((rows?.[0] as ContratoRow) ?? null);
    setVersaoAtiva(termo?.versao ?? null);
    setModeloAtivo((modelo as any) ?? null);
    setLoading(false);
  }, [medicoId]);

  useEffect(() => { carregar(); }, [carregar]);

  const status = contrato?.status ?? "nao_enviado";
  const meta = STATUS[status];
  const StatusIcon = meta.icon;
  const podeEnviar = status === "nao_enviado" || status === "reprovado";

  async function handleBaixar() {
    setDownloading(true);
    try {
      if (modeloAtivo) {
        const { data, error } = await supabase.storage
          .from("contratos-modelo").createSignedUrl(modeloAtivo.arquivo_path, 60);
        if (error) throw error;
        window.open(data.signedUrl, "_blank");
      } else {
        // fallback: gera PDF dinâmico a partir do texto
        await gerarContratoMedicoPdf(medicoId);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao baixar contrato");
    } finally {
      setDownloading(false);
    }
  }

  async function handleBaixarAssinado() {
    if (!contrato) return;
    const { data, error } = await supabase.storage
      .from("medico-docs")
      .createSignedUrl(contrato.arquivo_path, 60);
    if (error) { toast.error(error.message); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !session) return;
    if (file.type !== "application/pdf") { toast.error("Envie um arquivo PDF."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Tamanho máximo 10MB."); return; }

    const termo = await buscarTermoAtivo("contrato_medico" as any);
    if (!termo) { toast.error("Nenhum contrato ativo publicado pela administração."); return; }

    setUploading(true);
    try {
      const ext = "pdf";
      const fname = `${crypto.randomUUID()}.${ext}`;
      const path = `${session.user.id}/contratos/${fname}`;
      const { error: upErr } = await supabase.storage
        .from("medico-docs")
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("medicos_contratos").insert({
        medico_id: medicoId,
        termo_id: termo.id,
        modelo_id: modeloAtivo?.id ?? null,
        arquivo_path: path,
        arquivo_nome: file.name,
        status: "pendente",
      });
      if (insErr) throw insErr;

      toast.success("Contrato enviado! Aguardando análise da administração.");
      await carregar();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar contrato");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="card-elevated p-6 space-y-5">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <FileText className="h-4 w-4 text-primary" />
        <h3 className="font-display text-lg font-semibold">Contrato da plataforma</h3>
        {modeloAtivo ? (
          <Badge variant="outline" className="ml-auto text-[10px]">Modelo ativo: {modeloAtivo.versao}</Badge>
        ) : versaoAtiva ? (
          <Badge variant="outline" className="ml-auto text-[10px]">Versão texto: v{versaoAtiva}</Badge>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : (
        <>
          {/* Status */}
          <div className={cn("flex items-start gap-3 rounded-lg border p-4", meta.cls)}>
            <StatusIcon className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{meta.label}</p>
              {contrato && (
                <p className="text-xs opacity-90 mt-0.5">
                  Enviado em {new Date(contrato.enviado_em).toLocaleString("pt-BR")}
                  {contrato.revisado_em && ` · Revisado em ${new Date(contrato.revisado_em).toLocaleString("pt-BR")}`}
                </p>
              )}
              {status === "reprovado" && contrato?.motivo_reprovacao && (
                <p className="text-xs mt-2 p-2 rounded bg-background/50">
                  <span className="font-semibold">Motivo: </span>{contrato.motivo_reprovacao}
                </p>
              )}
            </div>
          </div>

          {/* Instruções */}
          {status !== "aprovado" && (
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Baixe o contrato em PDF.</li>
              <li>Assine externamente (manuscrita ou digital).</li>
              <li>Envie o PDF assinado abaixo. A administração analisará e te notificará.</li>
            </ol>
          )}

          {/* Ações */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleBaixar}
              disabled={downloading || (!versaoAtiva && !modeloAtivo)}
            >
              <Download className="mr-2 h-4 w-4" />
              {downloading ? "Gerando…" : "Baixar contrato (PDF)"}
            </Button>

            {contrato && (
              <Button variant="outline" onClick={handleBaixarAssinado}>
                <FileText className="mr-2 h-4 w-4" />
                Ver meu envio
              </Button>
            )}

            {podeEnviar && (
              <label className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-md bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition",
                uploading && "opacity-60 pointer-events-none"
              )}>
                <Upload className="h-4 w-4" />
                {uploading ? "Enviando…" : (status === "reprovado" ? "Reenviar contrato assinado" : "Enviar contrato assinado")}
                <input type="file" accept="application/pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            )}
          </div>

          {!versaoAtiva && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              A administração ainda não publicou um contrato ativo. Aguarde para baixar e assinar.
            </p>
          )}
        </>
      )}
    </section>
  );
}
