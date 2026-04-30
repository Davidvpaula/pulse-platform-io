import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CreditCard,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Stethoscope,
  User,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Atalho = {
  to: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
};

const atalhos: Atalho[] = [
  { to: "/app/paciente/dashboard", label: "Dashboard", desc: "Visão geral da sua conta", icon: LayoutDashboard },
  { to: "/app/paciente/agendamentos", label: "Agendamentos", desc: "Suas consultas e retornos", icon: Calendar },
  { to: "/app/paciente/financeiro", label: "Financeiro", desc: "Histórico de pagamentos", icon: CreditCard },
  { to: "/app/paciente/documentos", label: "Documentos", desc: "Receitas, laudos e exames", icon: FileText },
  { to: "/app/paciente/mensagens", label: "Mensagens", desc: "Lembretes e comunicações", icon: MessageSquare },
  { to: "/app/paciente/perfil", label: "Perfil", desc: "Seus dados pessoais", icon: User },
  { to: "/agendar", label: "Agendar consulta", desc: "Ver médicos disponíveis", icon: Stethoscope },
];

export default function PacienteRotaNaoEncontrada() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.warn(
      "[paciente] Rota não encontrada:",
      location.pathname + location.search,
    );
  }, [location.pathname, location.search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rota não encontrada"
        description="Não conseguimos localizar a página que você tentou abrir."
      />

      <Card className="border-warning/40 bg-warning/5">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-warning/15 p-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                O endereço{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {location.pathname}
                </code>{" "}
                não existe ou foi movido.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Use os atalhos abaixo para voltar à sua área de paciente.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Voltar
            </Button>
            <Button size="sm" asChild>
              <Link to="/app/paciente/dashboard">Ir ao Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {atalhos.map(({ to, label, desc, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-xl border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
