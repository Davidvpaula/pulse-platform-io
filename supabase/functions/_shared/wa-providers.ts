// Adapter de providers WhatsApp.
// Hoje: Meta Cloud API (sandbox/produção). Futuro: Evolution, etc.
// Sem hardcode de endpoint/payload nas edge functions de negócio.

export type WaSendResult = {
  ok: boolean;
  http_status: number;
  wa_message_id: string | null;
  raw: any;
  error_message?: string;
};

export type WaTextPayload = {
  to: string;
  message: string;
};

export type WaTemplatePayload = {
  to: string;
  template_name: string;
  language?: string;
  variables?: string[];
};

export interface WhatsAppProvider {
  readonly name: string;
  sendText(p: WaTextPayload): Promise<WaSendResult>;
  sendTemplate(p: WaTemplatePayload): Promise<WaSendResult>;
}

const META_BASE = "https://graph.facebook.com/v19.0";

export class MetaCloudProvider implements WhatsAppProvider {
  readonly name = "meta_cloud";
  constructor(private token: string, private phoneNumberId: string) {}

  private async post(payload: Record<string, unknown>): Promise<WaSendResult> {
    const res = await fetch(`${META_BASE}/${this.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const raw = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      http_status: res.status,
      wa_message_id: raw?.messages?.[0]?.id ?? null,
      raw,
      error_message: res.ok ? undefined : (raw?.error?.message ?? `http_${res.status}`),
    };
  }

  sendText(p: WaTextPayload) {
    return this.post({
      messaging_product: "whatsapp",
      to: p.to,
      type: "text",
      text: { body: p.message },
    });
  }

  sendTemplate(p: WaTemplatePayload) {
    const components = p.variables?.length
      ? [{
          type: "body",
          parameters: p.variables.map((v) => ({ type: "text", text: v })),
        }]
      : undefined;
    return this.post({
      messaging_product: "whatsapp",
      to: p.to,
      type: "template",
      template: {
        name: p.template_name,
        language: { code: p.language || "pt_BR" },
        ...(components && { components }),
      },
    });
  }
}

export function buildProvider(opts: { token: string; phoneNumberId: string }): WhatsAppProvider {
  // Futuro: chave de configuração para escolher provider.
  return new MetaCloudProvider(opts.token, opts.phoneNumberId);
}
