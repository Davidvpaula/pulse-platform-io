import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, User, Stethoscope, Calendar, Building2 } from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { medicos, filaSecretaria, empresaFuncionarios } from "@/lib/mock";

const pacientes = [
  { nome: "Marina Costa", doc: "012.***.***-12" },
  { nome: "João Almeida", doc: "188.***.***-04" },
  { nome: "Renata Lima", doc: "447.***.***-98" },
  { nome: "Pedro Tavares", doc: "552.***.***-21" },
  { nome: "Sofia Mendes", doc: "703.***.***-77" },
];

const empresas = [
  { nome: "Construtora Horizonte", cnpj: "12.***.***/0001-44" },
  { nome: "TechNorte S/A", cnpj: "33.***.***/0001-78" },
  { nome: "Grupo Andrade", cnpj: "56.***.***/0001-12" },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
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

  const go = (to: string) => { setOpen(false); navigate(to); };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="relative h-10 w-full max-w-md justify-start bg-muted/60 text-muted-foreground border-transparent hover:bg-muted"
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="truncate">Buscar pacientes, médicos, agendamentos…</span>
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium md:inline-block">
          ⌘K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Digite para buscar em toda a plataforma…" />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

          <CommandGroup heading="Pacientes">
            {pacientes.map(p => (
              <CommandItem key={p.nome} onSelect={() => go("/app/secretaria/pacientes")}>
                <User className="mr-2 h-4 w-4 text-primary" />
                <span>{p.nome}</span>
                <span className="ml-auto text-xs text-muted-foreground">{p.doc}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />
          <CommandGroup heading="Médicos">
            {medicos.slice(0, 5).map(m => (
              <CommandItem key={m.slug} onSelect={() => go(`/medicos/${m.slug}`)}>
                <Stethoscope className="mr-2 h-4 w-4 text-accent" />
                <span>{m.nome}</span>
                <span className="ml-auto text-xs text-muted-foreground">{m.especialidade}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />
          <CommandGroup heading="Agendamentos">
            {filaSecretaria.slice(0, 4).map(a => (
              <CommandItem key={a.hora + a.paciente} onSelect={() => go("/app/secretaria/agendamentos")}>
                <Calendar className="mr-2 h-4 w-4 text-info" />
                <span>{a.paciente} · {a.medico}</span>
                <span className="ml-auto text-xs text-muted-foreground">{a.hora}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />
          <CommandGroup heading="Empresas">
            {empresas.map(e => (
              <CommandItem key={e.cnpj} onSelect={() => go("/app/admin/empresas")}>
                <Building2 className="mr-2 h-4 w-4 text-warning" />
                <span>{e.nome}</span>
                <span className="ml-auto text-xs text-muted-foreground">{e.cnpj}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
