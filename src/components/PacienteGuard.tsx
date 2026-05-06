import { ReactNode } from "react";
import { usePacienteAtual } from "@/lib/usePacienteAtual";
import { useAuth } from "@/lib/auth";
import { Loader2, ShieldX, Clock, Ban, XCircle, AlertTriangle, UserX } from "lucide-react";
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
 * Guard completo para rotas do paciente.
 * Valida: existência na tabela pacientes, status_conta.
 * Bloqueia: médicos, empresas, colaboradores sem registro de paciente.
 */
export default function PacienteGuard({ children }: { children: ReactNode }) {
  const { paciente, loading, situacao } = usePacienteAtual();
  const { profileKey } = useAuth();

  if (loading || situacao === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Usuário não possui registro na tabela pacientes
  if (situacao === "nao_encontrado") {
    if (profileKey === "admin") return <>{children}</>;
    return (
      <BlockScreen
        icon={ShieldX}
        title="Acesso restrito"
        description="Você não possui cadastro como paciente na plataforma. Se acredita ser um erro, entre em contato com o suporte."
        action={
          <Button variant="outline" onClick={() => window.location.href = "/app"}>
            Voltar ao início
          </Button>
        }
      />
    );
  }

  switch (situacao) {
    case "pendente":
      return (
        <BlockScreen
          icon={Clock}
          title="Cadastro pendente"
          description="Seu cadastro de paciente está sendo processado. Você será notificado quando estiver ativo."
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
          description={paciente?.status_motivo
            ? `Sua conta foi suspensa. Motivo: ${paciente.status_motivo}`
            : "Sua conta está temporariamente suspensa. Entre em contato com o suporte para mais informações."}
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
          description={paciente?.status_motivo
            ? `Sua conta foi bloqueada. Motivo: ${paciente.status_motivo}`
            : "Sua conta foi bloqueada. Entre em contato com o suporte."}
          action={
            <Button variant="outline" onClick={() => window.location.href = "/app"}>
              Voltar ao início
            </Button>
          }
        />
      );

    case "banido":
      return (
        <BlockScreen
          icon={UserX}
          title="Acesso permanentemente revogado"
          description="Seu acesso à plataforma foi revogado permanentemente. Entre em contato com o suporte se acredita ser um erro."
        />
      );

    case "ativo":
      return <>{children}</>;

    default:
      return (
        <BlockScreen
          icon={AlertTriangle}
          title="Status desconhecido"
          description="Não foi possível verificar o status da sua conta. Tente novamente ou contate o suporte."
          action={
            <Button variant="outline" onClick={() => window.location.reload()}>
              Tentar novamente
            </Button>
          }
        />
      );
  }
}
