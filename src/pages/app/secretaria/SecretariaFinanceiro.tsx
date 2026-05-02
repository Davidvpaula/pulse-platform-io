import { useEffect, useState, useCallback } from "react";
import { Link2, RefreshCw, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { brl } from "@/lib/relatorios/utils";
import { NovaCobrancaDialog } from "@/components/financeiro/NovaCobrancaDialog";

const fmt = (s?: string | null) => s ? new Date(s).toLocaleString("pt-BR") : "—";

export default function SecretariaFinanceiro() {
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [podeCobrar, setPodeCobrar] = useState(false);
  const [podeVer, setPodeVer] = useState(false);

  const [novaOpen, setNovaOpen] = useState(false);

  const checarPermissoes = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const [{ data: p1 }, { data: p2 }] = await Promise.all([
      supabase.rpc("has_permission" as any, { _user_id: u.user.id, _key: "financeiro.ver" }),
      supabase.rpc("has_permission" as any, { _user_id: u.user.id, _key: "financeiro.cobrar" }),
    ]);
    setPodeVer(!!p1);
    setPodeCobrar(!!p2);
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const { data: p } = await supabase.from("pagamentos").select("*").order("created_at", { ascending: false }).limit(100);
      setPagamentos(p || []);
      const { data: l } = await supabase.from("cobrancas_links").select("*").order("created_at", { ascending: false }).limit(100);
      setLinks(l || []);
    } catch (e: any) { toast.error(e.message || "Erro ao carregar"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { checarPermissoes(); carregar(); }, [checarPermissoes, carregar]);


  if (!podeVer && !podeCobrar) {
    return (
      <div className="space-y-6">
        <PageHeader title="Financeiro" description="Cobranças e pagamentos" />
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          Você não tem permissão financeira atribuída. Solicite ao administrador as permissões <code>financeiro.ver</code> ou <code>financeiro.cobrar</code>.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Financeiro" description="Pagamentos pendentes e cobranças" />

      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}Atualizar
        </Button>
        {podeCobrar && <Button size="sm" onClick={() => setNovaOpen(true)}><Link2 className="h-4 w-4 mr-2" />Nova cobrança</Button>}
      </div>

      <Tabs defaultValue="pagamentos">
        <TabsList>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          <TabsTrigger value="links">Cobranças / Links</TabsTrigger>
        </TabsList>
        <TabsContent value="pagamentos">
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40"><tr><th className="text-left p-2">Valor</th><th className="text-left p-2">Status</th><th className="text-left p-2">Forma</th><th className="text-left p-2">Pago em</th><th className="text-left p-2">Criado em</th></tr></thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-t">
                      {[1,2,3,4,5].map(j => <td key={j} className="p-2"><Skeleton className="h-4 w-full" /></td>)}
                    </tr>
                  ))
                ) : pagamentos.length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Nenhum pagamento</td></tr>
                ) : (
                  pagamentos.map(p => (
                    <tr key={p.id} className="border-t">
                      <td className="p-2">{brl(p.valor_bruto_centavos || p.valor_centavos)}</td>
                      <td className="p-2"><Badge variant="outline">{p.status}</Badge></td>
                      <td className="p-2">{p.metodo || p.forma || "—"}</td>
                      <td className="p-2">{fmt(p.data_pagamento || p.paid_at)}</td>
                      <td className="p-2">{fmt(p.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="links">
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40"><tr><th className="text-left p-2">Descrição</th><th className="text-left p-2">Valor</th><th className="text-left p-2">Vencimento</th><th className="text-left p-2">Status</th><th className="text-left p-2">Criado em</th></tr></thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-t">
                      {[1,2,3,4,5].map(j => <td key={j} className="p-2"><Skeleton className="h-4 w-full" /></td>)}
                    </tr>
                  ))
                ) : links.length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Nenhuma cobrança</td></tr>
                ) : (
                  links.map(l => (
                    <tr key={l.id} className="border-t">
                      <td className="p-2">{l.descricao}</td>
                      <td className="p-2">{brl(l.valor_centavos)}</td>
                      <td className="p-2">{l.vencimento || "—"}</td>
                      <td className="p-2"><Badge variant="outline">{l.status}</Badge></td>
                      <td className="p-2">{fmt(l.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <NovaCobrancaDialog
        open={novaOpen}
        onOpenChange={setNovaOpen}
        onCreated={carregar}
      />
    </div>
  );
}
