import { ReactNode } from "react";
import { AppBreadcrumb } from "@/components/AppBreadcrumb";

type Props = {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Set to true to hide automatic breadcrumbs (e.g. dashboard pages) */
  hideBreadcrumb?: boolean;
};

export const PageHeader = ({ title, description, actions, hideBreadcrumb }: Props) => (
  <div>
    {!hideBreadcrumb && <AppBreadcrumb />}
    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  </div>
);
