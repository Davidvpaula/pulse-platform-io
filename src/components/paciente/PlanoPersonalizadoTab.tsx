import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import PlanoCard from "./PlanoCard";
import { supabase } from "@/integrations/supabase/client";

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

interface Props {
  assinaturas: any[];
  beneficiosMap: Record<string, any[]>;
  pacienteId: string;
  onReload: () => void;
}

export default function PlanoPersonalizadoTab({ assinaturas, beneficiosMap, pacienteId, onReload }: Props) {
  const [medicosMap, setMedicosMap] = useState<Record<string, MedicoCredito[]>>({});

  useEffect(() => {
    if (assinaturas.length > 0) loadMedicos();
  }, [assinaturas]);

  async function loadMedicos() {
    const planoIds = assinaturas.map(a => a.plano_id);

    // Get linked doctors
    const { data: planoMedicos } = await supabase
      .from("plano_medicos")
      .select("plano_id, medico_id")
      .in("plano_id", planoIds);

    if (!planoMedicos?.length) return;

    const medicoIds = [...new Set(planoMedicos.map(pm => pm.medico_id))];

    const { data: medicosData } = await supabase
      .from("medicos")
      .select("id, user_id, nome, especialidade, foto_url")
      .in("id", medicoIds);

    // Benefits per plan
    const { data: beneficios } = await supabase
      .from("plano_beneficios")
      .select("plano_id, medico_id, quantidade, ilimitado, periodo")
      .in("plano_id", planoIds);

    const benefMap = new Map<string, any>();
    for (const b of (beneficios ?? [])) {
      if (b.medico_id) benefMap.set(`${b.plano_id}:${b.medico_id}`, b);
    }

    // Count used credits this month
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const { data: consultas } = await supabase
      .from("consultas")
      .select("medico_id")
      .eq("paciente_id", pacienteId)
      .in("status", ["confirmada", "concluida", "em_andamento", "agendada"])
      .in("medico_id", medicoIds)
      .gte("inicio", inicioMes.toISOString());

    const usageMap = new Map<string, number>();
    for (const c of (consultas ?? [])) {
      usageMap.set(c.medico_id, (usageMap.get(c.medico_id) ?? 0) + 1);
    }

    // Group by plano
    const result: Record<string, MedicoCredito[]> = {};
    for (const pm of planoMedicos) {
      const med = medicosData?.find(m => m.id === pm.medico_id);
      if (!med) continue;
      const ben = benefMap.get(`${pm.plano_id}:${pm.medico_id}`);
      const entry: MedicoCredito = {
        medicoId: med.id,
        nome: med.nome,
        foto: med.foto_url,
        especialidade: med.especialidade,
        slug: med.slug,
        creditosTotal: ben?.quantidade ?? 0,
        creditosUsados: usageMap.get(med.id) ?? 0,
        ilimitado: ben?.ilimitado ?? false,
        periodo: ben?.periodo ?? "mensal",
      };
      if (!result[pm.plano_id]) result[pm.plano_id] = [];
      result[pm.plano_id].push(entry);
    }

    setMedicosMap(result);
  }

  if (assinaturas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-10 text-center">
        <Stethoscope className="mb-4 h-14 w-14 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold">Nenhum plano personalizado ativo</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Monte um plano sob medida com profissionais e benefícios personalizados.
        </p>
        <Button className="mt-5" asChild>
          <Link to="/app/paciente/montar-plano">
            <Sparkles className="mr-2 h-4 w-4" /> Montar meu plano
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {assinaturas.map((ass) => (
        <PlanoCard
          key={ass.id}
          assinatura={ass}
          plano={ass.planos}
          beneficios={beneficiosMap[ass.plano_id] || []}
          medicos={medicosMap[ass.plano_id] || []}
          showMedicos
          onCancelado={onReload}
        />
      ))}
    </div>
  );
}
