import { useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ShieldCheck, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ResumoFinanceiro } from "@/components/paciente/plano-helpers";
import PlanoPlataformaTab from "@/components/paciente/PlanoPlataformaTab";
import PlanoPersonalizadoTab from "@/components/paciente/PlanoPersonalizadoTab";
import PlanoEmpresaTab from "@/components/paciente/PlanoEmpresaTab";
import { usePacienteAtual } from "@/lib/usePacienteAtual";
import { usePacientePlanos } from "@/lib/paciente/queries";
import { PacienteLoading } from "@/components/paciente/PacienteStates";

export default function PacientePlano() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { paciente } = usePacienteAtual();
  const pacienteId = paciente?.id ?? null;

  const { data: planoData, isLoading: loading, refetch } = usePacientePlanos(pacienteId, !!pacienteId);

  const todasAssinaturas = planoData?.assinaturas ?? [];
  const beneficiosMap = planoData?.beneficiosMap ?? {};
  const planosDisponiveis = planoData?.planosDisponiveis ?? [];
  const pagamentos = planoData?.pagamentos ?? [];

  const defaultTab = searchParams.get("tab") || "plataforma";

  // Group subscriptions by type
  const { plataforma, personalizado, empresa } = useMemo(() => {
    const plat: any[] = [];
    const pers: any[] = [];
    const emp: any[] = [];

    for (const ass of todasAssinaturas) {
      const plano = ass.planos;
      if (!plano) continue;
      if (plano.empresa_id) {
        emp.push(ass);
      } else if (plano.nivel === "admin") {
        plat.push(ass);
      } else {
        pers.push(ass);
      }
    }
    return { plataforma: plat, personalizado: pers, empresa: emp };
  }, [todasAssinaturas]);

  // Financial summary
  const resumoFinanceiro = useMemo(() => {
    const pagos = pagamentos.filter(p => p.status === "aprovado" || p.status === "pago");
    const pendentes = pagamentos.filter(p => p.status === "pendente" || p.status === "processando");
    const totalPago = pagos.reduce((s, p) => s + (p.valor_centavos || 0), 0);
    const aPagar = pendentes.reduce((s, p) => s + (p.valor_centavos || 0), 0);
    const ultimaPaga = pagos[0] ?? null;
    return { totalPago, aPagar, pendentesCount: pendentes.length, falhasCount: 0, ultimaPaga };
  }, [pagamentos]);

  const countActive = (arr: any[]) => arr.filter(a => a.status !== "cancelada").length;

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Meu plano" description="Gerencie todos os seus planos e assinaturas" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (todasAssinaturas.length === 0 && planosDisponiveis.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Meu plano" description="Gerencie todos os seus planos e assinaturas" />
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center">
          <ShieldCheck className="mb-4 h-16 w-16 text-muted-foreground/40" />
          <h2 className="text-xl font-semibold">Você ainda não tem um plano</h2>
          <p className="mt-2 max-w-md text-muted-foreground">
            Conheça nossos planos ou monte um personalizado com profissionais e benefícios sob medida.
          </p>
          <div className="mt-6 flex gap-3">
            <Button asChild>
              <Link to="/app/paciente/montar-plano">
                <Sparkles className="mr-2 h-4 w-4" /> Montar meu plano
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/planos">Ver planos disponíveis</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  function TabBadge({ count }: { count: number }) {
    if (count === 0) return null;
    return (
      <Badge variant="secondary" className="ml-1.5 h-5 min-w-[20px] px-1.5 text-[10px]">
        {count}
      </Badge>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Meu plano" description="Gerencie todos os seus planos e assinaturas" />

      <Tabs
        defaultValue={defaultTab}
        onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}
        className="space-y-6"
      >
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="plataforma" className="text-xs sm:text-sm">
            Plataforma <TabBadge count={countActive(plataforma)} />
          </TabsTrigger>
          <TabsTrigger value="personalizado" className="text-xs sm:text-sm">
            Personalizado <TabBadge count={countActive(personalizado)} />
          </TabsTrigger>
          <TabsTrigger value="empresa" className="text-xs sm:text-sm">
            Empresa <TabBadge count={countActive(empresa)} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plataforma">
          <PlanoPlataformaTab
            assinaturas={plataforma}
            beneficiosMap={beneficiosMap}
            planosDisponiveis={planosDisponiveis}
            onReload={() => void refetch()}
          />
        </TabsContent>

        <TabsContent value="personalizado">
          <PlanoPersonalizadoTab
            assinaturas={personalizado}
            beneficiosMap={beneficiosMap}
            pacienteId={pacienteId || ""}
            onReload={() => void refetch()}
          />
        </TabsContent>

        <TabsContent value="empresa">
          <PlanoEmpresaTab
            assinaturas={empresa}
            beneficiosMap={beneficiosMap}
            onReload={() => void refetch()}
          />
        </TabsContent>
      </Tabs>

      {/* Resumo financeiro global */}
      <ResumoFinanceiro resumo={resumoFinanceiro} pagamentos={pagamentos} />
    </div>
  );
}
