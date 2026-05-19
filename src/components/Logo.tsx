import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import logoHorizontalColor from "@/assets/brand/logo-horizontal-color.png";
import logoHorizontalWhite from "@/assets/brand/logo-horizontal-white.png";
import logoHorizontalBlack from "@/assets/brand/logo-horizontal-black.png";
import logoVerticalColor from "@/assets/brand/logo-vertical-color.png";
import logoSymbolColor from "@/assets/brand/logo-symbol-color.png";
import logoSymbolWhite from "@/assets/brand/logo-symbol-white.png";

type LogoVariant =
  | "horizontal"      // colorido (default) — header claro
  | "white"           // horizontal branco — header escuro
  | "black"           // horizontal preto — PDFs / mono
  | "vertical"        // vertical colorido — login / splash
  | "symbol"          // símbolo colorido — favicon / app
  | "symbol-white";   // símbolo branco — marca d'água

type LogoSize = "sm" | "md" | "lg" | "xl";

const SOURCES: Record<LogoVariant, string> = {
  horizontal: logoHorizontalColor,
  white: logoHorizontalWhite,
  black: logoHorizontalBlack,
  vertical: logoVerticalColor,
  symbol: logoSymbolColor,
  "symbol-white": logoSymbolWhite,
};

const SIZE_CLASS: Record<LogoSize, string> = {
  sm: "h-16",
  md: "h-24",
  lg: "h-36",
  xl: "h-52",
};



interface LogoProps {
  className?: string;
  /** Compatibilidade c/ chamadas antigas: `mark` força variante symbol. */
  mark?: boolean;
  variant?: LogoVariant;
  size?: LogoSize;
  /** Se true, não envolve em <Link to="/">. */
  asImage?: boolean;
}

export const Logo = ({
  className,
  mark = false,
  variant,
  size = "md",
  asImage = false,
}: LogoProps) => {
  const finalVariant: LogoVariant = variant ?? (mark ? "symbol" : "horizontal");
  const src = SOURCES[finalVariant];

  const img = (
    <img
      src={src}
      alt="Nova Saúde"
      className={cn(SIZE_CLASS[size], "w-auto select-none", className)}
      draggable={false}
    />
  );

  if (asImage) return img;

  return (
    <Link to="/" className="inline-flex items-center" aria-label="Nova Saúde — início">
      {img}
    </Link>
  );
};
