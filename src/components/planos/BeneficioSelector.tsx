import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = { id: string; label: string; sub?: string };

interface Props {
  tipo: string;
  selectedId: string | null;
  selectedLabel: string;
  onSelect: (id: string | null, label: string) => void;
}

/**
 * Autocomplete dinâmico para benefícios de plano.
 * Busca médicos, especialidades ou serviços conforme o tipo selecionado.
 */
export function BeneficioSelector({ tipo, selectedId, selectedLabel, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Carrega opções ao abrir ou mudar tipo
  useEffect(() => {
    let active = true;
    if (!["medico", "especialidade", "servico"].includes(tipo)) {
      setOptions([]);
      return;
    }

    setLoading(true);
    (async () => {
      let opts: Option[] = [];

      if (tipo === "medico") {
        const { data } = await supabase
          .from("medicos")
          .select("id, nome, especialidade")
          .eq("status", "aprovado")
          .order("nome");
        opts = (data ?? []).map(p => ({ id: p.id, label: p.nome, sub: p.especialidade }));
      } else if (tipo === "especialidade") {
        const { data } = await supabase
          .from("especialidades")
          .select("id, nome")
          .eq("ativo", true)
          .order("ordem")
          .order("nome");
        opts = (data ?? []).map(e => ({ id: e.id, label: e.nome }));
      } else if (tipo === "servico") {
        const { data } = await supabase
          .from("servicos_financeiros")
          .select("id, nome, tipo")
          .eq("ativo", true)
          .order("nome");
        opts = (data ?? []).map(s => ({ id: s.id, label: s.nome, sub: s.tipo }));
      }

      if (active) {
        setOptions(opts);
        setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [tipo]);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q) || o.sub?.toLowerCase().includes(q));
  }, [options, query]);

  // Tipos sem seletor dinâmico
  if (!["medico", "especialidade", "servico"].includes(tipo)) {
    return null;
  }

  if (selectedId) {
    return (
      <div className="md:col-span-2">
        <Label>Referência</Label>
        <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm bg-muted/30">
          <span className="flex-1 truncate">{selectedLabel}</span>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => { onSelect(null, ""); setQuery(""); }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="md:col-span-2 relative">
      <Label>Selecionar {tipo === "medico" ? "médico" : tipo === "especialidade" ? "especialidade" : "serviço"}</Label>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder={`Buscar ${tipo}...`}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando…
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">Nenhum resultado</p>
          ) : (
            filtered.map(o => (
              <button
                key={o.id}
                type="button"
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors",
                  "focus:bg-accent outline-none"
                )}
                onClick={() => {
                  onSelect(o.id, o.label);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <span>{o.label}</span>
                {o.sub && <span className="ml-2 text-xs text-muted-foreground">({o.sub})</span>}
              </button>
            ))
          )}
        </div>
      )}

      {/* Backdrop to close */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}
