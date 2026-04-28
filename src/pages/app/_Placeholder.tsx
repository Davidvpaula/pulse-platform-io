import { ReactNode } from "react";
import { Construction } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export default function Placeholder({
  title,
  description,
  children,
}: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <div className="card-elevated p-10 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
          <Construction className="h-6 w-6" />
        </div>
        <h3 className="mt-4 font-display text-lg font-semibold">Módulo em construção</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          A estrutura desta tela está reservada e será detalhada nas próximas iterações.
          A navegação e permissões já estão funcionais.
        </p>
        {children}
      </div>
    </div>
  );
}
