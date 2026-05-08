/**
 * URL builders centralizados para o provider clínico ativo.
 * Único ponto de mudança se a URL externa mudar.
 *
 * Arquitetura: Operação interna vs Clínica externa.
 * Ver mem://features/arquitetura-clinical-provider.
 */

export type ClinicalProviderId = "feegow" | "memed" | "native" | "none";

export type DeepLinkVariant = "paciente" | "prontuario" | "documentos";

const FEEGOW_BASE_APP =
  (import.meta.env.VITE_FEEGOW_APP_URL as string | undefined) ??
  "https://app.feegow.com";

/** Builders por provider. Funções puras, sem side effects. */
const builders: Record<
  ClinicalProviderId,
  (externalId: string, variant: DeepLinkVariant) => string | null
> = {
  feegow: (id, variant) => {
    if (!id) return null;
    switch (variant) {
      case "paciente":
        return `${FEEGOW_BASE_APP}/clinic/patient/${encodeURIComponent(id)}`;
      case "prontuario":
        return `${FEEGOW_BASE_APP}/clinic/patient/${encodeURIComponent(id)}/medical-record`;
      case "documentos":
        return `${FEEGOW_BASE_APP}/clinic/patient/${encodeURIComponent(id)}/documents`;
    }
  },
  memed: () => null, // futuro
  native: () => null, // futuro
  none: () => null,
};

export function buildClinicalDeepLink(
  provider: ClinicalProviderId,
  externalId: string | null | undefined,
  variant: DeepLinkVariant,
): string | null {
  if (!externalId) return null;
  return builders[provider]?.(externalId, variant) ?? null;
}
