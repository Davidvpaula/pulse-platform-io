import { Bot, MessageSquare, ArrowRight, Sparkles, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

const fluxos = [
  { gat: "Saudação inicial", resp: "Olá! Eu sou a Lasmi 👋 Como posso ajudar?", tipo: "auto" },
  { gat: "Quero agendar", resp: "Perfeito! Qual especialidade você procura?", tipo: "fluxo" },
  { gat: "Quero remarcar", resp: "Me informe o nome do paciente.", tipo: "fluxo" },
  { gat: "Quero falar com suporte", resp: "Vou te transferir para um atendente.", tipo: "humano" },
  { gat: "Sou empresa", resp: "Bem-vindo! Você é RH ou funcionário?", tipo: "fluxo" },
  { gat: "Sou médico", resp: "Vou te direcionar para o canal médico.", tipo: "fluxo" },
  { gat: "Financeiro", resp: "Posso te enviar a 2ª via do boleto?", tipo: "fluxo" },
  { gat: "Falar com atendente", resp: "Conectando você a um humano…", tipo: "humano" },
];

export default function BotConfig() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Bot de atendimento"
        description="Configure os fluxos automáticos do WhatsApp."
        actions={<Button className="bg-gradient-primary hover:opacity-90"><Plus className="mr-2 h-4 w-4" />Novo fluxo</Button>}
      />

      <div className="card-elevated p-5 flex items-center gap-3 border-info/30 bg-info/5">
        <Sparkles className="h-5 w-5 text-info shrink-0" />
        <p className="text-sm">
          <strong>Em breve:</strong> integração com IA para respostas naturais e classificação automática de intenção.
        </p>
        <Button size="sm" variant="outline" className="ml-auto">Reservar API</Button>
      </div>

      <div className="card-elevated p-6">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" /> Fluxos ativos
        </h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {fluxos.map(f => (
            <div key={f.gat} className="rounded-xl border border-border p-4 hover:border-primary transition">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">{f.gat}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  f.tipo === "humano" ? "bg-warning/10 text-warning" :
                  f.tipo === "auto" ? "bg-success/10 text-success" : "bg-primary-soft text-primary"
                }`}>{f.tipo}</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="truncate">{f.resp}</span>
              </div>
              <div className="mt-3 flex items-center justify-end text-xs text-primary font-medium">
                Editar fluxo <ArrowRight className="ml-1 h-3 w-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
