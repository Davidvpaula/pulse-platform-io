/**
 * Abstração de provider clínico (Feegow, Memed, Native, None).
 * Sistema interno = SoR operacional. Provider clínico = SoR clínico.
 *
 * Ver mem://features/arquitetura-clinical-provider.
 */

export type ClinicalProviderId = "feegow" | "memed" | "native" | "none";
export type DeepLinkVariant = "paciente" | "prontuario" | "documentos";

export interface ClinicalDocument {
  id: string;
  tipo: string;
  titulo: string;
  url?: string;
  criado_em: string;
}

export interface ClinicalProvider {
  readonly id: ClinicalProviderId;
  getPatientDeepLink(externalPatientId: string, variant: DeepLinkVariant): string | null;
  getDocumentsList(externalPatientId: string): Promise<ClinicalDocument[]>;
  downloadDocument(externalDocumentId: string): Promise<{ url: string } | null>;
  verifyHealth(): Promise<{ ok: boolean; latency_ms?: number; error?: string }>;
}

const FEEGOW_BASE_APP = Deno.env.get("FEEGOW_APP_URL") ?? "https://app.feegow.com";

class FeegowProvider implements ClinicalProvider {
  readonly id = "feegow" as const;

  getPatientDeepLink(id: string, variant: DeepLinkVariant): string | null {
    if (!id) return null;
    const base = `${FEEGOW_BASE_APP}/clinic/patient/${encodeURIComponent(id)}`;
    if (variant === "prontuario") return `${base}/medical-record`;
    if (variant === "documentos") return `${base}/documents`;
    return base;
  }

  async getDocumentsList(_externalPatientId: string): Promise<ClinicalDocument[]> {
    // Implementação real delega para feegow-importar-documentos.
    return [];
  }

  async downloadDocument(_externalDocumentId: string) {
    return null;
  }

  async verifyHealth() {
    const start = Date.now();
    const token = Deno.env.get("FEEGOW_API_TOKEN");
    if (!token) return { ok: false, error: "FEEGOW_API_TOKEN não configurado" };
    try {
      const baseUrl = (Deno.env.get("FEEGOW_BASE_URL") ?? "https://api.feegow.com/v1/api")
        .replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/specialty/list`, {
        method: "GET",
        headers: { "x-access-token": token },
      });
      return {
        ok: res.ok,
        latency_ms: Date.now() - start,
        error: res.ok ? undefined : `HTTP ${res.status}`,
      };
    } catch (e) {
      return { ok: false, latency_ms: Date.now() - start, error: (e as Error).message };
    }
  }
}

class NullProvider implements ClinicalProvider {
  readonly id = "none" as const;
  getPatientDeepLink() { return null; }
  async getDocumentsList() { return []; }
  async downloadDocument() { return null; }
  async verifyHealth() { return { ok: true }; }
}

const providers: Record<ClinicalProviderId, ClinicalProvider> = {
  feegow: new FeegowProvider(),
  memed: new NullProvider(),   // futuro
  native: new NullProvider(),  // futuro
  none: new NullProvider(),
};

/**
 * Lê app_settings.clinical_provider e devolve a implementação ativa.
 */
export async function getActiveProvider(
  supabase: { from: (t: string) => any },
): Promise<ClinicalProvider> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "clinical_provider")
    .maybeSingle();
  const raw = data?.value;
  const id: ClinicalProviderId =
    typeof raw === "string" && raw in providers ? (raw as ClinicalProviderId) : "none";
  return providers[id];
}

export function getProviderById(id: ClinicalProviderId): ClinicalProvider {
  return providers[id] ?? providers.none;
}
