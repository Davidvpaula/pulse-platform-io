import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, CheckCircle2, Clock, Loader2, Database, Link2 } from "lucide-react";

type Mapping = {
  id: string;
  status_interno: string;
  status_externo: string;
  descricao: string | null;
  ativo: boolean;
};

type EntityMapping = {
  label: string;
  local: string;
  feegow: string;
  status: "validado" | "pendente";
  detail?: string;
};

export default function FeegowMapeamento() {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [pacientesCount, setPacientesCount] = useState(0);
  const [docsCount, setDocsCount] = useState(0);
  const [profsCount, setProfsCount] = useState(0);

  useEffect(() => {
    (async () => {
      const [mapRes, pacRes, docRes, profRes] = await Promise.all([
        supabase
          .from("integracoes_status_mapping")
          .select("id, status_interno, status_externo, descricao, ativo")
          .eq("sistema_origem", "feegow")
          .order("status_interno"),
        supabase
          .from("pacientes")
          .select("id", { count: "exact", head: true })
          .not("feegow_paciente_id", "is", null),
        supabase
          .from("documentos_paciente")
          .select("id", { count: "exact", head: true })
          .ilike("storage_path", "feegow%"),
        supabase
          .from("medicos")
          .select("id", { count: "exact", head: true })
          .not("feegow_professional_id", "is", null),
      ]);
      setMappings((mapRes.data ?? []) as unknown as Mapping[]);
      setPacientesCount(pacRes.count ?? 0);
      setDocsCount(docRes.count ?? 0);
      setProfsCount(profRes.count ?? 0);
      setLoading(false);
    })();
  }, []);

  const entityMappings: EntityMapping[] = [
    {
      label: "Pacientes",
      local: "pacientes.feegow_paciente_id",
      feegow: "patient_id (Feegow)",
      status: pacientesCount > 0 ? "validado" : "pendente",
      detail: pacientesCount > 0 ? `${pacientesCount} paciente(s) vinculado(s)` : "Nenhum paciente vinculado ainda",
    },
    {
      label: "Reconciliação por CPF",
      local: "pacientes.cpf",
      feegow: "cpf (Feegow)",
      status: "validado",
      detail: "CPF é a chave de reconciliação entre sistemas",
    },
    {
      label: "Documentos / Exames",
      local: "documentos_paciente",
      feegow: "/patient/exam-requests",
      status: docsCount > 0 ? "validado" : "pendente",
      detail: docsCount > 0 ? `${docsCount} documento(s) importado(s)` : "Nenhum documento importado ainda",
    },
    {
      label: "Profissionais",
      local: "medicos.feegow_professional_id",
      feegow: "/professional/list",
      status: profsCount > 0 ? "validado" : "pendente",
      detail: profsCount > 0 ? `${profsCount} profissional(is) vinculado(s)` : "Nenhum profissional vinculado ainda — use a aba Profissionais",
    },
    {
      label: "Especialidades",
      local: "especialidades",
      feegow: "/specialties/list",
      status: "pendente",
      detail: "Mapeamento futuro — especialidades Feegow ↔ especialidades Lasmar",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mapeamento de status · Feegow"
        description="Mapeamentos reais entre status internos e status Feegow, lidos do banco de dados."
      />

      {/* Mapeamento de status de consultas */}
      <div className="card-elevated overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-5 py-3">
          <h3 className="font-semibold text-sm">Status de consultas</h3>
          <p className="text-xs text-muted-foreground">{mappings.length} mapeamento(s) configurado(s)</p>
        </div>

        <div className="grid grid-cols-[1.2fr_auto_1.2fr_auto] items-center gap-3 border-b border-border bg-muted/20 px-5 py-2 text-xs uppercase tracking-wider text-muted-foreground">
          <span>Status interno (Lasmar)</span>
          <span>→</span>
          <span>Status Feegow</span>
          <span>Ativo</span>
        </div>

        <div className="divide-y divide-border">
          {mappings.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground text-center">
              Nenhum mapeamento de status configurado.
            </p>
          )}
          {mappings.map(m => (
            <div key={m.id} className="grid grid-cols-[1.2fr_auto_1.2fr_auto] items-center gap-3 px-5 py-3">
              <span className="text-sm font-medium">{m.status_interno}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <span className="rounded-md border border-primary/30 bg-primary/5 px-2 py-0.5 text-primary">
                  {m.status_externo}
                </span>
              </span>
              <span className={`text-xs ${m.ativo ? "text-success" : "text-muted-foreground"}`}>
                {m.ativo ? "Sim" : "Não"}
              </span>
            </div>
          ))}
        </div>

        {mappings.length > 0 && (
          <div className="border-t border-border px-5 py-3">
            <p className="text-xs text-muted-foreground">
              {mappings.map(m => m.descricao).filter(Boolean).length} mapeamento(s) com descrição.
              Dados lidos de <code className="text-xs">integracoes_status_mapping</code>.
            </p>
          </div>
        )}
      </div>

      {/* Mapeamento de entidades */}
      <div className="card-elevated overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-5 py-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Mapeamento de entidades
          </h3>
          <p className="text-xs text-muted-foreground">Vínculo entre tabelas locais e dados da Feegow</p>
        </div>

        <div className="divide-y divide-border">
          {entityMappings.map(em => (
            <div key={em.label} className="flex items-center gap-4 px-5 py-4">
              <div className="shrink-0">
                {em.status === "validado" ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <Clock className="h-5 w-5 text-warning" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{em.label}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <code>{em.local}</code>
                  <Link2 className="h-3 w-3" />
                  <code>{em.feegow}</code>
                </p>
                {em.detail && <p className="text-xs text-muted-foreground mt-0.5">{em.detail}</p>}
              </div>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                em.status === "validado"
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-warning/30 bg-warning/10 text-warning"
              }`}>
                {em.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
