/* ============================================================================
 * INTEGRAÇÃO FEEGOW — núcleo enxuto (apenas identidade + status de conexão)
 * ----------------------------------------------------------------------------
 * Arquitetura: Operação interna vs Clínica externa.
 * Ver mem://features/arquitetura-clinical-provider.
 *
 * Este arquivo NÃO mais define schema espelhado, statusMap nem validações
 * "pronto para Feegow". Para deep-links e abertura externa, use
 *   - src/lib/clinical/clinicalUrls.ts
 *   - src/lib/clinical/useClinicalProvider.ts
 *   - src/components/clinical/AbrirNaFeegowButton.tsx
 *
 * Funções clínicas (importar documentos, vincular profissional, listar
 * profissionais) continuam vivas como edge functions.
 * ========================================================================= */

/** Mapa mínimo de identidade (IDs externos guardados localmente). */
export type FeegowMapping = {
  feegow_patient_id?: string | null;
  feegow_professional_id?: string | null;
  feegow_specialty_id?: string | null;
};

/** Estado da conexão (somente exibição em telas admin). */
export type FeegowConnectionState = {
  status: "conectado" | "pendente" | "erro";
  token_configurado: boolean;
  ultima_sincronizacao: string | null;
  ambiente: "produção" | "homologação";
  modo: "mock" | "real";
};

export const feegowConnection: FeegowConnectionState = {
  status: "pendente",
  token_configurado: false,
  ultima_sincronizacao: null,
  ambiente: "homologação",
  modo: "mock",
};
