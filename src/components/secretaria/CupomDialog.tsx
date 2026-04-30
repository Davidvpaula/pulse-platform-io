import { useEffect, useState } from "react";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  createCupom, updateCupom, listMedicosResumo, listEspecialidadesResumo,
  type CupomDetalhado, type CupomEscopo, type CupomTipo,
} from "@/lib/clinico";

const schema = z.object({
  codigo: z.string().trim().min(3, "Mínimo 3 caracteres").max(40),
  nome: z.string().trim().min(2, "Nome obrigatório").max(120),
  descricao: z.string().trim().max(500).optional().or(z.literal("")),
  tipo: z.enum(["percentual", "fixo"]),
  valor: z.number().int().positive(),
  escopo: z.enum(["global", "medico", "especialidade"]),
  medico_id: z.string().uuid().optional().nullable(),
  especialidade_id: z.string().uuid().optional().nullable(),
  valido_ate: z.string().optional().or(z.literal("")),
  uso_maximo: z.number().int().positive().optional().nullable(),
  ativo: z.boolean(),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cupom?: CupomDetalhado | null;
  onSaved: () => void;
}

export default function CupomDialog({ open, onOpenChange, cupom, onSaved }: Props) {
  const editando = !!cupom;
  const [salvando, setSalvando] = useState(false);
  const [medicos, setMedicos] = useState<{ id: string; nome: string }[]>([]);
  const [especialidades, setEspecialidades] = useState<{ id: string; nome: string }[]>([]);

  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<CupomTipo>("percentual");
  const [valor, setValor] = useState<string>("10");
  const [escopo, setEscopo] = useState<CupomEscopo>("global");
  const [medicoId, setMedicoId] = useState<string>("");
  const [especialidadeId, setEspecialidadeId] = useState<string>("");
  const [validoAte, setValidoAte] = useState<string>("");
  const [usoMaximo, setUsoMaximo] = useState<string>("");
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    if (!open) return;
    listMedicosResumo().then(setMedicos);
    listEspecialidadesResumo().then(setEspecialidades);
    if (cupom) {
      setCodigo(cupom.codigo);
      setNome(cupom.nome);
      setDescricao(cupom.descricao ?? "");
      setTipo(cupom.tipo);
      setValor(
        cupom.tipo === "fixo"
          ? (cupom.valor / 100).toFixed(2).replace(".", ",")
          : String(cupom.valor),
      );
      setEscopo(cupom.escopo);
      setMedicoId(cupom.medico_id ?? "");
      setEspecialidadeId(cupom.especialidade_id ?? "");
      setValidoAte(cupom.valido_ate ? cupom.valido_ate.slice(0, 10) : "");
      setUsoMaximo(cupom.uso_maximo ? String(cupom.uso_maximo) : "");
      setAtivo(cupom.ativo);
    } else {
      setCodigo("");
      setNome("");
      setDescricao("");
      setTipo("percentual");
      setValor("10");
      setEscopo("global");
      setMedicoId("");
      setEspecialidadeId("");
      setValidoAte("");
      setUsoMaximo("");
      setAtivo(true);
    }
  }, [open, cupom]);

  async function salvar() {
    let valorNum: number;
    if (tipo === "fixo") {
      const cents = Math.round(parseFloat(valor.replace(",", ".")) * 100);
      if (!Number.isFinite(cents) || cents <= 0) {
        toast.error("Valor inválido"); return;
      }
      valorNum = cents;
    } else {
      const pct = parseInt(valor, 10);
      if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
        toast.error("Percentual deve ser de 1 a 100"); return;
      }
      valorNum = pct;
    }

    const parsed = schema.safeParse({
      codigo, nome,
      descricao: descricao || undefined,
      tipo, valor: valorNum, escopo,
      medico_id: escopo === "medico" ? (medicoId || null) : null,
      especialidade_id: escopo === "especialidade" ? (especialidadeId || null) : null,
      valido_ate: validoAte || undefined,
      uso_maximo: usoMaximo ? parseInt(usoMaximo, 10) : null,
      ativo,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    if (escopo === "medico" && !medicoId) { toast.error("Selecione o médico"); return; }
    if (escopo === "especialidade" && !especialidadeId) { toast.error("Selecione a especialidade"); return; }

    setSalvando(true);
    try {
      const payload = {
        codigo: parsed.data.codigo,
        nome: parsed.data.nome,
        descricao: parsed.data.descricao || null,
        tipo: parsed.data.tipo,
        valor: parsed.data.valor,
        escopo: parsed.data.escopo,
        medico_id: parsed.data.medico_id ?? null,
        especialidade_id: parsed.data.especialidade_id ?? null,
        valido_ate: parsed.data.valido_ate
          ? new Date(parsed.data.valido_ate + "T23:59:59").toISOString()
          : null,
        uso_maximo: parsed.data.uso_maximo ?? null,
        ativo: parsed.data.ativo,
      };
      if (editando && cupom) {
        await updateCupom(cupom.id, payload);
        toast.success("Cupom atualizado");
      } else {
        await createCupom(payload);
        toast.success("Cupom criado");
      }
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar cupom" : "Novo cupom"}</DialogTitle>
          <DialogDescription>
            Cupons podem ser globais ou restritos a um médico/especialidade.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Código</Label>
              <Input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="EX: BEMVINDO10"
                maxLength={40}
              />
            </div>
            <div>
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} />
            </div>
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              maxLength={500}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as CupomTipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentual">Percentual (%)</SelectItem>
                  <SelectItem value="fixo">Valor fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{tipo === "percentual" ? "Percentual (1-100)" : "Valor (R$)"}</Label>
              <Input
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                inputMode="decimal"
                placeholder={tipo === "percentual" ? "10" : "20,00"}
              />
            </div>
          </div>

          <div>
            <Label>Escopo</Label>
            <Select value={escopo} onValueChange={(v) => setEscopo(v as CupomEscopo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global (qualquer consulta)</SelectItem>
                <SelectItem value="medico">Médico específico</SelectItem>
                <SelectItem value="especialidade">Especialidade específica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {escopo === "medico" && (
            <div>
              <Label>Médico</Label>
              <Select value={medicoId} onValueChange={setMedicoId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {medicos.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {escopo === "especialidade" && (
            <div>
              <Label>Especialidade</Label>
              <Select value={especialidadeId} onValueChange={setEspecialidadeId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {especialidades.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Válido até (opcional)</Label>
              <Input
                type="date"
                value={validoAte}
                onChange={(e) => setValidoAte(e.target.value)}
              />
            </div>
            <div>
              <Label>Uso máximo (opcional)</Label>
              <Input
                type="number"
                min={1}
                value={usoMaximo}
                onChange={(e) => setUsoMaximo(e.target.value)}
                placeholder="Ilimitado"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Ativo</p>
              <p className="text-xs text-muted-foreground">
                Cupons inativos não podem ser aplicados.
              </p>
            </div>
            <Switch checked={ativo} onCheckedChange={setAtivo} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editando ? "Salvar" : "Criar cupom"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
