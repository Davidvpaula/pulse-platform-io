import { useMemo } from "react";
import { colaboradorMenu, type MenuNode } from "@/lib/menu/menuCatalog";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Mapa de permission_key → boolean (true = liberada). */
  permissoes: Record<string, boolean>;
  /** Se true, mostra tooltip com chave faltante em itens ocultos. */
  showDiagnostics?: boolean;
}

/**
 * Preview visual do menu lateral que o colaborador verá.
 * Usado pelo Admin na tela de permissões para antecipar
 * exatamente quais módulos ficarão visíveis.
 */
export function MenuPreview({ permissoes, showDiagnostics = false }: Props) {
  const allow = (key?: string) => !key || !!permissoes[key];

  const items = useMemo(() => {
    return colaboradorMenu.map(node => {
      if (node.children?.length) {
        const children = node.children.map(c => ({
          label: c.label,
          visible: allow(c.key),
          key: c.key,
        }));
        const anyVisible = children.some(c => c.visible);
        return { label: node.label, icon: node.icon, visible: anyVisible, children, key: node.key };
      }
      return { label: node.label, icon: node.icon, visible: allow(node.key), children: undefined, key: node.key };
    });
  }, [permissoes]);

  const visibleCount = items.filter(i => i.visible).length;
  const totalCount = items.length;

  return (
    <div className="rounded-lg border border-border bg-sidebar p-3 space-y-1">
      <div className="flex items-center justify-between mb-2 px-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Preview do menu
        </p>
        <Badge variant="outline" className="text-[10px]">
          {visibleCount}/{totalCount} módulos
        </Badge>
      </div>

      {items.map(item => {
        const Icon = item.icon;
        if (item.children) {
          const visibleChildren = item.children.filter(c => c.visible);
          return (
            <div key={item.label}>
              <div className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                item.visible
                  ? "text-sidebar-foreground"
                  : "text-muted-foreground/40 line-through"
              )}>
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 truncate text-xs">{item.label}</span>
                {!item.visible && showDiagnostics && (
                  <span className="text-[9px] text-destructive/60 font-mono" title="Nenhum filho liberado">
                    <Lock className="h-3 w-3" />
                  </span>
                )}
              </div>
              {item.visible && (
                <div className="ml-5 space-y-0.5 border-l border-border/50 pl-2">
                  {item.children.map(c => (
                    <div
                      key={c.label}
                      className={cn(
                        "flex items-center gap-1 rounded px-2 py-1 text-[11px]",
                        c.visible
                          ? "text-sidebar-foreground"
                          : "text-muted-foreground/40 line-through"
                      )}
                      title={!c.visible && showDiagnostics && c.key ? `Requer: ${c.key}` : undefined}
                    >
                      {c.visible ? <Eye className="h-2.5 w-2.5 text-success" /> : <EyeOff className="h-2.5 w-2.5" />}
                      <span>{c.label}</span>
                      {!c.visible && showDiagnostics && c.key && (
                        <span className="ml-auto font-mono text-[8px] text-destructive/50">{c.key}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }
        return (
          <div
            key={item.label}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
              item.visible
                ? "text-sidebar-foreground"
                : "text-muted-foreground/40 line-through"
            )}
            title={!item.visible && showDiagnostics && item.key ? `Requer: ${item.key}` : undefined}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 truncate text-xs">{item.label}</span>
            {item.visible ? (
              <Eye className="h-3 w-3 text-success" />
            ) : (
              <>
                <EyeOff className="h-3 w-3" />
                {showDiagnostics && item.key && (
                  <span className="font-mono text-[8px] text-destructive/50">{item.key}</span>
                )}
              </>
            )}
          </div>
        );
      })}

      {visibleCount === 0 && (
        <p className="px-2 py-3 text-xs text-muted-foreground text-center">
          Nenhum módulo liberado — o colaborador verá apenas a mensagem "Fale com um administrador".
        </p>
      )}
    </div>
  );
}
