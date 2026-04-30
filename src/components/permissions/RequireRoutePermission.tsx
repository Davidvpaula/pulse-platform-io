import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { usePermission } from "@/lib/permissions/usePermission";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface Props {
  perm: string | string[];
  /** se true exige TODAS; senão basta uma */
  all?: boolean;
  children: ReactNode;
}

/**
 * Bloqueia acesso a rotas inteiras quando o usuário não tem a permissão.
 * Admins (role=admin) sempre passam — o has_permission do banco já cobre,
 * mas mantemos o componente robusto pra sessões em loading.
 */
export function RequireRoutePermission({ perm, all, children }: Props) {
  const { session } = useSession();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const { loading, hasAny, hasAll } = usePermission(perm);

  useEffect(() => {
    let active = true;
    (async () => {
      const uid = session?.user?.id;
      if (!uid) { if (active) setIsAdmin(false); return; }
      const { data } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
      if (active) setIsAdmin(!!data);
    })();
    return () => { active = false; };
  }, [session?.user?.id]);

  if (loading || isAdmin === null) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allowed = isAdmin || (all ? hasAll : hasAny);
  if (allowed) return <>{children}</>;

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="max-w-md">
        <CardContent className="space-y-4 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <Lock className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Acesso restrito</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Você não tem permissão para acessar esta página. Caso precise de acesso,
              fale com um administrador.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/admin/dashboard">Voltar ao início</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
