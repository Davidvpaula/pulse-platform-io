// Adapter pattern para múltiplos providers de IA (Fase 6)
// Implementação inicial: LovableProvider via Lovable AI Gateway.

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

export interface AIRunResult {
  text: string;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  model: string;
  raw?: unknown;
}

export interface AIProviderOptions {
  model: string;
  temperature?: number;
  max_tokens?: number;
  jsonMode?: boolean;
}

export interface AIProvider {
  readonly name: "lovable" | "openai" | "anthropic" | "gemini" | "outro";
  run(messages: ChatMsg[], opts: AIProviderOptions): Promise<AIRunResult>;
}

export class LovableProvider implements AIProvider {
  readonly name = "lovable" as const;
  constructor(private apiKey: string) {}

  async run(messages: ChatMsg[], opts: AIProviderOptions): Promise<AIRunResult> {
    const t0 = Date.now();
    const body: Record<string, unknown> = {
      model: opts.model,
      messages,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.max_tokens ?? 800,
    };
    if (opts.jsonMode) body.response_format = { type: "json_object" };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": this.apiKey,
        "X-Lovable-AIG-SDK": "raw-fetch",
      },
      body: JSON.stringify(body),
    });

    const latency_ms = Date.now() - t0;

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Lovable AI ${res.status}: ${text.slice(0, 300)}`);
    }
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content ?? "";
    const usage = json?.usage ?? {};
    return {
      text,
      input_tokens: Number(usage.prompt_tokens ?? 0),
      output_tokens: Number(usage.completion_tokens ?? 0),
      latency_ms,
      model: json?.model ?? opts.model,
      raw: json,
    };
  }
}

// Estimativa de custo simples (cents) — ajustar conforme provider real.
// Valores conservadores para Gemini Flash; serve apenas para tracking interno.
export function estimateCostCents(input: number, output: number, model: string): number {
  const isPro = /pro/i.test(model);
  const isLite = /lite|nano/i.test(model);
  const inPer1k = isPro ? 0.0125 : isLite ? 0.001 : 0.0035;
  const outPer1k = isPro ? 0.0375 : isLite ? 0.004 : 0.0105;
  const cents = (input / 1000) * inPer1k * 100 + (output / 1000) * outPer1k * 100;
  return Math.round(cents * 10000) / 10000;
}

export function makeProvider(name: string, apiKey: string): AIProvider {
  // Apenas Lovable está implementado nesta fase; demais caem no Lovable como fallback seguro.
  switch (name) {
    case "lovable":
    default:
      return new LovableProvider(apiKey);
  }
}
