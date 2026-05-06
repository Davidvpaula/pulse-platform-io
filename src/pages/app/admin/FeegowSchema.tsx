import { PageHeader } from "@/components/PageHeader";
import { CheckCircle2, AlertTriangle, HelpCircle, Globe, ArrowUpRight } from "lucide-react";

type EndpointInfo = {
  path: string;
  method: "GET" | "POST";
  status: "funcionando" | "erro" | "nao_testado";
  statusDetail?: string;
  testedAt?: string;
};

const endpoints: EndpointInfo[] = [
  { path: "/specialties/list", method: "GET", status: "funcionando", statusDetail: "Retorna lista de especialidades", testedAt: "Maio 2026" },
  { path: "/professional/list", method: "GET", status: "funcionando", statusDetail: "Retorna lista de profissionais ativos", testedAt: "Maio 2026" },
  { path: "/patient/list", method: "GET", status: "funcionando", statusDetail: "Busca por CPF funciona", testedAt: "Maio 2026" },
  { path: "/patient/create", method: "POST", status: "funcionando", statusDetail: "Payload: nome_completo, nome_paciente, cpf, sexo_id", testedAt: "Maio 2026" },
  { path: "/patient/exam-requests", method: "GET", status: "funcionando", statusDetail: "Retorna pedidos de exame por paciente_id", testedAt: "Maio 2026" },
  { path: "/patient/list-origins", method: "GET", status: "funcionando", statusDetail: "Lista origens de pacientes", testedAt: "Maio 2026" },
  { path: "/laudos/list", method: "GET", status: "erro", statusDetail: "HTTP 422 — permissão pendente na instância Feegow" },
  { path: "/patient/prescriptions", method: "GET", status: "erro", statusDetail: "HTTP 422 — permissão pendente na instância Feegow" },
  { path: "/patient/store", method: "POST", status: "erro", statusDetail: "Endpoint legado — usar /patient/create" },
  { path: "/patient/new-patient", method: "POST", status: "erro", statusDetail: "Endpoint legado — usar /patient/create" },
  { path: "/patient/certificates", method: "GET", status: "nao_testado", statusDetail: "Atestados — requer teste" },
  { path: "/patient/medical-records", method: "GET", status: "nao_testado", statusDetail: "Prontuário — requer teste" },
  { path: "/patient/attachments", method: "GET", status: "nao_testado", statusDetail: "Anexos — requer teste" },
  { path: "/appointment/create", method: "POST", status: "nao_testado", statusDetail: "Criação de agendamento — requer aprovação" },
];

const statusIcon = (s: EndpointInfo["status"]) => {
  if (s === "funcionando") return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (s === "erro") return <AlertTriangle className="h-4 w-4 text-destructive" />;
  return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
};

const statusLabel = (s: EndpointInfo["status"]) => {
  if (s === "funcionando") return "border-success/30 bg-success/10 text-success";
  if (s === "erro") return "border-destructive/30 bg-destructive/10 text-destructive";
  return "border-border bg-muted/30 text-muted-foreground";
};

const statusText = (s: EndpointInfo["status"]) => {
  if (s === "funcionando") return "OK";
  if (s === "erro") return "Erro";
  return "Não testado";
};

export default function FeegowSchema() {
  const funcionando = endpoints.filter(e => e.status === "funcionando").length;
  const comErro = endpoints.filter(e => e.status === "erro").length;
  const naoTestado = endpoints.filter(e => e.status === "nao_testado").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Endpoints API · Feegow"
        description="Status real dos endpoints da API Feegow testados via edge functions."
      />

      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card-elevated p-4 flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-success" />
          <div>
            <p className="text-2xl font-bold">{funcionando}</p>
            <p className="text-xs text-muted-foreground">Funcionando</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <div>
            <p className="text-2xl font-bold">{comErro}</p>
            <p className="text-xs text-muted-foreground">Com erro / legado</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-3">
          <HelpCircle className="h-6 w-6 text-muted-foreground" />
          <div>
            <p className="text-2xl font-bold">{naoTestado}</p>
            <p className="text-xs text-muted-foreground">Não testado</p>
          </div>
        </div>
      </div>

      {/* Tabela de endpoints */}
      <div className="card-elevated overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-5 py-3 flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Base URL: https://api.feegow.com/v1/api</h3>
        </div>

        <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 border-b border-border bg-muted/20 px-5 py-2 text-xs uppercase tracking-wider text-muted-foreground">
          <span>Status</span>
          <span>Endpoint</span>
          <span>Método</span>
          <span>Detalhe</span>
        </div>

        <div className="divide-y divide-border">
          {endpoints.map(ep => (
            <div key={`${ep.method}-${ep.path}`} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-5 py-3">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold flex items-center gap-1 ${statusLabel(ep.status)}`}>
                {statusIcon(ep.status)}
                {statusText(ep.status)}
              </span>
              <code className="text-sm font-mono truncate">{ep.path}</code>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                ep.method === "GET" ? "border-info/30 bg-info/10 text-info" : "border-warning/30 bg-warning/10 text-warning"
              }`}>
                {ep.method}
              </span>
              <span className="text-xs text-muted-foreground max-w-[250px] truncate" title={ep.statusDetail}>
                {ep.statusDetail}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Payload validado */}
      <div className="card-elevated p-5">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <ArrowUpRight className="h-4 w-4 text-success" />
          Payload mínimo validado — POST /patient/create
        </h3>
        <pre className="text-xs bg-muted/50 p-4 rounded-lg overflow-auto font-mono">
{`{
  "nome_completo": "NOME COMPLETO",
  "nome_paciente": "PRIMEIRO_NOME",
  "cpf": "12345678900",
  "sexo_id": 1  // 1: Masculino, 2: Feminino
}`}
        </pre>
        <p className="mt-2 text-xs text-muted-foreground">
          Header obrigatório: <code>x-access-token: FEEGOW_API_TOKEN</code>
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        Dados baseados nos testes controlados executados em maio de 2026.
        Um botão "Re-testar endpoints" será implementado em etapa futura.
      </p>
    </div>
  );
}
