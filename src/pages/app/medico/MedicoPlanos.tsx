import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Eye, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PlanoBuilder } from "@/components/planos/PlanoBuilder";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

const STATUS_COLORS: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  ativo: "bg-success/10 text-success",
  inativo: "bg-destructive/10 text-destructive",
  arquivado: "bg-muted text-muted-foreground",
};

export default function MedicoPlanos() {
  const { session } = useSession();
  const uid = session?.user?.id;
  const [planos, setPlanos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showTermos, setShowTermos] = useState(false);
  const [termos, setTermos] = useState("");

  async function load() {
    if (!uid) return;
    setLoading(true);
    const { data } = await supabase
      .from("planos")
      .select("*")
      .eq("medico_id", uid)
      .eq("nivel", "medico" as any)
      .order("created_at", { ascending: false });
    setPlanos(data ?? []);
    setLoading(false);
  }

  async function loadTermos() {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "termos_plano_medico")
      .maybeSingle();
    setTermos((data?.value as string) ?? "Ao criar um plano personalizado, você concorda com os termos de uso da plataforma.");
  }

  useEffect(() => { load(); loadTermos(); }, [uid]);

  function novoPlano() {
    setShowTermos(true);
  }

  function aceitarTermos() {
    setShowTermos(false);
    setEditId(null);
    setBuilderOpen(true);
  }

  const toReais = (c: number) => `R$ ${((c || 0) / 100).toFixed(2).replace(".", ",")}`;

  return (
    <PageShell title="Meus Planos" subtitle="Crie e gerencie planos personalizados para seus pacientes">
      <div className="flex justify-end mb-4">
        <Button onClick={novoPlano}>
          <Plus className="h-4 w-4 mr-1" /> Novo plano
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : planos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Você ainda não criou nenhum plano.</p>
            <p className="text-sm mt-1">Crie um plano personalizado para oferecer aos seus pacientes.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {planos.map(p => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{p.nome}</CardTitle>
                  <Badge className={STATUS_COLORS[p.status] ?? ""}>{p.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {p.descricao_comercial && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{p.descricao_comercial}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">{toReais(p.valor_mensal_centavos)}<span className="text-xs font-normal text-muted-foreground">/mês</span></span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditId(p.id); setBuilderOpen(true); }}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {p.publicado_site && (
                  <Badge variant="outline" className="text-[10px]">
                    <Eye className="h-3 w-3 mr-1" /> Visível no perfil
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Termos */}
      <Dialog open={showTermos} onOpenChange={setShowTermos}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Termos e Condições</DialogTitle>
            <DialogDescription>Leia e aceite antes de criar seu plano.</DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto rounded border p-3 text-sm whitespace-pre-wrap">
            {termos}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTermos(false)}>Cancelar</Button>
            <Button onClick={aceitarTermos}>Aceitar e continuar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Builder */}
      <PlanoBuilder
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        planoId={editId}
        onSaved={load}
        medicoMode
      />
    </PageShell>
  );
}
