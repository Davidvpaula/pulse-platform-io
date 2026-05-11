import React, { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { formatNomeMedico } from "@/lib/clinico";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";

import { useSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import { useEspecialidadesPublicas } from "@/hooks/useEspecialidadesPublicas";
import { useMedicosDestaque, type MedicoDestaque } from "@/hooks/useMedicosDestaque";
import { useIsMobile } from "@/hooks/use-mobile";
import EmBreveDialog from "@/components/EmBreveDialog";
import MedicoSlotsPanel from "@/components/public/MedicoSlotsPanel";
import { brl } from "@/lib/format";

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

/* ── Especialidades (legado: redireciona para /medicos) ── */

export const Especialidades = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/medicos", { replace: true });
  }, [navigate]);
  return null;
};

/* ── Médicos (página unificada: especialidades + médicos) ── */

type SortOption = "ranking" | "avaliacao" | "nome";

export const Medicos = () => {
  const { medicos, loading } = useMedicosDestaque(100);
  const { especialidades } = useEspecialidadesPublicas();
  const [searchParams, setSearchParams] = useSearchParams();
  const [busca, setBusca] = useState("");
  const [espFiltro, setEspFiltro] = useState<string>(() => searchParams.get("esp") || "todas");
  const [sort, setSort] = useState<SortOption>("ranking");
  const [emBreveNome, setEmBreveNome] = useState<string | null>(null);

  // Sincroniza ?esp= na URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (espFiltro && espFiltro !== "todas") params.set("esp", espFiltro);
    else params.delete("esp");
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [espFiltro]);

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
              <SelectValue placeholder="Especialidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Especialidades</SelectItem>
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
                    <p className="font-semibold truncate">{formatNomeMedico(m.tratamento, m.nome)}</p>
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
  const [espInfo, setEspInfo] = useState<{ nome: string; especialista: boolean; rqe: string | null; preco_centavos: number }[]>([]);
  const [planosMedico, setPlanosMedico] = useState<any[]>([]);
  const [avaliacoesPublicas, setAvaliacoesPublicas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Find medico by slug
      const { data } = await (supabase as any)
        .from("medicos_publicos")
        .select("id, nome, tratamento, especialidade, crm, bio, foto_url, avaliacao_media, total_avaliacoes, online, ranking_score, created_at");

      const found = (data ?? []).find((m: any) => medicoSlug(m.nome) === slug);
      const med = found ?? null;
      setMedico(med);

      if (med) {
        // Load specialization details
        const { data: esps } = await supabase
          .from("medico_especialidades")
          .select("especialidades!inner(nome), especialista, rqe, preco_centavos")
          .eq("medico_id", med.id)
          .eq("ativo", true);

        setEspInfo(
          (esps ?? []).map((e: any) => ({
            nome: e.especialidades?.nome ?? "",
            especialista: e.especialista ?? false,
            rqe: e.rqe ?? null,
            preco_centavos: e.preco_centavos ?? 0,
          }))
        );

        // Load doctor's published plans (planos.medico_id = medicos.id)
        {
          const { data: planos } = await supabase
            .from("planos")
            .select("id, nome, descricao_comercial, valor_mensal_centavos, plano_beneficios(nome)")
            .eq("medico_id", med.id)
            .eq("nivel", "medico" as any)
            .eq("status", "ativo" as any)
            .eq("aprovado_admin", true)
            .eq("publicado_site", true)
            .order("ordem_exibicao");
          setPlanosMedico(planos ?? []);
        }

        // Load public reviews visible on profile
        const { data: reviews } = await (supabase as any)
          .from("avaliacoes_medicas")
          .select("id, nota, comentario, created_at, paciente_id")
          .eq("medico_id", med.id)
          .eq("avaliacao_publica", true)
          .eq("exibir_no_perfil", true)
          .order("created_at", { ascending: false })
          .limit(10);

        if (reviews && reviews.length > 0) {
          // Fetch patient names
          const pacienteIds = reviews.map((r: any) => r.paciente_id as string).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, nome")
            .in("id", pacienteIds);
          const nameMap: Record<string, string> = {};
          (profiles ?? []).forEach((p: any) => { nameMap[p.id] = p.nome; });
          setAvaliacoesPublicas(reviews.map((r: any) => ({ ...r, paciente_nome: nameMap[r.paciente_id] ?? "Paciente" })));
        }
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

  const principal = (medico.especialidade ?? "Clínica Geral").trim().toLowerCase();
  const principalEsp = espInfo.find((e) => e.nome.trim().toLowerCase() === principal);
  const outras = espInfo.filter((e) => e.nome.trim().toLowerCase() !== principal);
  const precosValidos = espInfo.map((e) => e.preco_centavos).filter((p) => p > 0);
  const precoConsulta = principalEsp?.preco_centavos && principalEsp.preco_centavos > 0
    ? principalEsp.preco_centavos
    : (precosValidos.length ? Math.min(...precosValidos) : 0);

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl space-y-6">
        {/* 1. Hero card */}
        {(() => {
          return (
            <div className="card-elevated overflow-hidden">
              <div className="relative bg-gradient-to-br from-primary/5 via-background to-background p-6 sm:p-8">
                <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
                  {medico.foto_url ? (
                    <img
                      src={medico.foto_url}
                      alt={medico.nome}
                      className="h-32 w-32 sm:h-40 sm:w-40 rounded-full object-cover shrink-0 ring-4 ring-primary/10 shadow-md"
                    />
                  ) : (
                    <div className="grid h-32 w-32 sm:h-40 sm:w-40 place-items-center rounded-full bg-gradient-primary text-primary-foreground text-4xl font-bold shrink-0 ring-4 ring-primary/10 shadow-md">
                      {iniciais(medico.nome)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-xs uppercase tracking-wider text-primary font-semibold">
                      {medico.especialidade ?? "Clínica Geral"}
                    </p>
                    <h1 className="mt-1 font-display text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight">
                      {formatNomeMedico(medico.tratamento, medico.nome)}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">CRM {medico.crm}</p>

                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-warning">
                        <Star className="h-4 w-4 fill-current" />
                        {medico.avaliacao_media > 0 ? medico.avaliacao_media.toFixed(1) : "5.0"}
                        {medico.total_avaliacoes > 0 && (
                          <span className="text-xs font-normal text-muted-foreground">
                            ({medico.total_avaliacoes})
                          </span>
                        )}
                      </span>
                      {medico.online && (
                        <Badge className="bg-success/10 text-success border-success/20 text-[10px]">
                          Disponível agora
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        <Video className="mr-1 h-3 w-3" /> Telemedicina
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        <ShieldCheck className="mr-1 h-3 w-3" /> CRM verificado
                      </Badge>
                    </div>

                    {precoConsulta > 0 && (
                      <div className="mt-4 inline-flex items-baseline gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2">
                        <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Consulta a partir de</span>
                        <span className="text-2xl font-extrabold text-primary">{brl(precoConsulta)}</span>
                      </div>
                    )}

                    {medico.bio && (
                      <p className="mt-4 text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                        {medico.bio}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {outras.length > 0 && (
                <div className="border-t border-border bg-muted/20 px-6 sm:px-8 py-5">
                  <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
                    Atendimentos que também realiza
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {outras.map((e, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="rounded-full px-3 py-1 text-xs font-medium"
                      >
                        <Stethoscope className="mr-1.5 h-3 w-3 text-primary" />
                        {e.nome}
                        {e.especialista && e.rqe && (
                          <span className="ml-1.5 text-[10px] text-muted-foreground">
                            · RQE {e.rqe}
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* 2. Agenda */}
        <div className="card-elevated p-6">
          <p className="text-sm font-semibold mb-4">Agendar consulta</p>
          <MedicoSlotsPanel
            medicoId={medico.id}
            medicoNome={formatNomeMedico(medico.tratamento, medico.nome)}
            precoCentavos={precoConsulta}
            especialidadeNome={medico.especialidade ?? undefined}
          />
        </div>

        {/* 3. Planos do médico */}
        {planosMedico.length > 0 && (
          <div className="card-elevated p-6">
            <h3 className="text-sm font-semibold mb-4">Planos deste profissional</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {planosMedico.map((p: any) => (
                <div key={p.id} className="rounded-xl border border-border bg-background/50 p-5 hover:border-primary/30 transition">
                  <p className="font-medium">{p.nome}</p>
                  {p.descricao_comercial && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.descricao_comercial}</p>
                  )}
                  <p className="mt-2 text-xl font-semibold">
                    {brl(p.valor_mensal_centavos)}
                    <span className="text-xs font-normal text-muted-foreground">/mês</span>
                  </p>
                  {p.plano_beneficios && p.plano_beneficios.length > 0 && (
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {p.plano_beneficios.slice(0, 4).map((b: any, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                          <span>{b.nome}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button className="mt-4 w-full" size="sm" asChild>
                    <Link to="/app/paciente/plano">
                      Assinar <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Avaliações públicas */}
        {avaliacoesPublicas.length > 0 && (
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Avaliações de pacientes</h3>
              <Badge variant="secondary" className="text-[10px]">{avaliacoesPublicas.length} {avaliacoesPublicas.length === 1 ? "avaliação" : "avaliações"}</Badge>
            </div>

            {medico.avaliacao_media > 0 && (
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={cn("h-5 w-5", s <= Math.round(medico.avaliacao_media) ? "fill-warning text-warning" : "text-muted-foreground/30")} />
                  ))}
                </div>
                <span className="text-lg font-bold">{medico.avaliacao_media.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({medico.total_avaliacoes} {medico.total_avaliacoes === 1 ? "avaliação" : "avaliações"})</span>
              </div>
            )}

            <div className="space-y-4">
              {avaliacoesPublicas.map((av: any) => (
                <div key={av.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={cn("h-3.5 w-3.5", s <= av.nota ? "fill-warning text-warning" : "text-muted-foreground/30")} />
                        ))}
                      </div>
                      <span className="text-xs font-medium">{(av.paciente_nome ?? "Paciente").split(" ")[0]}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(av.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  {av.comentario && (
                    <p className="text-sm text-muted-foreground">{av.comentario}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
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
        .select("id, nome, tratamento, especialidade, crm, bio, foto_url, avaliacao_media, total_avaliacoes, online, ranking_score, taxa_no_show, fator_premium, created_at")
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


  const espAtual = especialidades.find((e) => e.id === espId);

  // Format price
  const fmtPreco = (centavos: number) =>
    (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <PageShell title="Agendar consulta" subtitle="Escolha a especialidade e o profissional.">
      {/* Selector de especialidade */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Especialidade
          </span>
          <select
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
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
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
                <Skeleton className="mt-4 h-9 w-full" />
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
            <p className="mb-4 text-xs text-muted-foreground">
              <strong className="text-foreground tabular-nums">{medicosEsp.length}</strong>{" "}
              {medicosEsp.length === 1 ? "médico disponível" : "médicos disponíveis"}
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              {medicosEsp.map((m) => (
                <article
                  key={m.id}
                  className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                >
                  {/* Header: avatar + nome + status */}
                  <div className="flex items-start gap-3">
                    {m.foto_url ? (
                      <img
                        src={m.foto_url}
                        alt={m.nome}
                        className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-primary/10"
                      />
                    ) : (
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-primary text-base font-bold text-primary-foreground">
                        {iniciais(m.nome)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate font-semibold leading-tight">
                          {formatNomeMedico(m.tratamento, m.nome)}
                        </p>
                        {m.proximo_slot ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Disponível
                          </span>
                        ) : (
                          <span className="inline-flex shrink-0 items-center rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                            Sem horário
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {m.especialista ? `Especialista · RQE ${m.rqe ?? "—"}` : "Não especialista"}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1 text-warning">
                          <Star className="h-3 w-3 fill-current" />
                          <span className="font-semibold tabular-nums text-foreground">
                            {m.avaliacao_media > 0 ? m.avaliacao_media.toFixed(1) : "5.0"}
                          </span>
                        </span>
                        <span className="text-border">·</span>
                        <span>CRM {m.crm}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tags compactas */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary">
                      <Video className="h-3 w-3" /> Telemedicina
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      <ShieldCheck className="h-3 w-3" /> CRM verificado
                    </span>
                  </div>

                  {/* Próx horário + preço */}
                  <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                    <div className="min-w-0">
                      <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {proxHorarioLabel(m.proximo_slot)}
                      </p>
                      {m.preco_centavos > 0 && (
                        <p className="font-display text-xl font-extrabold leading-none text-primary tabular-nums">
                          {fmtPreco(m.preco_centavos)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
                    <Button size="sm" variant="outline" asChild className="rounded-[10px]">
                      <Link to={`/medicos/${medicoSlug(m.nome)}`}>
                        <User className="mr-1 h-3.5 w-3.5" /> Perfil
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-[10px] bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                      onClick={() => setSheetMedico(m)}
                      disabled={!m.proximo_slot}
                    >
                      <Calendar className="mr-1 h-3.5 w-3.5" />
                      {m.proximo_slot ? "Ver horários" : "Sem horários"}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Painel de horários — Sheet (mobile bottom, desktop right) */}
      <Sheet open={!!sheetMedico} onOpenChange={(o) => { if (!o) setSheetMedico(null); }}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={isMobile ? "max-h-[85vh] overflow-y-auto" : "w-full sm:max-w-lg overflow-y-auto"}
        >
          <SheetHeader>
            <SheetTitle>{sheetMedico ? formatNomeMedico(sheetMedico.tratamento, sheetMedico.nome) : "Horários"}</SheetTitle>
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
  const navigate = useNavigate();
  const [planosPlataforma, setPlanosPlataforma] = useState<any[]>([]);
  const [planosMedico, setPlanosMedico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: planosData } = await supabase
        .from("planos")
        .select("id, nome, descricao, descricao_comercial, valor_mensal_centavos, valor_anual_centavos, destacado, ordem_exibicao, cta_texto, nivel, categoria, medico_id")
        .eq("status", "ativo" as any)
        .eq("publicado_site", true)
        .order("ordem_exibicao");

      if (!planosData?.length) { setPlanosPlataforma([]); setPlanosMedico([]); setLoading(false); return; }

      // Fetch benefits
      const ids = planosData.map(p => p.id);
      const { data: beneficios } = await supabase
        .from("plano_beneficios")
        .select("plano_id, nome")
        .in("plano_id", ids)
        .order("ordem");

      const benefMap: Record<string, string[]> = {};
      (beneficios ?? []).forEach(b => {
        if (!b.nome) return;
        if (!benefMap[b.plano_id]) benefMap[b.plano_id] = [];
        benefMap[b.plano_id].push(b.nome);
      });

      // Fetch medico info for medico-level plans
      const medicoIds = [...new Set(planosData.filter(p => p.medico_id).map(p => p.medico_id))];
      let medicoMap: Record<string, any> = {};
      if (medicoIds.length > 0) {
        const { data: medicos } = await supabase
          .from("medicos")
          .select("user_id, nome, especialidade, foto_url, crm")
          .in("user_id", medicoIds);
        for (const m of (medicos ?? [])) medicoMap[m.user_id] = m;
      }

      const enriched = planosData.map(p => ({
        ...p,
        feats: benefMap[p.id] ?? [],
        medico: p.medico_id ? medicoMap[p.medico_id] ?? null : null,
      }));

      setPlanosPlataforma(enriched.filter(p => p.nivel === "admin"));
      setPlanosMedico(enriched.filter(p => p.nivel === "medico"));
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <PageShell title="Planos" subtitle="Escolha o plano que melhor se encaixa na sua rotina.">
        <div className="grid gap-5 md:grid-cols-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-72 rounded-xl" />)}
        </div>
      </PageShell>
    );
  }

  const nenhum = !planosPlataforma.length && !planosMedico.length;

  if (nenhum) {
    return (
      <PageShell title="Planos" subtitle="Escolha o plano que melhor se encaixa na sua rotina.">
        <p className="text-muted-foreground text-center py-16">Nenhum plano disponível no momento.</p>
      </PageShell>
    );
  }

  return (
    <PageShell title="Planos" subtitle="Escolha o plano que melhor se encaixa na sua rotina.">
      {/* ─── Planos da Plataforma ─── */}
      {planosPlataforma.length > 0 && (
        <section className="mb-16">
          <div className="mb-8 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <ShieldCheck className="h-4 w-4" /> Planos da Plataforma
            </span>
            <h2 className="mt-4 font-display text-2xl font-bold md:text-3xl">Cobertura completa para seu cuidado</h2>
            <p className="mt-2 text-muted-foreground max-w-xl mx-auto text-sm">
              Planos criados pela Lasmar Telemed com benefícios exclusivos, acesso a múltiplos profissionais e descontos progressivos.
            </p>
          </div>
          <div className={`grid gap-6 ${planosPlataforma.length === 1 ? "max-w-md mx-auto" : planosPlataforma.length === 2 ? "md:grid-cols-2 max-w-3xl mx-auto" : "md:grid-cols-3"}`}>
            {planosPlataforma.map(p => {
              const featured = !!p.destacado;
              const preco = p.valor_mensal_centavos != null ? brl(p.valor_mensal_centavos) : "Sob consulta";
              const desc = p.descricao_comercial || p.descricao || "";
              const cta = p.cta_texto || "Quero esse plano";
              return (
                <div key={p.id} className={`relative overflow-hidden rounded-2xl border bg-card p-7 transition-shadow hover:shadow-lg ${featured ? "ring-2 ring-primary shadow-elegant border-primary/30" : "border-border"}`}>
                  {featured && (
                    <div className="absolute top-0 right-0 rounded-bl-xl bg-primary px-3 py-1">
                      <span className="text-[10px] font-bold uppercase text-primary-foreground">Recomendado</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-display text-lg font-bold">{p.nome}</p>
                    </div>
                  </div>
                  {desc && <p className="text-sm text-muted-foreground mb-4">{desc}</p>}
                  <p className="font-display text-4xl font-extrabold text-foreground">
                    {preco}
                    {p.valor_mensal_centavos != null && <span className="text-base font-medium text-muted-foreground">/mês</span>}
                  </p>
                  {p.feats.length > 0 && (
                    <ul className="mt-5 space-y-2.5 text-sm">
                      {p.feats.map((f: string) => (
                        <li key={f} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    className={`mt-6 w-full ${featured ? "bg-gradient-primary hover:opacity-90" : ""}`}
                    variant={featured ? "default" : "outline"}
                    onClick={() => navigate(`/auth?redirect=${encodeURIComponent(`/app/paciente/assinar-plano/${p.id}`)}`)}
                  >
                    {cta}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── Planos Personalizados de Médicos ─── */}
      {planosMedico.length > 0 && (
        <section>
          <div className="mb-8 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent-foreground">
              <Stethoscope className="h-4 w-4" /> Planos de Profissionais
            </span>
            <h2 className="mt-4 font-display text-2xl font-bold md:text-3xl">Escolha seu médico, monte seu plano</h2>
            <p className="mt-2 text-muted-foreground max-w-xl mx-auto text-sm">
              Planos criados diretamente pelos profissionais. Selecione um ou mais e aproveite descontos progressivos.
            </p>
          </div>
          <div className={`grid gap-5 ${planosMedico.length === 1 ? "max-w-md mx-auto" : planosMedico.length === 2 ? "md:grid-cols-2 max-w-3xl mx-auto" : "md:grid-cols-3"}`}>
            {planosMedico.map(p => {
              const preco = p.valor_mensal_centavos != null ? brl(p.valor_mensal_centavos) : "Sob consulta";
              const desc = p.descricao_comercial || p.descricao || "";
              const med = p.medico;
              const initials = med?.nome?.split(" ").map((n: string) => n[0]).slice(0, 2).join("") || "?";
              return (
                <div key={p.id} className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md">
                  {/* Médico header */}
                  {med && (
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                      <Avatar className="h-11 w-11 ring-2 ring-primary/20">
                        <AvatarImage src={med.foto_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{med.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {med.especialidade || "Clínico Geral"}
                          {med.crm ? ` · CRM ${med.crm}` : ""}
                        </p>
                      </div>
                    </div>
                  )}
                  <p className="font-display text-base font-bold">{p.nome}</p>
                  {desc && <p className="text-xs text-muted-foreground mt-1">{desc}</p>}
                  <p className="mt-3 font-display text-3xl font-extrabold text-primary">
                    {preco}
                    {p.valor_mensal_centavos != null && <span className="text-sm font-medium text-muted-foreground">/mês</span>}
                  </p>
                  {p.feats.length > 0 && (
                    <ul className="mt-4 space-y-2 text-sm">
                      {p.feats.map((f: string) => (
                        <li key={f} className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-success" />
                          <span className="text-muted-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    variant="outline"
                    className="mt-5 w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    onClick={() => navigate(`/auth?redirect=${encodeURIComponent(`/app/paciente/assinar-plano/${p.id}`)}`)}
                  >
                    Assinar com este médico
                  </Button>
                </div>
              );
            })}
          </div>
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              💡 Dica: Após o cadastro, você pode combinar vários planos de médicos e ganhar <strong>desconto progressivo</strong>.
            </p>
          </div>
        </section>
      )}
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
        <Link to="/auth">Já tenho conta</Link>
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