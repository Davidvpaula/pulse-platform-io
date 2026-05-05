import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ShieldCheck, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ResumoFinanceiro } from "@/components/paciente/plano-helpers";
import PlanoPlataformaTab from "@/components/paciente/PlanoPlataformaTab";
import PlanoPersonalizadoTab from "@/components/paciente/PlanoPersonalizadoTab";
import PlanoEmpresaTab from "@/components/paciente/PlanoEmpresaTab";

export default function PacientePlano() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [pacienteId, setPacienteId] = useState<string | null>(null);
  const [todasAssinaturas, setTodasAssinaturas] = useState<any[]>([]);
  const [beneficiosMap, setBeneficiosMap] = useState<Record<string, any[]>>({});
  const [planosDisponiveis, setPlanosDisponiveis] = useState<any[]>([]);
  const [pagamentos, setPagamentos] = useState<any[]>([]);

  const defaultTab = searchParams.get("tab") || "plataforma";

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: paciente } = await supabase
        .from("pacientes")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!paciente) { setLoading(false); return; }
      setPacienteId(paciente.id);

      // All subscriptions with plan data
      const { data: assinaturas } = await supabase
        .from("assinaturas")
        .select("*, planos(*)")
        .eq("paciente_id", paciente.id)
        .order("created_at", { ascending: false });

      setTodasAssinaturas(assinaturas || []);

      // Benefits for all plans
      const planoIds = [...new Set((assinaturas || []).map(a => a.plano_id))];
      if (planoIds.length > 0) {
        const { data: bens } = await supabase
          .from("plano_beneficios")
          .select("*")
          .in("plano_id", planoIds)
          .order("ordem");

        const map: Record<string, any[]> = {};
        for (const b of (bens || [])) {
          if (!map[b.plano_id]) map[b.plano_id] = [];
          map[b.plano_id].push(b);
        }
        setBeneficiosMap(map);
      }

      // Payments (last 12 months)
      const dozeAtras = new Date();
      dozeAtras.setFullYear(dozeAtras.getFullYear() - 1);
      const { data: pags } = await supabase
        .from("pagamentos")
        .select("*")
        .eq("paciente_id", paciente.id)
        .gte("created_at", dozeAtras.toISOString())
        .order("created_at", { ascending: false })
        .limit(20);
      setPagamentos(pags || []);

      // Available plans (site)
      const { data: disponiveis } = await supabase
        .from("planos")
        .select("*, plano_beneficios(nome)")
        .eq("publicado_site", true)
        .eq("status", "ativo")
        .order("ordem_exibicao");
      setPlanosDisponiveis(disponiveis || []);

    } catch (err) {
      console.error("Erro ao carregar planos:", err);
    } finally {
      setLoading(false);
    }
  }

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
            onReload={loadData}
          />
        </TabsContent>

        <TabsContent value="personalizado">
          <PlanoPersonalizadoTab
            assinaturas={personalizado}
            beneficiosMap={beneficiosMap}
            pacienteId={pacienteId || ""}
            onReload={loadData}
          />
        </TabsContent>

        <TabsContent value="empresa">
          <PlanoEmpresaTab
            assinaturas={empresa}
            beneficiosMap={beneficiosMap}
            onReload={loadData}
          />
        </TabsContent>
      </Tabs>

      {/* Resumo financeiro global */}
      <ResumoFinanceiro resumo={resumoFinanceiro} pagamentos={pagamentos} />
    </div>
  );
}
