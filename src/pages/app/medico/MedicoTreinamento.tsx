import { useState } from "react";
import { Play, CheckCircle2, BookOpen, Clock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Aula = { id: string; titulo: string; duracao: string; descricao: string };
type Modulo = { id: string; titulo: string; descricao: string; aulas: Aula[] };

const modulos: Modulo[] = [
  {
    id: "m1",
    titulo: "Primeiros passos no Lasmar Telemed",
    descricao: "Tour pela plataforma e primeiros atendimentos.",
    aulas: [
      { id: "a1", titulo: "Visão geral do dashboard", duracao: "4 min", descricao: "Entenda os blocos e o fluxo guiado de atendimento." },
      { id: "a2", titulo: "Iniciando uma consulta", duracao: "6 min", descricao: "Da agenda ao Google Meet em poucos cliques." },
      { id: "a3", titulo: "Abrindo o prontuário Feegow", duracao: "3 min", descricao: "Como acessar o prontuário do paciente vinculado." },
    ],
  },
  {
    id: "m2",
    titulo: "Boas práticas de telemedicina",
    descricao: "Orientações clínicas e éticas.",
    aulas: [
      { id: "b1", titulo: "Ambiente, câmera e iluminação", duracao: "5 min", descricao: "Padrão visual recomendado para consultas online." },
      { id: "b2", titulo: "Comunicação empática à distância", duracao: "8 min", descricao: "Técnicas para reduzir distância na telemedicina." },
    ],
  },
  {
    id: "m3",
    titulo: "Documentos e prescrição digital",
    descricao: "Receitas, atestados e assinatura digital.",
    aulas: [
      { id: "c1", titulo: "Emitindo receita digital", duracao: "5 min", descricao: "Fluxo passo a passo." },
      { id: "c2", titulo: "Atestado e relatórios clínicos", duracao: "4 min", descricao: "Modelos e variáveis dinâmicas." },
    ],
  },
];

export default function MedicoTreinamento() {
  const [concluidas, setConcluidas] = useState<Set<string>>(new Set(["a1"]));

  const toggle = (id: string) => {
    setConcluidas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const totalAulas = modulos.reduce((s, m) => s + m.aulas.length, 0);
  const progresso = Math.round((concluidas.size / totalAulas) * 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Treinamento"
        description="Vídeos, aulas e boas práticas para uso da plataforma."
      />

      {/* Progresso geral */}
      <div className="card-elevated p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">Seu progresso</p>
              <p className="text-xs text-muted-foreground">
                {concluidas.size} de {totalAulas} aulas concluídas
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-bold">{progresso}%</p>
            <p className="text-[11px] text-muted-foreground">trilha completa</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-gradient-primary transition-all" style={{ width: `${progresso}%` }} />
        </div>
      </div>

      {/* Módulos */}
      <div className="space-y-4">
        {modulos.map(m => (
          <div key={m.id} className="card-elevated overflow-hidden">
            <div className="border-b border-border p-5">
              <h3 className="font-display text-lg font-semibold">{m.titulo}</h3>
              <p className="text-sm text-muted-foreground">{m.descricao}</p>
            </div>
            <div className="divide-y divide-border">
              {m.aulas.map(a => {
                const done = concluidas.has(a.id);
                return (
                  <div key={a.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 p-4">
                    <div className={cn(
                      "grid h-10 w-10 place-items-center rounded-lg",
                      done ? "bg-success/10 text-success" : "bg-primary-soft text-primary",
                    )}>
                      {done ? <CheckCircle2 className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{a.titulo}</p>
                      <p className="truncate text-xs text-muted-foreground">{a.descricao}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {a.duracao}
                    </span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">Assistir</Button>
                      <Button size="sm" variant={done ? "ghost" : "default"} className={done ? "" : "bg-gradient-primary hover:opacity-90"} onClick={() => toggle(a.id)}>
                        {done ? "Desmarcar" : "Concluir"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Conteúdo gerenciado pelo Admin — novos módulos aparecem automaticamente.
      </p>
    </div>
  );
}
