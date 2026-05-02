import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import {
  ArrowLeft, Calendar, MessageSquareText, Wallet, FileText, Building2, User,
  Stethoscope, Phone, ExternalLink, Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

type Paciente = {
  id: string;
  nome_completo: string | null;
  cpf: string | null;
  telefone: string | null;
  empresa_id: string | null;
  status_conta: string;
  feegow_status: string;
  feegow_paciente_id: string | null;
  created_at: string;
};

type Consulta = {
  id: string;
  inicio: string;
  status: string;
  modalidade: string | null;
  medico_id: string;
  medico_nome?: string;
  especialidade?: string;
};

function fmtData(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtHora(d: string) {
  return new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function PacientePerfil() {
  const { id } = useParams();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [pac, setPac] = useState<Paciente | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [consultas, setConsultas] = useState<Consulta[]>([]);

  // Determina a rota de volta pelo contexto
  const voltarTo = location.pathname.startsWith("/app/admin")
    ? "/app/admin/usuarios"
    : location.pathname.startsWith("/app/colaborador")
    ? "/app/colaborador/pacientes"
    : "/app/secretaria/pacientes";

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data: p } = await supabase
        .from("pacientes")
        .select("id,nome_completo,cpf,telefone,empresa_id,status_conta,feegow_status,feegow_paciente_id,created_at,user_id")
        .eq("id", id)
        .maybeSingle();
      if (!p) { setLoading(false); return; }
      setPac(p as any);

      // email from profiles
      if (p.user_id) {
        const { data: prof } = await supabase.from("profiles").select("email").eq("id", p.user_id).maybeSingle();
        setEmail(prof?.email ?? null);
      }

      // consultas
      const { data: cons } = await supabase
        .from("consultas")
        .select("id,inicio,status,modalidade,medico_id")
        .eq("paciente_id", id)
        .order("inicio", { ascending: false })
        .limit(20);

      if (cons?.length) {
        const medicoIds = [...new Set(cons.map(c => c.medico_id))];
        const { data: medicos } = await supabase
          .from("profiles")
          .select("id,nome")
          .in("id", medicoIds);
        const medicoMap = new Map(medicos?.map(m => [m.id, m.nome]) ?? []);
        setConsultas(cons.map(c => ({ ...c, medico_nome: medicoMap.get(c.medico_id) ?? "—" })));
      } else {
        setConsultas([]);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pac) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-muted-foreground">Paciente não encontrado.</p>
        <Button asChild variant="outline"><Link to={voltarTo}><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Link></Button>
      </div>
    );
  }

  const empresarial = !!pac.empresa_id;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to={voltarTo}><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Link>
      </Button>

      <PageHeader
        title={pac.nome_completo ?? "Sem nome"}
        description={`${empresarial ? "Empresarial" : "Particular"} · Cadastrado em ${fmtData(pac.created_at)}`}
        actions={
          <Button className="bg-gradient-primary hover:opacity-90" asChild>
            <Link to={`/app/secretaria/agenda?paciente=${pac.id}`}>
              <Calendar className="mr-2 h-4 w-4" />Novo agendamento
            </Link>
          </Button>
        }
      />

      {/* Status global */}
      <div className="card-elevated flex flex-wrap items-center gap-3 p-4">
        <Badge variant="outline" className={pac.status_conta === "ativo" ? "border-success/40 text-success" : "border-warning/40 text-warning"}>
          {pac.status_conta}
        </Badge>
        <Badge variant="outline" className={pac.feegow_status === "liberado" ? "border-success/40 text-success" : "border-muted-foreground/30 text-muted-foreground"}>
          Feegow: {pac.feegow_status}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Dados */}
          <div className="card-elevated p-6">
            <h3 className="font-display text-lg font-semibold">Dados</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Info label="Vínculo" icon={empresarial ? Building2 : User}>
                {empresarial ? "Empresarial" : "Particular"}
              </Info>
              <Info label="CPF" icon={FileText}>{pac.cpf ?? "—"}</Info>
              <Info label="Telefone" icon={Phone}>{pac.telefone ?? "—"}</Info>
              <Info label="E-mail" icon={MessageSquareText}>{email ?? "—"}</Info>
              <Info label="Feegow ID" icon={ExternalLink}>
                {pac.feegow_paciente_id ?? "—"}
              </Info>
            </div>
          </div>

          {/* Consultas */}
          <div className="card-elevated p-6">
            <h3 className="font-display text-lg font-semibold">Consultas</h3>
            <div className="mt-4 divide-y divide-border">
              {consultas.length === 0 && (
                <p className="py-4 text-sm text-muted-foreground">Sem consultas registradas.</p>
              )}
              {consultas.map(c => (
                <div key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.medico_nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtData(c.inicio)} {fmtHora(c.inicio)} · {c.modalidade ?? "online"}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">{c.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="card-elevated p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações rápidas</p>
            <div className="mt-3 grid gap-2">
              <Button size="sm" className="bg-gradient-primary hover:opacity-90 justify-start" asChild>
                <Link to={`/app/secretaria/agenda?paciente=${pac.id}`}>
                  <Calendar className="mr-2 h-4 w-4" />Criar agendamento
                </Link>
              </Button>
              <Button size="sm" variant="outline" className="justify-start" asChild>
                <Link to={`/app/admin/whatsapp?to=${encodeURIComponent(pac.telefone ?? "")}`}>
                  <Phone className="mr-2 h-4 w-4" />Enviar WhatsApp
                </Link>
              </Button>
              <Button size="sm" variant="outline" className="justify-start" asChild>
                <Link to={`/app/paciente/financeiro`}>
                  <Wallet className="mr-2 h-4 w-4" />Ver financeiro
                </Link>
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Info({ label, icon: Icon, children }: { label: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {children}
      </p>
    </div>
  );
}
