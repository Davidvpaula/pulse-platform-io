import { Button, type ButtonProps } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { useClinicalProvider } from "@/lib/clinical/useClinicalProvider";
import type { DeepLinkVariant } from "@/lib/clinical/clinicalUrls";

interface Props extends Omit<ButtonProps, "onClick" | "children"> {
  /** ID externo do paciente/profissional no provider (ex: feegow_paciente_id). */
  externalId: string | null | undefined;
  variant?: DeepLinkVariant;
  label?: string;
}

const defaultLabel: Record<DeepLinkVariant, string> = {
  paciente: "Abrir paciente",
  prontuario: "Abrir prontuário",
  documentos: "Ver documentos",
};

/**
 * Deep-link discreto para o provider clínico externo.
 * Não renderiza nada se o provider estiver desativado ou se faltar o ID externo.
 */
export function AbrirNaFeegowButton({
  externalId,
  variant = "prontuario",
  label,
  size = "sm",
  variant: _btnVariant, // alias para clareza — Button.variant
  ...buttonProps
}: Props & { variant?: DeepLinkVariant }) {
  const { enabled, providerId, openDeepLink } = useClinicalProvider();

  if (!enabled || !externalId) return null;

  const text = label ?? defaultLabel[variant];

  return (
    <Button
      type="button"
      size={size}
      variant="outline"
      onClick={() => openDeepLink(externalId, variant)}
      title={`Abrir em ${providerId === "feegow" ? "Feegow" : providerId} (nova aba)`}
      {...buttonProps}
    >
      <ExternalLink className="h-4 w-4 mr-2" />
      {text}
    </Button>
  );
}
