import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Calendar, Loader2, Clock, User, MapPin } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { formatBRL, getPagamento, type Pagamento } from "@/lib/pagamentos";

export default function PacientePagamentoSucesso() {
  const [params] = useSearchParams();
  const id = params.get("p") ?? "";
  const [p, setP] = useState<Pagamento | null>(null);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      const data = await getPagamento(id);
      if (cancelled) return;
      setP(data);
      attempts += 1;
      if (data?.status === "pago" || data?.status === "falhou" || attempts >= 12) {
        setPolling(false);
        return;
      }
      setTimeout(tick, 3000);
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const pago = p?.status === "pago";
  const meta = p?.metadata as Record<string, any> | null;
  const snapshot = meta?.snapshot as Record<string, any> | null;

  const medicoNome = snapshot?.medico_nome ?? meta?.medico_nome ?? null;
  const referenciaNome = snapshot?.referencia_nome ?? null;
  const modalidade = snapshot?.modalidade ?? null;
  const duracaoMin = snapshot?.duracao_minutos ?? null;

  // Formatar data/hora do snapshot
  const inicioStr = snapshot?.inicio;
  let dataFormatada: string | null = null;
  let horaFormatada: string | null = null;
  if (inicioStr) {
    try {
      const d = new Date(inicioStr);
      dataFormatada = d.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      horaFormatada = d.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {}
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={pago ? "Pagamento confirmado" : "Aguardando confirmação"}
        description={
          pago
            ? "Sua consulta está garantida. Confira os detalhes abaixo."
            : "Recebemos seu pagamento — confirmando com o provedor."
        }
      />

      <div className="card-elevated overflow-hidden">
        {/* Status header */}
        <div className="gradient-soft flex flex-col items-center gap-3 p-8 text-center">
          <div
            className={`grid h-14 w-14 place-items-center rounded-full ${
              pago ? "bg-success/15" : "bg-warning/15"
            }`}
          >
            {pago ? (
              <CheckCircle2 className="h-8 w-8 text-success" />
            ) : polling ? (
              <Loader2 className="h-8 w-8 animate-spin text-warning" />
            ) : (
              <Clock className="h-8 w-8 text-warning" />
            )}
          </div>
          <h2 className="font-display text-2xl font-bold">
            {pago ? "Pagamento aprovado" : "Confirmando pagamento…"}
          </h2>
          {p && (
            <p className="text-sm text-muted-foreground">
              Valor: <strong className="text-success">{formatBRL(p.valor_centavos)}</strong> · Status:{" "}
              <strong className="capitalize">{p.status}</strong>
            </p>
          )}
          {!pago && !polling && (
            <p className="max-w-md text-xs text-muted-foreground">
              A confirmação pode levar alguns segundos. Atualize esta página em instantes —
              assim que o provedor confirmar, sua consulta aparecerá no painel.
            </p>
          )}
        </div>

        {/* Detalhes da consulta */}
        {pago && (referenciaNome || medicoNome || dataFormatada) && (
          <div className="border-t border-border p-6">
            <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Detalhes do agendamento
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {referenciaNome && (
                <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                  <Calendar className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Serviço</p>
                    <p className="font-medium text-sm">{referenciaNome}</p>
                  </div>
                </div>
              )}
              {medicoNome && (
                <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                  <User className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Profissional</p>
                    <p className="font-medium text-sm">{medicoNome}</p>
                  </div>
                </div>
              )}
              {dataFormatada && (
                <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                  <Clock className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Data e horário</p>
                    <p className="font-medium text-sm capitalize">{dataFormatada}</p>
                    {horaFormatada && (
                      <p className="text-xs text-muted-foreground">
                        {horaFormatada}
                        {duracaoMin ? ` · ${duracaoMin} min` : ""}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {modalidade && (
                <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Modalidade</p>
                    <p className="font-medium text-sm capitalize">{modalidade === "online" ? "Telemedicina" : modalidade}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="grid gap-3 p-6 sm:grid-cols-2">
          <Button asChild className="bg-gradient-primary hover:opacity-90">
            <Link to="/app/paciente/agendamentos">
              <Calendar className="mr-2 h-4 w-4" /> Acessar seus agendamentos
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/app/paciente/dashboard">
              <Calendar className="mr-2 h-4 w-4" /> Voltar ao painel
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
