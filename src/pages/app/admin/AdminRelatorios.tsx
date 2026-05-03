import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileBarChart, Construction, Download, Loader2 } from "lucide-react";
import { FiltrosGlobaisBar } from "@/components/relatorios/FiltrosGlobaisBar";
import { FiltrosGlobais, periodoPreset, toRpcArgs } from "@/lib/relatorios/utils";
import VisaoExecutivaTab from "@/components/relatorios/VisaoExecutivaTab";
import OperacaoClinicaTab from "@/components/relatorios/OperacaoClinicaTab";
import FinanceiroTab from "@/components/relatorios/FinanceiroTab";
import MedicosTab from "@/components/relatorios/MedicosTab";
import { supabase } from "@/integrations/supabase/client";
import { gerarPdfGeral } from "@/lib/relatorios/pdfRelatoriosGeral";
import { toast } from "sonner";

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

function LinkAba({ titulo, descricao, to, iconeTexto }: { titulo: string; descricao: string; to: string; iconeTexto: string }) {
  return (
    <Card className="p-8 text-center space-y-3">
      <FileBarChart className="h-10 w-10 mx-auto text-primary" />
      <h3 className="font-semibold">{titulo}</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">{descricao}</p>
      <Link to={to} className="inline-flex items-center text-sm font-medium text-primary hover:underline">
        {iconeTexto} →
      </Link>
    </Card>
  );
}

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
  const [exportando, setExportando] = useState(false);

  const exportarPdf = async () => {
    setExportando(true);
    try {
      const args = toRpcArgs(filtros);
      const [{ data: ex }, { data: cli }, { data: fin }] = await Promise.all([
        supabase.rpc("relatorios_executivo", args),
        supabase.rpc("relatorios_clinica", {
          p_inicio: args.p_inicio, p_fim: args.p_fim,
          p_medico_id: args.p_medico_id, p_especialidade: args.p_especialidade,
          p_canal: args.p_canal, p_empresa_id: args.p_empresa_id,
        }),
        supabase.rpc("relatorios_financeiro", { p_inicio: filtros.inicio, p_fim: filtros.fim }),
      ]);
      gerarPdfGeral({
        periodo: { inicio: filtros.inicio, fim: filtros.fim },
        executivo: ex as Record<string, any> | null,
        clinica: cli as Record<string, any> | null,
        financeiro: fin as Record<string, any> | null,
      });
      toast.success("PDF gerado com sucesso");
    } catch (e: any) {
      toast.error("Erro ao gerar PDF", { description: e.message });
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <PageHeader
          title="Relatórios"
          description="Centro de inteligência da plataforma — operação, financeiro, comunicação, marketing e mais."
        />
        <Button variant="outline" size="sm" onClick={exportarPdf} disabled={exportando}>
          {exportando ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
          Exportar PDF geral
        </Button>
      </div>

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
          <LinkAba titulo="Empresas (B2B)" descricao="Ranking de empresas, uso por colaborador, custo por empresa e ROI empresarial." to="/app/admin/relatorios-b2b" iconeTexto="Abrir Relatórios B2B" />
        </TabsContent>
        <TabsContent value="comunicacao" className="mt-4">
          <PlaceholderAba titulo="Comunicação (WhatsApp / Bot / IA)" descricao="Mensagens enviadas/recebidas, taxa e tempo médio de resposta, conversões via WhatsApp, Bot vs humano, IA vs humano." />
        </TabsContent>
        <TabsContent value="marketing" className="mt-4">
          <LinkAba titulo="Marketing & Tráfego" descricao="Cadastro manual de campanhas, eventos por fonte, funil visitante → lead → consulta, CPL, CPA e ROI." to="/app/admin/analises" iconeTexto="Abrir Análises & Marketing" />
        </TabsContent>
        <TabsContent value="planos" className="mt-4">
          <LinkAba titulo="Planos & Assinaturas" descricao="Receita recorrente, uso médio, lucro/prejuízo por plano e planos pouco utilizados." to="/app/admin/planos" iconeTexto="Abrir Gestão de Planos" />
        </TabsContent>
        <TabsContent value="auditoria" className="mt-4">
          <Card className="p-8 text-center space-y-3">
            <FileBarChart className="h-10 w-10 mx-auto text-primary" />
            <h3 className="font-semibold">Auditoria & Segurança</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Visão analítica completa dos eventos sensíveis: filtros por entidade, usuário, severidade e período, com exportação CSV/PDF.
            </p>
            <Link to="/app/admin/auditoria?tab=painel" className="inline-flex items-center text-sm font-medium text-primary hover:underline">
              Abrir relatório completo de auditoria →
            </Link>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
