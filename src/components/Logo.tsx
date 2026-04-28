import { Stethoscope } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export const Logo = ({ className, mark = false }: { className?: string; mark?: boolean }) => (
  <Link to="/" className={cn("flex items-center gap-2", className)}>
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-elegant">
      <Stethoscope className="h-5 w-5" strokeWidth={2.4} />
    </span>
    {!mark && (
      <span className="flex flex-col leading-none">
        <span className="font-display text-base font-extrabold tracking-tight">Lasmar</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Telemed
        </span>
      </span>
    )}
  </Link>
);
