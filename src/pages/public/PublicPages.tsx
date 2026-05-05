import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Star, Video, Calendar, MapPin, GraduationCap, Loader2, Stethoscope,
  Clock, Search, SlidersHorizontal, ArrowUpDown, ShieldCheck, ChevronDown, ChevronUp, User,
  CheckCircle2, ArrowUpRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { useSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import { useEspecialidadesPublicas } from "@/hooks/useEspecialidadesPublicas";
import { useMedicosDestaque, type MedicoDestaque } from "@/hooks/useMedicosDestaque";
import { useIsMobile } from "@/hooks/use-mobile";
import EmBreveDialog from "@/components/EmBreveDialog";
import MedicoSlotsPanel from "@/components/public/MedicoSlotsPanel";

/* ── helpers ── */

function medicoSlug(nome: string) {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function proxHorarioLabel(iso: string | null): string {
  if (!iso) return "Sem horários";
  const d = new Date(iso);
  const hoje = new Date();
  const amanha = new Date();
  amanha.setDate(hoje.getDate() + 1);
  const eq = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (eq(d, hoje)) return `Hoje às ${hora}`;
  if (eq(d, amanha)) return `Amanhã às ${hora}`;
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} às ${hora}`;
}

function truncateBio(bio: string | null, max = 120): string {
  if (!bio) return "";
  if (bio.length <= max) return bio;
  return bio.slice(0, max).trimEnd() + "…";
}

function iniciais(nome: string) {
  return nome.split(" ").filter(s => s.length > 1).map(s => s[0]).slice(0, 2).join("").toUpperCase();
}

/* ── Especialidades ── */

export const Especialidades = () => {
  const { especialidades, loading } = useEspecialidadesPublicas();
  const [emBreveNome, setEmBreveNome] = useState<string | null>(null);

  return (
    <PageShell title="Especialidades" subtitle="Profissionais qualificados em diversas áreas da medicina.">
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…
        </div>
      ) : especialidades.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">Nenhuma especialidade disponível no momento.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {especialidades.map((e) => {
            const temMedicos = e.total_medicos > 0;
            return temMedicos ? (
              <Link key={e.id} to={`/agendar?esp=${e.id}`} className="card-elevated p-6 hover:shadow-elegant transition">
                <div className="text-3xl">{e.icone ?? "🩺"}</div>
                <p className="mt-3 font-semibold">{e.nome}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {e.total_medicos} {e.total_medicos === 1 ? "médico" : "médicos"} disponíveis
                </p>
              </Link>
            ) : (
              <button
                key={e.id}
                onClick={() => setEmBreveNome(e.nome)}
                className="card-elevated p-6 text-left opacity-60 hover:opacity-80 transition cursor-pointer"
              >
                <div className="text-3xl grayscale">{e.icone ?? "🩺"}</div>
                <p className="mt-3 font-semibold">{e.nome}</p>
                <Badge className="mt-1.5 bg-muted text-muted-foreground text-[10px]">
                  <Clock className="mr-1 h-3 w-3" /> Em breve
                </Badge>
              </button>
            );
          })}
        </div>
      )}

      <EmBreveDialog
        open={!!emBreveNome}
        onOpenChange={(v) => { if (!v) setEmBreveNome(null); }}
        especialidade={emBreveNome ?? ""}
      />
    </PageShell>
  );
};

/* ── Médicos ── */

type SortOption = "ranking" | "avaliacao" | "nome";

export const Medicos = () => {
  const { medicos, loading } = useMedicosDestaque(100);
  const { especialidades } = useEspecialidadesPublicas();
  const [busca, setBusca] = useState("");
  const [espFiltro, setEspFiltro] = useState("todas");
  const [sort, setSort] = useState<SortOption>("ranking");

  const [medicoEsps, setMedicoEsps] = useState<Map<string, string[]>>(new Map());
  useEffect(() => {
    if (!medicos.length) return;
    (async () => {
      const { data } = await supabase
        .from("medico_especialidades")
        .select("medico_id, especialidades!inner(id, nome)")
        .eq("ativo", true)
        .in("medico_id", medicos.map(m => m.id));
      const map = new Map<string, string[]>();
      for (const row of (data ?? []) as any[]) {
        const mid = row.medico_id;
        const espId = row.especialidades?.id;
        if (!map.has(mid)) map.set(mid, []);
        if (espId) map.get(mid)!.push(espId);
      }
      setMedicoEsps(map);
    })();
  }, [medicos]);

  const filtrados = useMemo(() => {
    let list = [...medicos];
    if (busca.trim()) {
      const q = busca.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      list = list.filter(m =>
        m.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q) ||
        (m.especialidade ?? "").toLowerCase().includes(q) ||
        m.crm.includes(q)
      );
    }
    if (espFiltro !== "todas") {
      list = list.filter(m => medicoEsps.get(m.id)?.includes(espFiltro));
    }
    list.sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      switch (sort) {
        case "avaliacao":
          return (b.avaliacao_media - a.avaliacao_media) || (b.total_avaliacoes - a.total_avaliacoes);
        case "nome":
          return a.nome.localeCompare(b.nome);
        case "ranking":
        default:
          return (b.ranking_score - a.ranking_score);
      }
    });
    return list;
  }, [medicos, busca, espFiltro, sort, medicoEsps]);

  return (
    <PageShell title="Nossos médicos" subtitle="Todos com CRM ativo e perfil verificado.">
      <div className="flex flex-col gap-3 md:flex-row md:items-center mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, especialidade ou CRM…" value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Select value={espFiltro} onValueChange={setEspFiltro}>
            <SelectTrigger className="w-[180px]">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Especialidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas especialidades</SelectItem>
              {especialidades.map(e => (<SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
            <SelectTrigger className="w-[160px]">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ranking">Mais relevantes</SelectItem>
              <SelectItem value="avaliacao">Mais avaliados</SelectItem>
              <SelectItem value="nome">Nome A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…
        </div>
      ) : filtrados.length === 0 ? (
        <div className="card-elevated p-10 text-center">
          <Stethoscope className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-semibold">Nenhum médico encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">Tente ajustar os filtros ou a busca.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground mb-3">{filtrados.length} {filtrados.length === 1 ? "médico encontrado" : "médicos encontrados"}</p>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtrados.map((m) => (
              <Link key={m.id} to={`/medicos/${medicoSlug(m.nome)}`} className="card-elevated p-6 transition hover:-translate-y-0.5 hover:shadow-elegant">
                <div className="flex items-start gap-4">
                  {m.foto_url ? (
                    <img src={m.foto_url} alt={m.nome} className="h-14 w-14 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-primary text-primary-foreground font-bold shrink-0">
                      {iniciais(m.nome)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{m.nome}</p>
                    <p className="text-xs text-muted-foreground">{m.especialidade ?? "Clínica"} · {m.crm}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs text-warning">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {m.avaliacao_media > 0 ? m.avaliacao_media.toFixed(1) : "Novo"}
                      </span>
                    </div>
                  </div>
                  {m.online ? (
                    <Badge className="bg-success/10 text-success border-success/20 text-[10px] shrink-0">Disponível</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">Sem horário</Badge>
                  )}
                </div>
                <div className="mt-5 flex items-center justify-end">
                  <Button size="sm" className="bg-gradient-primary hover:opacity-90">Agendar</Button>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
};

/* ── Detalhe do Médico ── */

export const MedicoDetalhe = () => {
  const { slug } = useParams();
  const [medico, setMedico] = useState<any>(null);
  const [espInfo, setEspInfo] = useState<{ nome: string; especialista: boolean; rqe: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Find medico by slug
      const { data } = await (supabase as any)
        .from("medicos_publicos")
        .select("id, nome, especialidade, crm, bio, foto_url, avaliacao_media, total_avaliacoes, online, ranking_score, created_at");

      const found = (data ?? []).find((m: any) => medicoSlug(m.nome) === slug);
      const med = found ?? null;
      setMedico(med);

      if (med) {
        // Load specialization details
        const { data: esps } = await supabase
          .from("medico_especialidades")
          .select("especialidades!inner(nome), especialista, rqe")
          .eq("medico_id", med.id)
          .eq("ativo", true);

        setEspInfo(
          (esps ?? []).map((e: any) => ({
            nome: e.especialidades?.nome ?? "",
            especialista: e.especialista ?? false,
            rqe: e.rqe ?? null,
          }))
        );
      }

      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <PageShell title="Carregando…" subtitle="">
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        </div>
      </PageShell>
    );
  }

  if (!medico) {
    return (
      <PageShell title="Médico não encontrado" subtitle="">
        <p className="text-muted-foreground">O perfil solicitado não foi encontrado.</p>
      </PageShell>
    );
  }

  return (
    <PageShell title={medico.nome} subtitle="">
      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        {/* Main info */}
        <div className="space-y-6">
          {/* Hero card */}
          <div className="card-elevated p-6">
            <div className="flex items-start gap-5">
              {medico.foto_url ? (
                <img src={medico.foto_url} alt={medico.nome} className="h-20 w-20 rounded-2xl object-cover shrink-0" />
              ) : (
                <div className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground text-2xl font-bold shrink-0">
                  {iniciais(medico.nome)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold">{medico.nome}</h2>
                <p className="text-sm text-muted-foreground">{medico.especialidade ?? "Clínica Geral"} · CRM {medico.crm}</p>

                {espInfo.map((e, i) => (
                  <p key={i} className="text-xs text-muted-foreground mt-1">
                    {e.nome}: {e.especialista ? `Especialista (RQE: ${e.rqe ?? "—"})` : "Clínico geral"}
                  </p>
                ))}

                <div className="mt-2 flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-sm text-warning">
                    <Star className="h-4 w-4 fill-current" />
                    {medico.avaliacao_media > 0 ? medico.avaliacao_media.toFixed(1) : "5.0"}
                  </span>
                  {medico.online && (
                    <Badge className="bg-success/10 text-success border-success/20 text-[10px]">Disponível agora</Badge>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-[10px]"><Video className="mr-1 h-3 w-3" /> Telemedicina</Badge>
                  <Badge variant="outline" className="text-[10px]"><ShieldCheck className="mr-1 h-3 w-3" /> CRM verificado</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Bio */}
          {medico.bio && (
            <div className="card-elevated p-6">
              <h3 className="text-sm font-semibold mb-2">Sobre o profissional</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{medico.bio}</p>
            </div>
          )}

          {/* Info grid */}
          <div className="card-elevated p-6">
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
              <div>
                <p className="text-muted-foreground text-xs">Modalidade</p>
                <p className="font-semibold">Online (Telemedicina)</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">CRM</p>
                <p className="font-semibold">{medico.crm}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Atendimento</p>
                <p className="font-semibold flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Todo Brasil</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar – agenda */}
        <div className="space-y-4">
          <div className="card-elevated p-6 h-fit">
            <p className="text-sm font-semibold mb-4">Agendar consulta</p>
            <MedicoSlotsPanel medicoId={medico.id} medicoNome={medico.nome} />
          </div>
        </div>
      </div>
    </PageShell>
  );
};

/* ── Agendar (novo fluxo: esp → médicos → slots) ── */

type MedicoComSlot = MedicoDestaque & {
  especialista: boolean;
  rqe: string | null;
  preco_centavos: number;
  proximo_slot: string | null;
  esp_nome: string;
};

export const Agendar = () => {
  const [searchParams] = useSearchParams();
  const { especialidades, loading: loadingEspHook } = useEspecialidadesPublicas();
  const [espId, setEspId] = useState<string>("");
  const [medicosEsp, setMedicosEsp] = useState<MedicoComSlot[]>([]);
  const [loadingMedicos, setLoadingMedicos] = useState(false);
  const [emBreveNome, setEmBreveNome] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sheetMedico, setSheetMedico] = useState<MedicoComSlot | null>(null);
  const isMobile = useIsMobile();

  // Set initial esp from URL
  useEffect(() => {
    if (loadingEspHook || !especialidades.length) return;
    const urlEsp = searchParams.get("esp");
    if (urlEsp && especialidades.find((e) => e.id === urlEsp)) {
      setEspId(urlEsp);
    } else {
      const comMedicos = especialidades.find((e) => e.total_medicos > 0);
      setEspId(comMedicos?.id ?? especialidades[0].id);
    }
  }, [loadingEspHook, especialidades, searchParams]);

  // Load doctors for selected specialty
  useEffect(() => {
    if (!espId) return;
    (async () => {
      setLoadingMedicos(true);
      setExpandedId(null);

      // 1. Vinculos médico-especialidade
      const { data: vinculos } = await supabase
        .from("medico_especialidades")
        .select("medico_id, preco_centavos, especialista, rqe, especialidades!inner(nome)")
        .eq("especialidade_id", espId)
        .eq("ativo", true);

      if (!vinculos?.length) { setMedicosEsp([]); setLoadingMedicos(false); return; }

      const medicoIds = [...new Set(vinculos.map((v) => v.medico_id))];

      // 2. Dados públicos dos médicos
      const { data: meds } = await (supabase as any)
        .from("medicos_publicos")
        .select("id, nome, especialidade, crm, bio, foto_url, avaliacao_media, total_avaliacoes, online, ranking_score, taxa_no_show, fator_premium, created_at")
        .in("id", medicoIds);

      // 3. Próximo slot por médico (uma única query)
      const { data: proximosSlots } = await supabase
        .from("agenda_slots")
        .select("medico_id, inicio")
        .in("medico_id", medicoIds)
        .eq("status", "disponivel")
        .gte("inicio", new Date().toISOString())
        .order("inicio", { ascending: true })
        .limit(200);

      // Pegar o primeiro slot de cada médico
      const proxSlotMap = new Map<string, string>();
      for (const s of proximosSlots ?? []) {
        if (!proxSlotMap.has(s.medico_id)) {
          proxSlotMap.set(s.medico_id, s.inicio);
        }
      }

      // Build vinculo map
      const vincMap = new Map<string, any>();
      for (const v of vinculos as any[]) {
        vincMap.set(v.medico_id, v);
      }

      // Merge
      const merged: MedicoComSlot[] = ((meds ?? []) as MedicoDestaque[]).map((m) => {
        const v = vincMap.get(m.id);
        return {
          ...m,
          especialista: v?.especialista ?? false,
          rqe: v?.rqe ?? null,
          preco_centavos: v?.preco_centavos ?? 0,
          proximo_slot: proxSlotMap.get(m.id) ?? null,
          esp_nome: v?.especialidades?.nome ?? "",
        };
      });

      // Sort: avaliação → disponibilidade → taxa_no_show → premium
      merged.sort((a, b) => {
        // Com slot antes de sem slot
        const aHas = a.proximo_slot ? 1 : 0;
        const bHas = b.proximo_slot ? 1 : 0;
        if (aHas !== bHas) return bHas - aHas;
        // Melhor avaliação
        if (a.avaliacao_media !== b.avaliacao_media) return b.avaliacao_media - a.avaliacao_media;
        // Disponibilidade mais próxima
        if (a.proximo_slot && b.proximo_slot) {
          const diff = new Date(a.proximo_slot).getTime() - new Date(b.proximo_slot).getTime();
          if (diff !== 0) return diff;
        }
        // Menor taxa no_show
        if (a.taxa_no_show !== b.taxa_no_show) return a.taxa_no_show - b.taxa_no_show;
        // Premium
        return b.fator_premium - a.fator_premium;
      });

      setMedicosEsp(merged);
      setLoadingMedicos(false);
    })();
  }, [espId]);

  const handleEspChange = (newEspId: string) => {
    const esp = especialidades.find((e) => e.id === newEspId);
    if (esp && esp.total_medicos === 0) {
      setEmBreveNome(esp.nome);
      return;
    }
    setEspId(newEspId);
  };

  const toggleExpand = (m: MedicoComSlot) => {
    if (isMobile) {
      setSheetMedico(m);
    } else {
      setExpandedId(expandedId === m.id ? null : m.id);
    }
  };

  const espAtual = especialidades.find((e) => e.id === espId);

  // Format price
  const fmtPreco = (centavos: number) =>
    (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <PageShell title="Agendar consulta" subtitle="Escolha a especialidade e o profissional.">
      {/* Selector de especialidade */}
      <div className="card-elevated p-6">
        <label className="flex flex-col gap-1.5 max-w-md">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Especialidade</span>
          <select
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            value={espId}
            onChange={(e) => handleEspChange(e.target.value)}
            disabled={loadingEspHook}
          >
            {loadingEspHook && <option>Carregando…</option>}
            {especialidades.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}{e.total_medicos === 0 ? " (Em breve)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Lista de médicos */}
      <div className="mt-6">
        {loadingMedicos ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="card-elevated p-6 space-y-3">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : espAtual && espAtual.total_medicos === 0 ? (
          <div className="card-elevated p-8 text-center">
            <Clock className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-semibold text-lg">Em breve!</p>
            <p className="text-sm text-muted-foreground mt-1">
              A especialidade <strong>{espAtual.nome}</strong> ainda não possui médicos disponíveis.
            </p>
          </div>
        ) : medicosEsp.length === 0 ? (
          <div className="card-elevated p-8 text-center text-sm text-muted-foreground">
            <Stethoscope className="mx-auto h-8 w-8 mb-2 opacity-50" />
            Nenhum médico encontrado para esta especialidade.
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-4">
              {medicosEsp.length} {medicosEsp.length === 1 ? "médico disponível" : "médicos disponíveis"}
            </p>
            <div className="space-y-4">
              {medicosEsp.map((m) => (
                <div key={m.id} className="space-y-0">
                  {/* Card do médico */}
                  <div className={`card-elevated p-5 transition ${expandedId === m.id ? "rounded-b-none border-b-0" : ""}`}>
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Avatar */}
                      {m.foto_url ? (
                        <img src={m.foto_url} alt={m.nome} className="h-16 w-16 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-primary text-primary-foreground text-lg font-bold shrink-0">
                          {iniciais(m.nome)}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-base">{m.nome}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Especialidade: {m.especialista ? `RQE ${m.rqe ?? "—"}` : "Não especialista"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              CRM: {m.crm}
                            </p>
                          </div>
                          {m.proximo_slot ? (
                            <Badge className="bg-success/10 text-success border-success/20 text-[10px] shrink-0 whitespace-nowrap">
                              Disponível
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">
                              Sem horário
                            </Badge>
                          )}
                        </div>

                        {/* Rating */}
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs text-warning">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            {m.avaliacao_media > 0 ? m.avaliacao_media.toFixed(1) : "5.0"}
                          </span>
                        </div>

                        {/* Tags */}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="text-[10px]">
                            <Video className="mr-1 h-3 w-3" /> Telemedicina
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            <ShieldCheck className="mr-1 h-3 w-3" /> CRM verificado
                          </Badge>
                        </div>

                        {/* Bio */}
                        {m.bio && (
                          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                            {truncateBio(m.bio)}
                          </p>
                        )}

                        {/* Próx. horário + preço */}
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {proxHorarioLabel(m.proximo_slot)}
                          </span>
                          {m.preco_centavos > 0 && (
                            <span className="text-lg font-bold text-primary">
                              {fmtPreco(m.preco_centavos)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="mt-4 flex items-center gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <Link to={`/medicos/${medicoSlug(m.nome)}`}>
                          <User className="mr-1.5 h-3.5 w-3.5" /> Ver perfil
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                        onClick={() => toggleExpand(m)}
                      >
                        <Calendar className="mr-1.5 h-3.5 w-3.5" />
                        Agendar
                        {!isMobile && (
                          expandedId === m.id
                            ? <ChevronUp className="ml-1 h-3 w-3" />
                            : <ChevronDown className="ml-1 h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Accordion – slots (desktop) */}
                  {!isMobile && expandedId === m.id && (
                    <div className="card-elevated rounded-t-none border-t border-dashed border-border p-5 bg-muted/20 animate-accordion-down">
                      <MedicoSlotsPanel medicoId={m.id} medicoNome={m.nome} especialidadeId={espId || undefined} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Sheet (mobile) */}
      <Sheet open={!!sheetMedico} onOpenChange={(o) => { if (!o) setSheetMedico(null); }}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{sheetMedico?.nome ?? "Horários"}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {sheetMedico && (
              <MedicoSlotsPanel medicoId={sheetMedico.id} medicoNome={sheetMedico.nome} especialidadeId={espId || undefined} />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <EmBreveDialog
        open={!!emBreveNome}
        onOpenChange={(v) => { if (!v) setEmBreveNome(null); }}
        especialidade={emBreveNome ?? ""}
      />
    </PageShell>
  );
};

/* ── Planos ── */

export const Planos = () => {
  const planos = [
    { nome: "Essencial", preco: "R$ 49", desc: "Ideal para uso pontual", feats: ["Telemedicina sob demanda", "Receita digital", "Suporte em horário comercial"], featured: false },
    { nome: "Saúde+", preco: "R$ 119", desc: "O mais escolhido", feats: ["Consultas ilimitadas", "Pronto atendimento 24h", "Histórico digital", "Suporte prioritário"], featured: true },
    { nome: "Família", preco: "R$ 219", desc: "Até 4 pessoas", feats: ["Tudo do Saúde+", "Multi-usuário", "Pediatria incluída", "Relatórios mensais"], featured: false },
  ];
  return (
    <PageShell title="Planos" subtitle="Escolha o plano que melhor se encaixa na sua rotina.">
      <div className="grid gap-5 md:grid-cols-3">
        {planos.map(p => (
          <div key={p.nome} className={`card-elevated p-7 ${p.featured ? "ring-2 ring-primary shadow-elegant" : ""}`}>
            {p.featured && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground">Popular</span>}
            <p className="mt-3 font-display text-xl font-bold">{p.nome}</p>
            <p className="text-sm text-muted-foreground">{p.desc}</p>
            <p className="mt-4 font-display text-4xl font-extrabold">{p.preco}<span className="text-base font-medium text-muted-foreground">/mês</span></p>
            <ul className="mt-5 space-y-2 text-sm">
              {p.feats.map(f => <li key={f} className="flex gap-2"><span className="text-success">✓</span>{f}</li>)}
            </ul>
            <Button className={`mt-6 w-full ${p.featured ? "bg-gradient-primary hover:opacity-90" : ""}`} variant={p.featured ? "default" : "outline"}>
              Assinar {p.nome}
            </Button>
          </div>
        ))}
      </div>
    </PageShell>
  );
};

/* ── Empresas ── */

export const Empresas = () => (
  <PageShell title="Lasmar para empresas" subtitle="Saúde corporativa para sua equipe, com relatórios e gestão de uso.">
    <div className="grid gap-5 md:grid-cols-3">
      {[
        { t: "Funcionários ilimitados", d: "Adicione e remova pela área RH." },
        { t: "Relatórios liberados", d: "A empresa só vê o que foi autorizado." },
        { t: "Atendimento no trabalho", d: "Pronto atendimento online em obras e escritórios." },
      ].map(b => (
        <div key={b.t} className="card-elevated p-6"><p className="font-semibold">{b.t}</p><p className="mt-1 text-sm text-muted-foreground">{b.d}</p></div>
      ))}
    </div>
    <div className="mt-8"><Button className="bg-gradient-primary hover:opacity-90">Falar com especialista</Button></div>
  </PageShell>
);

/* ── Para Médicos ── */

export const ParaMedicos = () => (
  <PageShell title="Lasmar para médicos" subtitle="Atenda online com agenda integrada, prontuário e pagamentos.">
    <div className="grid gap-5 md:grid-cols-3">
      {[
        { t: "Agenda inteligente", d: "Sincronize Google Agenda e Meet." },
        { t: "Prontuário integrado", d: "Conexão futura com Feegow." },
        { t: "Pagamento automático", d: "Receba por consulta ou recorrência." },
      ].map(b => (
        <div key={b.t} className="card-elevated p-6"><p className="font-semibold">{b.t}</p><p className="mt-1 text-sm text-muted-foreground">{b.d}</p></div>
      ))}
    </div>
    <div className="mt-8 flex flex-wrap gap-3">
      <Button asChild className="bg-gradient-primary hover:opacity-90">
        <Link to="/cadastro/medico">Quero me cadastrar</Link>
      </Button>
      <Button asChild variant="outline">
        <Link to="/login">Já tenho conta</Link>
      </Button>
    </div>
  </PageShell>
);

/* ── FAQ ── */

export const Faq = () => {
  const [itens, setItens] = React.useState<{ q: string; a: string }[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    supabase
      .from("faqs")
      .select("pergunta, resposta")
      .eq("ativo", true)
      .order("ordem", { ascending: true })
      .then(({ data }) => {
        setItens((data ?? []).map((d: any) => ({ q: d.pergunta, a: d.resposta })));
        setLoading(false);
      });
  }, []);

  return (
    <PageShell title="Perguntas frequentes">
      <div className="space-y-3 max-w-3xl">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : itens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma pergunta frequente cadastrada ainda.</p>
        ) : (
          itens.map(i => (
            <details key={i.q} className="card-elevated p-5">
              <summary className="cursor-pointer font-semibold">{i.q}</summary>
              <p className="mt-2 text-sm text-muted-foreground">{i.a}</p>
            </details>
          ))
        )}
      </div>
    </PageShell>
  );
};

/* ── Login (dev only) ── */

export const Login = () => {
  const { setProfileKey } = useAuth();
  const navigate = useNavigate();
  const isDev = import.meta.env.DEV;

  React.useEffect(() => {
    if (!isDev) navigate("/auth", { replace: true });
  }, [isDev, navigate]);

  if (!isDev) return null;

  const enter = (k: Parameters<typeof setProfileKey>[0], to: string) => {
    setProfileKey(k);
    navigate(to);
  };
  const demos: { k: Parameters<typeof setProfileKey>[0]; label: string; to: string }[] = [
    { k: "paciente", label: "Paciente", to: "/app/paciente/dashboard" },
    { k: "medico", label: "Médico", to: "/app/medico/dashboard" },
    { k: "colaborador", label: "Colaborador", to: "/app/colaborador/dashboard" },
    { k: "admin", label: "Admin", to: "/app/admin/dashboard" },
    { k: "empresa", label: "Empresa", to: "/app/empresa/dashboard" },
  ];
  return (
    <section className="container grid min-h-[80vh] place-items-center py-16">
      <div className="card-elevated w-full max-w-md p-8">
        <h1 className="font-display text-2xl font-bold">Acesso de demonstração</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Disponível apenas em desenvolvimento. Para entrar de verdade, use{" "}
          <Link to="/auth" className="text-primary hover:underline">/auth</Link>.
        </p>
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acesso rápido (demo)</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            {demos.map(d => (
              <button key={d.k} onClick={() => enter(d.k, d.to)} className="rounded-lg border border-border px-3 py-2 text-left hover:bg-muted">
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          É médico e ainda não tem cadastro?{" "}
          <Link to="/cadastro/medico" className="font-semibold text-primary hover:underline">Cadastre-se</Link>
        </p>
      </div>
    </section>
  );
};
