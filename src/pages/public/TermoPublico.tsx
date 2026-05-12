import { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import PageShell from "@/components/PageShell";
import { buscarTermoAtivo, type TermoTipo, type TermoRow } from "@/lib/termos";
import { sanitizeHtml } from "@/lib/sanitize";

interface Props {
  tipo: TermoTipo;
  fallbackTitle: string;
  subtitle?: string;
}

export default function TermoPublico({ tipo, fallbackTitle, subtitle }: Props) {
  const [termo, setTermo] = useState<TermoRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    buscarTermoAtivo(tipo)
      .then(t => { if (alive) setTermo(t); })
      .catch(() => { if (alive) setTermo(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tipo]);

  return (
    <PageShell title={termo?.titulo ?? fallbackTitle} subtitle={subtitle ?? ""}>
      <div className="mx-auto max-w-4xl">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…
          </div>
        ) : !termo ? (
          <div className="card-elevated p-10 text-center">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-semibold">Documento ainda não publicado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Estamos finalizando esta versão. Volte em breve.
            </p>
          </div>
        ) : (
          <article className="card-elevated p-6 sm:p-10">
            <header className="mb-6 border-b border-border pb-4">
              <h1 className="font-display text-2xl sm:text-3xl font-bold">{termo.titulo}</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Versão {termo.versao}
                {termo.published_at && ` • Publicado em ${new Date(termo.published_at).toLocaleDateString("pt-BR")}`}
              </p>
            </header>
            <div
              className="prose prose-sm sm:prose-base dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(termo.conteudo) }}
            />
          </article>
        )}
      </div>
    </PageShell>
  );
}

export const TermosPublico = () => (
  <TermoPublico
    tipo={"termos_uso_plataforma" as TermoTipo}
    fallbackTitle="Termos de uso da plataforma"
    subtitle="Leia atentamente as condições gerais de uso."
  />
);

export const PrivacidadePublica = () => (
  <TermoPublico
    tipo={"privacidade" as TermoTipo}
    fallbackTitle="Política de privacidade"
    subtitle="Como coletamos, usamos e protegemos seus dados."
  />
);

export const LgpdPublico = () => (
  <TermoPublico
    tipo={"lgpd" as TermoTipo}
    fallbackTitle="LGPD — Lei Geral de Proteção de Dados"
    subtitle="Seus direitos e nossa conformidade com a LGPD."
  />
);
