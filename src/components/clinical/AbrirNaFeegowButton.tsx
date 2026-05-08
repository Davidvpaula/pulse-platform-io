import { Button, type ButtonProps } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { useClinicalProvider } from "@/lib/clinical/useClinicalProvider";
import type { DeepLinkVariant } from "@/lib/clinical/clinicalUrls";

interface Props extends Omit<ButtonProps, "onClick" | "children" | "variant"> {
  /** ID externo do paciente/profissional no provider (ex: feegow_paciente_id). */
  externalId: string | null | undefined;
  /** Tipo de link (paciente, prontuário, documentos). */
  linkVariant?: DeepLinkVariant;
  /** Estilo visual do botão (passa para o Button do shadcn). */
  buttonVariant?: ButtonProps["variant"];
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
  linkVariant = "prontuario",
  buttonVariant = "outline",
  label,
  size = "sm",
  ...buttonProps
}: Props) {
  const { enabled, providerId, openDeepLink } = useClinicalProvider();

  if (!enabled || !externalId) return null;

  const text = label ?? defaultLabel[linkVariant];

  return (
    <Button
      type="button"
      size={size}
      variant={buttonVariant}
      onClick={() => openDeepLink(externalId, linkVariant)}
      title={`Abrir em ${providerId === "feegow" ? "Feegow" : providerId} (nova aba)`}
      {...buttonProps}
    >
      <ExternalLink className="h-4 w-4 mr-2" />
      {text}
    </Button>
  );
}
