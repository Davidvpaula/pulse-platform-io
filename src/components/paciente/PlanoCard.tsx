import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  BadgeCheck, CheckCircle2, XCircle, Calendar, CreditCard,
  FileText, Download, Building2, AlertTriangle, Loader2,
  Stethoscope, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { brl, formatDataBR } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import {
  StatusPlano, statusStyles, beneficioIcons, diasAteData,
  Info, Row,
} from "./plano-helpers";

type MedicoCredito = {
  medicoId: string;
  nome: string;
  foto: string | null;
  especialidade: string | null;
  slug: string | null;
  creditosTotal: number;
  creditosUsados: number;
  ilimitado: boolean;
  periodo: string;
};

interface PlanoCardProps {
  assinatura: any;
  plano: any;
  beneficios: any[];
  medicos?: MedicoCredito[];
  onCancelado: () => void;
  showMedicos?: boolean;
}

export default function PlanoCard({
  assinatura, plano, beneficios, medicos = [], onCancelado, showMedicos = false,
}: PlanoCardProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [cancelando, setCancelando] = useState(false);

  const status: StatusPlano = assinatura?.status || "cancelada";
  const statusUI = statusStyles[status] || statusStyles.cancelada;
  const dias = diasAteData(assinatura.data_fim_acesso);

  async function handleCancelar() {
    setCancelando(true);
    try {
      const { error: ae } = await supabase
        .from("assinaturas")
        .update({ status: "cancelada" as any, updated_at: new Date().toISOString() })
        .eq("id", assinatura.id);
      if (ae) throw ae;

      await supabase
        .from("planos")
        .update({ status: "encerramento_pendente" as any, updated_at: new Date().toISOString() })
        .eq("id", plano.id);

      toast.success("Cancelamento solicitado com sucesso", {
        description: "Você manterá acesso até o fim do ciclo atual.",
      });
      setShowCancelDialog(false);
      setMotivoCancelamento("");
      onCancelado();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao cancelar plano");
    } finally {
      setCancelando(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <section className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  {plano.nome}
                </div>
                <h3 className="text-lg font-semibold">{plano.descricao_comercial || plano.nome}</h3>
              </div>
              <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium", statusUI.wrap)}>
                <span className={cn("h-2 w-2 rounded-full", statusUI.dot)} />
                {statusUI.label}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Info label="Categoria" value={plano.categoria || "—"} />
              <Info label="Ciclo" value={assinatura.ciclo === "mensal" ? "Mensal" : assinatura.ciclo === "anual" ? "Anual" : "Único"} />
              <Info label="Início" value={formatDataBR(assinatura.data_inicio)} />
              <Info
                label="Fim de acesso"
                value={assinatura.data_fim_acesso ? formatDataBR(assinatura.data_fim_acesso) : "Indeterminado"}
                hint={dias !== null ? (dias > 0 ? `${dias} dias restantes` : "Vencido") : undefined}
                hintTone={dias !== null && dias <= 30 ? "warning" : "default"}
              />
            </div>
          </div>

          <TooltipProvider>
            <div className="flex flex-row gap-2 lg:flex-col lg:w-48">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="justify-start" disabled>
                    <Download className="mr-2 h-3.5 w-3.5" /> Carteirinha
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Em breve</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="justify-start" disabled>
                    <FileText className="mr-2 h-3.5 w-3.5" /> Contrato
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Em breve</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </section>

      {/* Expiry warning */}
      {dias !== null && dias <= 30 && dias > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-foreground">Plano termina em {dias} dias</p>
            <p className="text-muted-foreground">
              {!assinatura.renovacao_bloqueada
                ? `Renovação automática ativa. Próxima cobrança em ${formatDataBR(assinatura.proxima_cobranca)}.`
                : "Renovação automática desativada."}
            </p>
          </div>
        </div>
      )}

      {/* Benefits + Payment grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
          <h4 className="mb-3 text-sm font-semibold">Benefícios inclusos</h4>
          {beneficios.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum benefício cadastrado.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {beneficios.map((b) => {
                const Icon = beneficioIcons[b.tipo] || BadgeCheck;
                return (
                  <div key={b.id} className="flex items-start gap-3 rounded-xl border border-border bg-background/50 p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{b.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.descricao || (b.ilimitado ? "Ilimitado" : `${b.quantidade}x/${b.periodo}`)}
                      </p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <CreditCard className="h-4 w-4 text-primary" /> Pagamento
          </h4>
          <dl className="space-y-2 text-sm">
            <Row label="Mensalidade" value={brl(assinatura.valor_cobrado_centavos)} strong />
            <Row label="Próxima cobrança" value={formatDataBR(assinatura.proxima_cobranca)} />
            <Row label="Forma" value={assinatura.forma_pagamento || "—"} />
            <Row
              label="Renovação"
              value={!assinatura.renovacao_bloqueada ? "Ativada" : "Desativada"}
              tone={!assinatura.renovacao_bloqueada ? "success" : "muted"}
            />
          </dl>
        </section>
      </div>

      {/* Doctors linked (personalizado only) */}
      {showMedicos && medicos.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Stethoscope className="h-4 w-4 text-primary" /> Profissionais vinculados
          </h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {medicos.map((m) => {
              const rest = m.ilimitado ? null : Math.max(0, m.creditosTotal - m.creditosUsados);
              const sem = !m.ilimitado && rest === 0;
              return (
                <div key={m.medicoId} className="flex items-center gap-3 rounded-xl border border-border p-3 transition hover:border-primary/30">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={m.foto || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {m.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.especialidade || "Clínico Geral"}</p>
                    <div className="mt-1">
                      {m.ilimitado ? (
                        <Badge variant="outline" className="text-[10px] gap-1 text-success border-success/30">
                          <Sparkles className="h-3 w-3" /> Ilimitado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className={cn("text-[10px]", sem ? "text-destructive border-destructive/30" : "text-primary border-primary/30")}>
                          {rest}/{m.creditosTotal} créditos ({m.periodo})
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant={sem ? "outline" : "default"} asChild>
                    <Link to={m.slug ? `/medicos/${m.slug}` : "/agendar"}>
                      <Calendar className="h-3.5 w-3.5 mr-1" /> Agendar
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Cancel */}
      <section className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="text-sm">
              <p className="font-medium">Cancelar plano</p>
              <p className="text-muted-foreground">
                {status === "cancelada"
                  ? "Este plano já foi cancelado."
                  : "Você manterá a cobertura até o fim do ciclo."}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={() => setShowCancelDialog(true)}
            disabled={status === "cancelada"}
          >
            {status === "cancelada" ? "Já cancelado" : "Cancelar"}
          </Button>
        </div>
      </section>

      {/* Cancel dialog */}
      <Dialog open={showCancelDialog} onOpenChange={(v) => { if (!cancelando) setShowCancelDialog(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" /> Cancelar plano
            </DialogTitle>
            <DialogDescription>
              Ao cancelar, você manterá acesso até o fim do ciclo atual. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor={`motivo-${assinatura.id}`}>Motivo do cancelamento *</Label>
            <Textarea
              id={`motivo-${assinatura.id}`}
              placeholder="Conte-nos o motivo..."
              value={motivoCancelamento}
              onChange={(e) => setMotivoCancelamento(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCancelDialog(false)} disabled={cancelando}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              disabled={!motivoCancelamento.trim() || cancelando}
              onClick={handleCancelar}
            >
              {cancelando && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
