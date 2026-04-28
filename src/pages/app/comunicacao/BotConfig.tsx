import { useState } from "react";
import {
  Bot, MessageSquare, ArrowDown, Sparkles, Plus, UserCog, GitBranch, Play, Pencil,
  X, Send,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

type BlockType = "mensagem" | "opcoes" | "auto" | "humano";
type Block = {
  id: number;
  type: BlockType;
  text: string;
  options?: string[];
};

const initial: Block[] = [
  { id: 1, type: "mensagem", text: "Olá, como podemos ajudar? 👋" },
  {
    id: 2, type: "opcoes", text: "Escolha uma opção:",
    options: ["Agendar consulta", "Remarcar consulta", "Falar com suporte", "Sou empresa", "Sou médico", "Financeiro"],
  },
  { id: 3, type: "auto", text: "Perfeito! Para qual especialidade você procura atendimento?" },
  { id: 4, type: "humano", text: "Conectando você com um atendente humano…" },
];

const blockMeta: Record<BlockType, { label: string; tone: string; icon: typeof MessageSquare }> = {
  mensagem: { label: "Mensagem inicial", tone: "border-primary/40 bg-primary-soft/40", icon: MessageSquare },
  opcoes:   { label: "Escolha do usuário", tone: "border-info/30 bg-info/5", icon: GitBranch },
  auto:     { label: "Resposta automática", tone: "border-accent/30 bg-accent/5", icon: Bot },
  humano:   { label: "Encaminhar para humano", tone: "border-warning/30 bg-warning/5", icon: UserCog },
};

const simAnswers: Record<string, string> = {
  "Agendar consulta": "Perfeito! Para qual especialidade você procura atendimento?",
  "Remarcar consulta": "Me informe seu nome completo para localizar o agendamento.",
  "Falar com suporte": "Conectando você com um atendente humano…",
  "Sou empresa": "Bem-vindo! Você é RH da empresa ou funcionário?",
  "Sou médico": "Vou te direcionar para o canal exclusivo de médicos.",
  "Financeiro": "Posso te enviar a 2ª via do boleto ou Pix da última cobrança?",
};

export default function BotConfig() {
  const [blocks, setBlocks] = useState<Block[]>(initial);
  const [editing, setEditing] = useState<Block | null>(null);
  const [simOpen, setSimOpen] = useState(false);
  const [simHistory, setSimHistory] = useState<{ from: "bot" | "user"; text: string }[]>([]);

  const addBlock = (type: BlockType) => {
    const id = Math.max(0, ...blocks.map(b => b.id)) + 1;
    setBlocks(b => [...b, {
      id, type,
      text: type === "humano" ? "Conectando você com um atendente…" : "Nova etapa",
      options: type === "opcoes" ? ["Opção A", "Opção B"] : undefined,
    }]);
  };

  const removeBlock = (id: number) => setBlocks(b => b.filter(x => x.id !== id));

  const startSim = () => {
    setSimHistory([{ from: "bot", text: blocks[0]?.text ?? "Olá!" }]);
    if (blocks[1]?.type === "opcoes") {
      setSimHistory(h => [...h, { from: "bot", text: blocks[1].text }]);
    }
    setSimOpen(true);
  };

  const pickOption = (opt: string) => {
    setSimHistory(h => [
      ...h,
      { from: "user", text: opt },
      { from: "bot", text: simAnswers[opt] ?? "Entendi! Vou te ajudar com isso." },
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bot de atendimento"
        description="Construtor visual de fluxo · base preparada para WhatsApp Business + IA."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={startSim}><Play className="mr-2 h-4 w-4" />Simular conversa</Button>
            <Button className="bg-gradient-primary hover:opacity-90" onClick={() => addBlock("mensagem")}>
              <Plus className="mr-2 h-4 w-4" />Nova etapa
            </Button>
          </div>
        }
      />

      <div className="card-elevated p-5 flex items-center gap-3 border-info/30 bg-info/5">
        <Sparkles className="h-5 w-5 shrink-0 text-info" />
        <p className="text-sm">
          <strong>Em breve:</strong> integração com IA para classificação de intenção, respostas contextuais e handoff inteligente.
        </p>
        <Button size="sm" variant="outline" className="ml-auto shrink-0">Reservar API</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Canvas */}
        <div className="card-elevated p-6">
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" /> Fluxo principal · WhatsApp
          </h3>

          <div className="mt-6 space-y-3">
            {blocks.map((b, idx) => {
              const M = blockMeta[b.type];
              return (
                <div key={b.id}>
                  <div className={cn("group rounded-xl border-2 p-4 transition-all hover:shadow-md", M.tone)}>
                    <div className="flex items-start gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-background border border-border">
                        <M.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            #{idx + 1} · {M.label}
                          </p>
                        </div>
                        <p className="mt-1 text-sm">{b.text}</p>
                        {b.options && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {b.options.map(o => (
                              <span key={o} className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs">
                                {o}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(b)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeBlock(b.id)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {idx < blocks.length - 1 && (
                    <div className="my-1 flex justify-center text-muted-foreground">
                      <ArrowDown className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Paleta */}
        <aside className="card-elevated h-fit p-5">
          <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Adicionar etapa
          </h4>
          <div className="mt-3 space-y-2">
            {(Object.keys(blockMeta) as BlockType[]).map(t => {
              const M = blockMeta[t];
              return (
                <button
                  key={t}
                  onClick={() => addBlock(t)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left transition-all hover:shadow-sm",
                    M.tone,
                  )}
                >
                  <M.icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{M.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">💡 Dica</p>
            <p className="mt-1">Use blocos de <strong>Escolha</strong> para criar bifurcações, e finalize com <strong>Encaminhar para humano</strong> quando for necessário.</p>
          </div>
        </aside>
      </div>

      {/* Edit block */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar etapa</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Texto</label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm"
                  rows={3}
                  value={editing.text}
                  onChange={e => setEditing({ ...editing, text: e.target.value })}
                />
              </div>
              {editing.type === "opcoes" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Opções (uma por linha)</label>
                  <textarea
                    className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm"
                    rows={5}
                    value={editing.options?.join("\n") ?? ""}
                    onChange={e => setEditing({ ...editing, options: e.target.value.split("\n").filter(Boolean) })}
                  />
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
                <Button onClick={() => {
                  setBlocks(bs => bs.map(b => b.id === editing.id ? editing : b));
                  setEditing(null);
                }}>Salvar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Simulator */}
      <Dialog open={simOpen} onOpenChange={setSimOpen}>
        <DialogContent className="max-w-md p-0">
          <div className="flex items-center gap-2 border-b border-border bg-gradient-primary p-4 text-primary-foreground">
            <Bot className="h-5 w-5" />
            <div>
              <p className="text-sm font-semibold">Lasmi Bot · Simulação</p>
              <p className="text-xs opacity-80">Como o paciente verá no WhatsApp</p>
            </div>
          </div>
          <div className="max-h-[400px] space-y-3 overflow-y-auto bg-muted/20 p-4">
            {simHistory.map((m, i) => (
              <div key={i} className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                  m.from === "user" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-card border border-border",
                )}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border p-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Escolha uma opção:</p>
            <div className="flex flex-wrap gap-1.5">
              {(blocks.find(b => b.type === "opcoes")?.options ?? []).map(o => (
                <button
                  key={o}
                  onClick={() => pickOption(o)}
                  className="rounded-full border border-primary/40 bg-primary-soft px-3 py-1 text-xs font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {o}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm" placeholder="Digite uma mensagem…" />
              <Button size="sm"><Send className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
