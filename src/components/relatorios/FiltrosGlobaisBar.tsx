import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { FiltrosGlobais, periodoPreset } from "@/lib/relatorios/utils";
import { Filter, RotateCcw } from "lucide-react";

type Props = {
  value: FiltrosGlobais;
  onChange: (f: FiltrosGlobais) => void;
  showClinicos?: boolean; // mostra médico/especialidade/canal/status
  showEmpresa?: boolean;
};

const STATUS_CONSULTA = [
  { value: "agendada", label: "Agendada" },
  { value: "aguardando_pagamento", label: "Aguardando pagamento" },
  { value: "confirmada", label: "Confirmada" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "cancelada", label: "Cancelada" },
  { value: "no_show", label: "No-show" },
];

const CANAIS = [
  { value: "app", label: "App" },
  { value: "empresa", label: "Empresa" },
  { value: "manual_admin", label: "Manual (Admin)" },
  { value: "manual_secretaria", label: "Manual (Secretaria)" },
  { value: "retorno", label: "Retorno" },
  { value: "api", label: "API" },
];

export function FiltrosGlobaisBar({ value, onChange, showClinicos = true, showEmpresa = true }: Props) {
  const [medicos, setMedicos] = useState<{ id: string; nome: string }[]>([]);
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [empresas, setEmpresas] = useState<{ id: string; nome: string }[]>([]);

  useEffect(() => {
    (async () => {
      if (showClinicos) {
        const { data: ms } = await supabase
          .from("medicos")
          .select("id, nome, especialidade")
          .eq("status", "aprovado")
          .order("nome");
        setMedicos((ms || []).map((m: any) => ({ id: m.id, nome: m.nome })));
        const espSet = new Set<string>();
        (ms || []).forEach((m: any) => { if (m.especialidade) espSet.add(m.especialidade); });
        setEspecialidades(Array.from(espSet).sort());
      }
      if (showEmpresa) {
        const { data: es } = await supabase
          .from("empresas")
          .select("id, razao_social, nome_fantasia")
          .eq("ativo", true)
          .order("razao_social");
        setEmpresas((es || []).map((e: any) => ({ id: e.id, nome: e.nome_fantasia || e.razao_social })));
      }
    })();
  }, [showClinicos, showEmpresa]);

  const setPreset = (p: "hoje" | "7d" | "30d" | "90d" | "mes" | "ano") => {
    const { inicio, fim } = periodoPreset(p);
    onChange({ ...value, inicio, fim });
  };

  const limpar = () => {
    const { inicio, fim } = periodoPreset("30d");
    onChange({ inicio, fim });
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filtros</span>
        <div className="ml-auto flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => setPreset("hoje")}>Hoje</Button>
          <Button size="sm" variant="ghost" onClick={() => setPreset("7d")}>7d</Button>
          <Button size="sm" variant="ghost" onClick={() => setPreset("30d")}>30d</Button>
          <Button size="sm" variant="ghost" onClick={() => setPreset("mes")}>Mês</Button>
          <Button size="sm" variant="ghost" onClick={() => setPreset("ano")}>Ano</Button>
          <Button size="sm" variant="outline" onClick={limpar}>
            <RotateCcw className="h-3 w-3 mr-1" /> Limpar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div>
          <Label className="text-xs">Início</Label>
          <Input type="date" value={value.inicio} onChange={(e) => onChange({ ...value, inicio: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Fim</Label>
          <Input type="date" value={value.fim} onChange={(e) => onChange({ ...value, fim: e.target.value })} />
        </div>

        {showClinicos && (
          <>
            <div>
              <Label className="text-xs">Médico</Label>
              <Select
                value={value.medico_id || "todos"}
                onValueChange={(v) => onChange({ ...value, medico_id: v === "todos" ? null : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {medicos.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Especialidade</Label>
              <Select
                value={value.especialidade || "todas"}
                onValueChange={(v) => onChange({ ...value, especialidade: v === "todas" ? null : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {especialidades.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Canal</Label>
              <Select
                value={value.canal || "todos"}
                onValueChange={(v) => onChange({ ...value, canal: v === "todos" ? null : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {CANAIS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select
                value={value.status || "todos"}
                onValueChange={(v) => onChange({ ...value, status: v === "todos" ? null : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {STATUS_CONSULTA.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {showEmpresa && (
          <div>
            <Label className="text-xs">Empresa</Label>
            <Select
              value={value.empresa_id || "todas"}
              onValueChange={(v) => onChange({ ...value, empresa_id: v === "todas" ? null : v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {empresas.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </Card>
  );
}
