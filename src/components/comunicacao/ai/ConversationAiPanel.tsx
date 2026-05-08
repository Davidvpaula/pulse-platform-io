import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, FileText, Tag, ShieldAlert, MessageSquareText, Loader2, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useConversationAi } from "@/hooks/useConversationAi";
import { ConversationAiRiskBadge } from "./ConversationAiRiskBadge";
import { ConversationAiIntentBadge } from "./ConversationAiIntentBadge";
import { toast } from "sonner";

type Props = {
  conversationId: string;
  onApplySuggestion?: (text: string) => void;
};

type Suggestion = { text: string; tone?: string };

export function ConversationAiPanel({ conversationId, onApplySuggestion }: Props) {
  const { enabled, summary, intent, risk, loadingAction, run, markAccepted } = useConversationAi(conversationId);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [lastReplyAuditId, setLastReplyAuditId] = useState<string | null>(null);

  if (!enabled) {
    return (
      <Card className="p-3 text-xs text-muted-foreground">
        IA assistiva está desativada. Peça ao admin para habilitar em <span className="font-medium">/app/admin/ia-assistiva</span>.
      </Card>
    );
  }

  async function handleSummarize() {
    const r = await run<any>("summarize");
    if (r?.cached) toast.info("Resumo já estava em cache.");
  }
  async function handleIntent() { await run("classify_intent"); }
  async function handleRisk() { await run("detect_risk"); }
  async function handleSuggest() {
    const r = await run<any>("suggest_reply");
    if (r?.reply?.suggestions) {
      setSuggestions(r.reply.suggestions);
      setLastReplyAuditId(r.audit_id ?? null);
    }
  }

  async function applyReply(s: Suggestion) {
    onApplySuggestion?.(s.text);
    if (lastReplyAuditId) await markAccepted(lastReplyAuditId, true);
    toast.success("Sugestão aplicada ao rascunho. Revise antes de enviar.");
  }
  async function rejectReply() {
    if (lastReplyAuditId) await markAccepted(lastReplyAuditId, false);
    setSuggestions([]);
  }

  return (
    <Card className="p-2">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> IA Copiloto
        </div>
        <div className="flex items-center gap-1">
          <ConversationAiIntentBadge intent={intent?.detected_intent} department={intent?.suggested_department} priority={intent?.suggested_priority} compact />
          <ConversationAiRiskBadge level={risk?.risk_level} compact />
        </div>
      </div>

      <Tabs defaultValue="resumo" className="w-full">
        <TabsList className="grid grid-cols-4 h-7">
          <TabsTrigger value="resumo" className="text-[10px] h-6"><FileText className="h-3 w-3 mr-1" />Resumo</TabsTrigger>
          <TabsTrigger value="intencao" className="text-[10px] h-6"><Tag className="h-3 w-3 mr-1" />Intenção</TabsTrigger>
          <TabsTrigger value="risco" className="text-[10px] h-6"><ShieldAlert className="h-3 w-3 mr-1" />Risco</TabsTrigger>
          <TabsTrigger value="sugestao" className="text-[10px] h-6"><MessageSquareText className="h-3 w-3 mr-1" />Sugerir</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-2 space-y-2">
          <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={handleSummarize} disabled={loadingAction === "summarize"}>
            {loadingAction === "summarize" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
            Gerar resumo
          </Button>
          {summary && (
            <div className="text-xs whitespace-pre-wrap rounded border p-2 bg-muted/40">
              {summary.summary}
              <div className="text-[10px] text-muted-foreground mt-1">{new Date(summary.created_at).toLocaleString("pt-BR")}</div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="intencao" className="mt-2 space-y-2">
          <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={handleIntent} disabled={loadingAction === "classify_intent"}>
            {loadingAction === "classify_intent" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Tag className="h-3 w-3 mr-1" />}
            Classificar intenção
          </Button>
          {intent && (
            <div className="text-xs space-y-1">
              <div><span className="text-muted-foreground">Intenção:</span> <Badge variant="outline" className="text-[10px]">{intent.detected_intent}</Badge></div>
              {intent.suggested_department && <div><span className="text-muted-foreground">Setor sugerido:</span> {intent.suggested_department}</div>}
              {intent.suggested_priority && <div><span className="text-muted-foreground">Prioridade:</span> {intent.suggested_priority}</div>}
              {intent.confidence != null && <div className="text-[10px] text-muted-foreground">Confiança: {(intent.confidence * 100).toFixed(0)}%</div>}
            </div>
          )}
        </TabsContent>

        <TabsContent value="risco" className="mt-2 space-y-2">
          <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={handleRisk} disabled={loadingAction === "detect_risk"}>
            {loadingAction === "detect_risk" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <ShieldAlert className="h-3 w-3 mr-1" />}
            Analisar risco
          </Button>
          {risk && (
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-2">
                <ConversationAiRiskBadge level={risk.risk_level} />
                {risk.score != null && <span className="text-[10px] text-muted-foreground">score {risk.score}</span>}
              </div>
              {risk.requires_supervisor && <div className="text-destructive text-[11px]">⚠ Sugestão: envolver supervisor.</div>}
              {Array.isArray(risk.signals) && risk.signals.length > 0 && (
                <ul className="text-[11px] list-disc pl-4">
                  {risk.signals.slice(0, 5).map((s: string, i: number) => <li key={i}>{String(s)}</li>)}
                </ul>
              )}
              {risk.notes && <div className="text-[11px] text-muted-foreground">{risk.notes}</div>}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sugestao" className="mt-2 space-y-2">
          <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={handleSuggest} disabled={loadingAction === "suggest_reply"}>
            {loadingAction === "suggest_reply" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <MessageSquareText className="h-3 w-3 mr-1" />}
            Sugerir resposta
          </Button>
          {suggestions.length > 0 && (
            <div className="space-y-1.5">
              {suggestions.map((s, i) => (
                <div key={i} className="rounded border p-2 text-xs bg-muted/30">
                  <div className="whitespace-pre-wrap">{s.text}</div>
                  <div className="flex items-center justify-between mt-1.5">
                    {s.tone && <Badge variant="secondary" className="text-[10px]">{s.tone}</Badge>}
                    <div className="flex gap-1 ml-auto">
                      <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => rejectReply()}><X className="h-3 w-3 mr-1" />Ignorar</Button>
                      <Button size="sm" variant="default" className="h-6 text-[11px]" onClick={() => applyReply(s)}><Check className="h-3 w-3 mr-1" />Usar</Button>
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground italic">A IA sugere — você revisa e envia. Nada é enviado automaticamente.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
