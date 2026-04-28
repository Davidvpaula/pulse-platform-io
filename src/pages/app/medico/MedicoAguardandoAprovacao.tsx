import { useEffect, useState } from "react";
import { Clock, FileText, MessageSquare, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  getCurrentMedicoId, getMedico, STATUS_LABEL, DOC_LABEL,
  type MedicoCadastro,
} from "@/lib/medicoRegistro";
import { useNavigate } from "react-router-dom";

export default function MedicoAguardandoAprovacao() {
  const { setProfileKey } = useAuth();
  const navigate = useNavigate();
  const [med, setMed] = useState<MedicoCadastro | undefined>();

  useEffect(() => {
    const reload = () => {
      const id = getCurrentMedicoId();
      setMed(id ? getMedico(id) : undefined);
    };
    reload();
    window.addEventListener("lasmar:medicos-changed", reload);
    const t = setInterval(reload, 4000);
    return () => {
      window.removeEventListener("lasmar:medicos-changed", reload);
      clearInterval(t);
    };
  }, []);

  // Se foi aprovado, libera acesso ao dashboard
  useEffect(() => {
    if (med?.status === "aprovado") {
      setProfileKey("medico");
      navigate("/app/medico/dashboard", { replace: true });
    }
  }, [med?.status, setProfileKey, navigate]);

  if (!med) {
    return (
      <div className="container max-w-2xl py-16">
        <div className="card-elevated p-8 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-warning" />
          <h1 className="mt-4 font-display text-2xl font-bold">Nenhum cadastro encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Faça seu cadastro para enviar seus documentos para aprovação.
          </p>
          <Button className="mt-5 bg-gradient-primary hover:opacity-90" onClick={() => navigate("/cadastro/medico")}>
            Iniciar cadastro
          </Button>
        </div>
      </div>
    );
  }

  const tone =
    med.status === "aprovado" ? "success" :
    med.status === "reprovado" ? "destructive" :
    med.status === "em_analise" ? "primary" : "warning";

  return (
    <div className="container max-w-3xl py-12">
      <div className="card-elevated p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Status do cadastro</p>
            <h1 className="mt-2 font-display text-3xl font-bold">{med.nome}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              CRM {med.crm}/{med.ufCrm} · {med.especialidade}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full bg-${tone}/10 px-3 py-1 text-xs font-semibold text-${tone}`}>
            <Clock className="h-3.5 w-3.5" /> {STATUS_LABEL[med.status]}
          </span>
        </div>

        {med.status === "reprovado" && (
          <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-semibold text-destructive">Cadastro reprovado</p>
            {med.motivoCorrecao && <p className="mt-1 text-sm">{med.motivoCorrecao}</p>}
          </div>
        )}

        {med.status === "pendente" && med.motivoCorrecao && (
          <div className="mt-6 rounded-lg border border-warning/30 bg-warning/5 p-4">
            <p className="text-sm font-semibold text-warning-foreground">Correção solicitada</p>
            <p className="mt-1 text-sm">{med.motivoCorrecao}</p>
          </div>
        )}

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {med.documentos.map(d => (
            <div key={d.kind} className="flex items-center gap-3 rounded-lg border border-border p-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold">{DOC_LABEL[d.kind]}</p>
                <p className="truncate text-xs text-muted-foreground">{d.fileName}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-lg bg-muted/40 p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" /> O que acontece agora?
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Nossa equipe valida CRM, RQE e seus documentos.</li>
            <li>Você recebe a confirmação por e-mail.</li>
            <li>Após a aprovação, agenda, prontuário Feegow e atendimentos são liberados.</li>
          </ul>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Atualizar status
          </Button>
          <Button variant="ghost" className="text-muted-foreground">
            <MessageSquare className="mr-2 h-4 w-4" /> Falar com suporte
          </Button>
        </div>
      </div>
    </div>
  );
}
