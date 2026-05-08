import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildClinicalDeepLink,
  type ClinicalProviderId,
  type DeepLinkVariant,
} from "./clinicalUrls";

type State = {
  loading: boolean;
  providerId: ClinicalProviderId;
  enabled: boolean;
};

let cache: { value: ClinicalProviderId; expiresAt: number } | null = null;
const TTL_MS = 60_000;

async function fetchProvider(): Promise<ClinicalProviderId> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "clinical_provider")
    .maybeSingle();
  const raw = (data?.value as unknown) ?? "none";
  const value =
    typeof raw === "string"
      ? (raw as ClinicalProviderId)
      : ("none" as ClinicalProviderId);
  const valid: ClinicalProviderId[] = ["feegow", "memed", "native", "none"];
  const final = valid.includes(value) ? value : "none";
  cache = { value: final, expiresAt: now + TTL_MS };
  return final;
}

/**
 * Hook do provider clínico ativo.
 * - `enabled` = provider != 'none' (controla se botões deep-link devem aparecer)
 * - `openDeepLink(externalId, variant)` = abre nova aba (noopener) com deep-link
 *
 * Cache de 60s para evitar bater no banco a cada render.
 */
export function useClinicalProvider() {
  const [state, setState] = useState<State>({
    loading: true,
    providerId: "none",
    enabled: false,
  });

  useEffect(() => {
    let mounted = true;
    fetchProvider().then((p) => {
      if (!mounted) return;
      setState({ loading: false, providerId: p, enabled: p !== "none" });
    });
    return () => {
      mounted = false;
    };
  }, []);

  function buildLink(
    externalId: string | null | undefined,
    variant: DeepLinkVariant,
  ): string | null {
    return buildClinicalDeepLink(state.providerId, externalId, variant);
  }

  function openDeepLink(
    externalId: string | null | undefined,
    variant: DeepLinkVariant,
  ): boolean {
    const url = buildLink(externalId, variant);
    if (!url) return false;
    window.open(url, "_blank", "noopener,noreferrer");
    return true;
  }

  return { ...state, buildLink, openDeepLink };
}
