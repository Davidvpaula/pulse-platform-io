import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, User, Stethoscope, Calendar, Building2, Clock } from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import EmBreveDialog from "@/components/EmBreveDialog";

type MedicoResult = { id: string; nome: string; especialidade: string | null; crm: string; total_medicos_esp?: number };
type EspResult = { id: string; nome: string; slug: string; icone: string | null; total_medicos: number };

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [medicos, setMedicos] = useState<MedicoResult[]>([]);
  const [esps, setEsps] = useState<EspResult[]>([]);
  const [emBreveNome, setEmBreveNome] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Load data when dialog opens
  useEffect(() => {
    if (!open) return;
    (async () => {
      const [medRes, espRes] = await Promise.all([
        supabase.from("medicos").select("id, nome, especialidade, crm").eq("status", "aprovado").order("nome").limit(10),
        supabase.from("especialidades").select("id, nome, slug, icone").eq("ativo", true).order("ordem").order("nome"),
      ]);

      setMedicos((medRes.data ?? []) as MedicoResult[]);

      // Count doctors per specialty
      const { data: vinculos } = await supabase
        .from("medico_especialidades")
        .select("especialidade_id")
        .eq("ativo", true);

      const countMap = new Map<string, number>();
      for (const v of (vinculos ?? [])) {
        const eid = v.especialidade_id;
        countMap.set(eid, (countMap.get(eid) ?? 0) + 1);
      }

      setEsps(
        (espRes.data ?? []).map((e) => ({
          ...e,
          total_medicos: countMap.get(e.id) ?? 0,
        }))
      );
    })();
  }, [open]);

  const go = (to: string) => { setOpen(false); navigate(to); };

  const handleEspClick = (esp: EspResult) => {
    if (esp.total_medicos === 0) {
      setOpen(false);
      setEmBreveNome(esp.nome);
    } else {
      go(`/agendar?esp=${esp.id}`);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="relative h-10 w-full max-w-md justify-start bg-muted/60 text-muted-foreground border-transparent hover:bg-muted"
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="truncate">Buscar médicos, especialidades…</span>
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium md:inline-block">
          ⌘K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Digite para buscar…" />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

          <CommandGroup heading="Especialidades">
            {esps.map(e => (
              <CommandItem key={e.id} onSelect={() => handleEspClick(e)}>
                <span className="mr-2">{e.icone ?? "🩺"}</span>
                <span>{e.nome}</span>
                {e.total_medicos === 0 ? (
                  <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" /> Em breve
                  </span>
                ) : (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {e.total_medicos} {e.total_medicos === 1 ? "médico" : "médicos"}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />
          <CommandGroup heading="Médicos">
            {medicos.map(m => (
              <CommandItem key={m.id} onSelect={() => go("/agendar")}>
                <Stethoscope className="mr-2 h-4 w-4 text-primary" />
                <span>{m.nome}</span>
                <span className="ml-auto text-xs text-muted-foreground">{m.especialidade ?? "Clínica"}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <EmBreveDialog
        open={!!emBreveNome}
        onOpenChange={(v) => { if (!v) setEmBreveNome(null); }}
        especialidade={emBreveNome ?? ""}
      />
    </>
  );
}
