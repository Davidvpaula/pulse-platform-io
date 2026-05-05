import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, ShieldCheck, Sparkles, Stethoscope } from "lucide-react";
import { brl } from "@/lib/format";

type MedicoPlano = {
  medicoId: string;
  medicoNome: string;
  medicoFoto: string | null;
  medicoEspecialidade: string | null;
  medicoSlug: string | null;
  creditosTotal: number;
  creditosUsados: number;
  ilimitado: boolean;
  periodo: string;
};

interface Props {
  userId: string;
}

export default function MeusProfissionaisPlano({ userId }: Props) {
  const [loading, setLoading] = useState(true);
  const [medicos, setMedicos] = useState<MedicoPlano[]>([]);
  const [planoNome, setPlanoNome] = useState("");

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function load() {
    setLoading(true);
    try {
      // 1. Get paciente
      const { data: paciente } = await supabase
        .from("pacientes")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (!paciente) { setLoading(false); return; }

      // 2. Get active assinatura
      const { data: ass } = await supabase
        .from("assinaturas")
        .select("id, plano_id, status, data_inicio, planos(nome)")
        .eq("paciente_id", paciente.id)
        .eq("status", "ativa" as any)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!ass) { setLoading(false); return; }
      setPlanoNome((ass.planos as any)?.nome ?? "Plano");

      // 3. Get linked doctors via plano_medicos
      const { data: planoMedicos } = await supabase
        .from("plano_medicos")
        .select("medico_id")
        .eq("plano_id", ass.plano_id);

      if (!planoMedicos?.length) { setLoading(false); return; }
      const medicoIds = planoMedicos.map((pm: any) => pm.medico_id);

      // 4. Get doctor info
      const { data: medicosData } = await supabase
        .from("medicos")
        .select("id, user_id, nome, especialidade, foto_url, slug")
        .in("id", medicoIds);

      if (!medicosData?.length) { setLoading(false); return; }

      // 5. Get plan benefits per doctor
      const { data: beneficios } = await supabase
        .from("plano_beneficios")
        .select("medico_id, quantidade, ilimitado, periodo")
        .eq("plano_id", ass.plano_id);

      // Map benefits by medico_id
      const benefMap = new Map<string, any>();
      for (const b of (beneficios ?? [])) {
        if (b.medico_id) benefMap.set(b.medico_id, b);
      }

      // 6. Count consultations used this period
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const medicoUserIds = medicosData.map((m: any) => m.user_id);
      const { data: consultas } = await supabase
        .from("consultas")
        .select("medico_id")
        .eq("paciente_id", paciente.id)
        .in("status", ["confirmada", "concluida", "em_andamento", "agendada"])
        .in("medico_id", medicoIds)
        .gte("inicio", inicioMes.toISOString());

      // Count per medico_id (PK)
      const usageMap = new Map<string, number>();
      for (const c of (consultas ?? [])) {
        usageMap.set(c.medico_id, (usageMap.get(c.medico_id) ?? 0) + 1);
      }

      // 7. Build result
      const result: MedicoPlano[] = medicosData.map((m: any) => {
        const ben = benefMap.get(m.id);
        return {
          medicoId: m.id,
          medicoNome: m.nome,
          medicoFoto: m.foto_url,
          medicoEspecialidade: m.especialidade,
          medicoSlug: m.slug,
          creditosTotal: ben?.quantidade ?? 0,
          creditosUsados: usageMap.get(m.id) ?? 0,
          ilimitado: ben?.ilimitado ?? false,
          periodo: ben?.periodo ?? "mensal",
        };
      });

      setMedicos(result);
    } catch (err) {
      console.error("Erro ao carregar profissionais do plano:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="card-elevated overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-4 py-2">
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (medicos.length === 0) return null;

  return (
    <div className="card-elevated overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-primary/5 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Profissionais do meu plano</p>
          <Badge variant="outline" className="text-xs">{planoNome}</Badge>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/app/paciente/plano">Ver plano completo</Link>
        </Button>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {medicos.map((m) => {
          const creditosRestantes = m.ilimitado
            ? null
            : Math.max(0, m.creditosTotal - m.creditosUsados);
          const semCreditos = !m.ilimitado && creditosRestantes === 0;

          return (
            <div
              key={m.medicoId}
              className="flex items-center gap-3 rounded-xl border border-border p-4 transition hover:border-primary/30 hover:bg-primary/5"
            >
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarImage src={m.medicoFoto || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {m.medicoNome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.medicoNome}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {m.medicoEspecialidade || "Clínico Geral"}
                </p>
                <div className="mt-1">
                  {m.ilimitado ? (
                    <Badge variant="outline" className="text-[10px] gap-1 text-success border-success/30">
                      <Sparkles className="h-3 w-3" /> Ilimitado
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${semCreditos ? "text-destructive border-destructive/30" : "text-primary border-primary/30"}`}
                    >
                      {creditosRestantes}/{m.creditosTotal} créditos ({m.periodo})
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant={semCreditos ? "outline" : "default"}
                className={semCreditos ? "" : "bg-gradient-primary hover:opacity-90"}
                asChild
              >
                <Link to={m.medicoSlug ? `/medicos/${m.medicoSlug}` : "/agendar"}>
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  Agendar
                </Link>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
