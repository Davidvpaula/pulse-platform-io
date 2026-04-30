import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { FileBarChart, Construction } from "lucide-react";
import { FiltrosGlobaisBar } from "@/components/relatorios/FiltrosGlobaisBar";
import { FiltrosGlobais, periodoPreset } from "@/lib/relatorios/utils";
import VisaoExecutivaTab from "@/components/relatorios/VisaoExecutivaTab";
import OperacaoClinicaTab from "@/components/relatorios/OperacaoClinicaTab";
import FinanceiroTab from "@/components/relatorios/FinanceiroTab";
import MedicosTab from "@/components/relatorios/MedicosTab";

const ABAS = [
  { value: "executivo", label: "Visão Executiva" },
  { value: "clinica", label: "Operação Clínica" },
  { value: "financeiro", label: "Financeiro" },
  { value: "medicos", label: "Médicos" },
  { value: "pacientes", label: "Pacientes" },
  { value: "empresas", label: "Empresas" },
  { value: "comunicacao", label: "Comunicação" },
  { value: "marketing", label: "Marketing" },
  { value: "planos", label: "Planos" },
  { value: "auditoria", label: "Auditoria" },
];

function PlaceholderAba({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <Card className="p-12 text-center">
      <Construction className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
      <h3 className="font-semibold mb-1">{titulo}</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">{descricao}</p>
      <p className="text-xs text-muted-foreground mt-3">Em construção — disponível na próxima rodada.</p>
    </Card>
  );
}

export default function AdminRelatorios() {
  const inicial = periodoPreset("30d");
  const [filtros, setFiltros] = useState<FiltrosGlobais>({
    inicio: inicial.inicio,
    fim: inicial.fim,
  });
  const [tab, setTab] = useState("executivo");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Relatórios"
        description="Centro de inteligência da plataforma — operação, financeiro, comunicação, marketing e mais."
      />

      <FiltrosGlobaisBar value={filtros} onChange={setFiltros} />

      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="inline-flex w-max">
            {ABAS.map((a) => (
              <TabsTrigger key={a.value} value={a.value} className="whitespace-nowrap">{a.label}</TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="executivo" className="mt-4"><VisaoExecutivaTab filtros={filtros} /></TabsContent>
        <TabsContent value="clinica" className="mt-4"><OperacaoClinicaTab filtros={filtros} /></TabsContent>
        <TabsContent value="financeiro" className="mt-4"><FinanceiroTab filtros={filtros} /></TabsContent>
        <TabsContent value="medicos" className="mt-4"><MedicosTab filtros={filtros} /></TabsContent>

        <TabsContent value="pacientes" className="mt-4">
          <PlaceholderAba titulo="Pacientes" descricao="Indicadores de novos pacientes, recorrentes, LTV, segmentação por idade/sexo/região, frequência média e abandono." />
        </TabsContent>
        <TabsContent value="empresas" className="mt-4">
          <PlaceholderAba titulo="Empresas (B2B)" descricao="Ranking de empresas, uso por colaborador, custo por empresa e ROI empresarial." />
        </TabsContent>
        <TabsContent value="comunicacao" className="mt-4">
          <PlaceholderAba titulo="Comunicação (WhatsApp / Bot / IA)" descricao="Mensagens enviadas/recebidas, taxa e tempo médio de resposta, conversões via WhatsApp, Bot vs humano, IA vs humano." />
        </TabsContent>
        <TabsContent value="marketing" className="mt-4">
          <PlaceholderAba titulo="Marketing & Tráfego" descricao="Cadastro manual de campanhas, eventos por fonte, funil visitante → lead → consulta, CPL, CPA e ROI." />
        </TabsContent>
        <TabsContent value="planos" className="mt-4">
          <PlaceholderAba titulo="Planos & Assinaturas" descricao="Receita recorrente, uso médio, lucro/prejuízo por plano e planos pouco utilizados (já existe módulo dedicado em Admin > Planos)." />
        </TabsContent>
        <TabsContent value="auditoria" className="mt-4">
          <PlaceholderAba titulo="Auditoria & Segurança" descricao="Log de ações sensíveis, acessos, alterações financeiras, exclusões e tentativas de violação." />
        </TabsContent>
      </Tabs>
    </div>
  );
}
