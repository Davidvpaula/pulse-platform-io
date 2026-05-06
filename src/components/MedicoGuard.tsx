import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useMedicoAtual } from "@/lib/useMedicoAtual";
import { useAuth } from "@/lib/auth";
import { Loader2, ShieldX, Clock, Ban, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function BlockScreen({ icon: Icon, title, description, action }: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto mb-2">
            <Icon className="h-12 w-12 text-destructive mx-auto" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{description}</p>
          {action}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Guard completo para rotas do médico.
 * Valida: existência na tabela medicos, status, aprovação.
 * Bloqueia: pacientes, empresas, colaboradores sem registro médico.
 */
export default function MedicoGuard({ children }: { children: ReactNode }) {
  const { medico, loading, situacao } = useMedicoAtual();
  const { profileKey } = useAuth();
  const location = useLocation();

  // Loading — mostra spinner
  if (loading || situacao === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Usuário logado não é médico (paciente, empresa, colaborador)
  if (situacao === "nao_encontrado") {
    // Admin pode acessar via impersonação futuramente
    if (profileKey === "admin") {
      return <>{children}</>;
    }
    return (
      <BlockScreen
        icon={ShieldX}
        title="Acesso restrito"
        description="Você não possui cadastro como médico na plataforma. Se acredita ser um erro, entre em contato com o suporte."
        action={
          <Button variant="outline" onClick={() => window.location.href = "/app"}>
            Voltar ao início
          </Button>
        }
      />
    );
  }

  // Permite acesso à tela de aguardando aprovação
  const isAguardandoRoute = location.pathname.endsWith("/aguardando-aprovacao");

  // Status handlers
  switch (situacao) {
    case "pendente":
    case "em_analise":
      if (isAguardandoRoute) return <>{children}</>;
      return <Navigate to="/app/medico/aguardando-aprovacao" replace />;

    case "reprovado":
      return (
        <BlockScreen
          icon={XCircle}
          title="Cadastro reprovado"
          description="Seu cadastro médico foi reprovado. Verifique o motivo nos detalhes enviados por e-mail ou entre em contato com o suporte."
          action={
            <Button variant="outline" onClick={() => window.location.href = "/app"}>
              Voltar ao início
            </Button>
          }
        />
      );

    case "suspenso":
      return (
        <BlockScreen
          icon={Clock}
          title="Conta suspensa"
          description={medico?.suspensao_motivo
            ? `Sua conta foi suspensa. Motivo: ${medico.suspensao_motivo}`
            : "Sua conta médica está temporariamente suspensa. Entre em contato com o suporte para mais informações."
          }
          action={
            <Button variant="outline" onClick={() => window.location.href = "/app"}>
              Voltar ao início
            </Button>
          }
        />
      );

    case "bloqueado":
      return (
        <BlockScreen
          icon={Ban}
          title="Conta bloqueada"
          description={medico?.bloqueio_motivo
            ? `Sua conta foi bloqueada. Motivo: ${medico.bloqueio_motivo}`
            : "Sua conta médica foi bloqueada. Entre em contato com o suporte."
          }
          action={
            <Button variant="outline" onClick={() => window.location.href = "/app"}>
              Voltar ao início
            </Button>
          }
        />
      );

    case "aprovado":
      return <>{children}</>;

    default:
      return (
        <BlockScreen
          icon={AlertTriangle}
          title="Status desconhecido"
          description="Não foi possível verificar o status do seu cadastro médico. Tente novamente ou contate o suporte."
          action={
            <Button variant="outline" onClick={() => window.location.reload()}>
              Tentar novamente
            </Button>
          }
        />
      );
  }
}
