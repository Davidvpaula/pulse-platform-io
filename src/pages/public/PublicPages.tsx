import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Star, Video, Calendar, MapPin, GraduationCap, Loader2, Stethoscope, Clock, Search, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import {
  listSlotsDisponiveisPorEspecialidade,
  formatDataBR,
  formatHora,
  type SlotDisponivel,
  type Especialidade,
} from "@/lib/clinico";
import { useEspecialidadesPublicas } from "@/hooks/useEspecialidadesPublicas";
import { useMedicosDestaque } from "@/hooks/useMedicosDestaque";
import EmBreveDialog from "@/components/EmBreveDialog";

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

  // Buscar especialidades dos médicos via medico_especialidades
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
        const espNome = row.especialidades?.nome;
        const espId = row.especialidades?.id;
        if (!map.has(mid)) map.set(mid, []);
        if (espNome) map.get(mid)!.push(espId);
      }
      setMedicoEsps(map);
    })();
  }, [medicos]);

  const filtrados = useMemo(() => {
    let list = [...medicos];

    // Filtro busca
    if (busca.trim()) {
      const q = busca.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      list = list.filter(m =>
        m.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q) ||
        (m.especialidade ?? "").toLowerCase().includes(q) ||
        m.crm.includes(q)
      );
    }

    // Filtro especialidade
    if (espFiltro !== "todas") {
      list = list.filter(m => medicoEsps.get(m.id)?.includes(espFiltro));
    }

    // Ordenação
    list.sort((a, b) => {
      // Online sempre primeiro
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
      {/* Barra de busca e filtros */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, especialidade ou CRM…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={espFiltro} onValueChange={setEspFiltro}>
            <SelectTrigger className="w-[180px]">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Especialidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas especialidades</SelectItem>
              {especialidades.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
              ))}
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

      {/* Resultado */}
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
              <div key={m.id} className="card-elevated p-6 transition hover:-translate-y-0.5 hover:shadow-elegant">
                <div className="flex items-start gap-4">
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-primary text-primary-foreground font-bold shrink-0">
                    {m.nome.split(" ").filter(s => s.length > 1).map(s => s[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{m.nome}</p>
                    <p className="text-xs text-muted-foreground">{m.especialidade ?? "Clínica"} · {m.crm}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs text-warning">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {m.avaliacao_media > 0 ? m.avaliacao_media.toFixed(1) : "Novo"}
                      </span>
                      {m.total_avaliacoes > 0 && (
                        <span className="text-[10px] text-muted-foreground">({m.total_avaliacoes})</span>
                      )}
                    </div>
                  </div>
                  {m.online ? (
                    <Badge className="bg-success/10 text-success border-success/20 text-[10px] shrink-0">Disponível</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">Sem horário</Badge>
                  )}
                </div>
                <div className="mt-5 flex items-center justify-end">
                  <Button asChild size="sm" className="bg-gradient-primary hover:opacity-90">
                    <Link to="/agendar">Agendar</Link>
                  </Button>
                </div>
              </div>
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Try finding by slug-like name match
      const { data } = await supabase
        .from("medicos")
        .select("id, nome, especialidade, crm, link_sala_padrao")
        .eq("status", "aprovado")
        .limit(20);

      const found = (data ?? []).find((m) => {
        const mSlug = m.nome
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        return mSlug === slug;
      });

      setMedico(found ?? (data?.[0] ?? null));
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
    <PageShell title={medico.nome} subtitle={`${medico.especialidade ?? "Clínica"} · ${medico.crm}`}>
      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="card-elevated p-6 space-y-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <GraduationCap className="h-4 w-4 text-primary" /> Médico verificado na plataforma
          </div>
          <p className="text-foreground/90">
            Profissional com CRM ativo, atendendo por telemedicina com consultas integradas à plataforma.
          </p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><p className="text-muted-foreground">Especialidade</p><p className="font-semibold">{medico.especialidade ?? "Clínica"}</p></div>
            <div><p className="text-muted-foreground">Modalidade</p><p className="font-semibold">Online</p></div>
            <div><p className="text-muted-foreground">CRM</p><p className="font-semibold">{medico.crm}</p></div>
          </div>
        </div>
        <div className="card-elevated p-6 h-fit">
          <p className="text-sm text-muted-foreground">Agendar consulta</p>
          <Button asChild className="mt-4 w-full bg-gradient-primary hover:opacity-90">
            <Link to="/agendar"><Video className="mr-2 h-4 w-4" /> Agendar telemedicina</Link>
          </Button>
          <Button asChild variant="outline" className="mt-2 w-full">
            <Link to="/agendar"><Calendar className="mr-2 h-4 w-4" /> Ver horários</Link>
          </Button>
          <p className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> Atende em todo Brasil
          </p>
        </div>
      </div>
    </PageShell>
  );
};

/* ── Agendar ── */

export const Agendar = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useSession();
  const { especialidades, loading: loadingEspHook } = useEspecialidadesPublicas();
  const [espId, setEspId] = useState<string>("");
  const [slots, setSlots] = useState<SlotDisponivel[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [emBreveNome, setEmBreveNome] = useState<string | null>(null);

  // Set initial esp from URL or first available
  useEffect(() => {
    if (loadingEspHook || !especialidades.length) return;
    const urlEsp = searchParams.get("esp");
    if (urlEsp && especialidades.find((e) => e.id === urlEsp)) {
      setEspId(urlEsp);
    } else {
      // Pick first with medicos, or first overall
      const comMedicos = especialidades.find((e) => e.total_medicos > 0);
      setEspId(comMedicos?.id ?? especialidades[0].id);
    }
  }, [loadingEspHook, especialidades, searchParams]);

  // Load slots when espId changes
  useEffect(() => {
    if (!espId) return;
    setLoadingSlots(true);
    listSlotsDisponiveisPorEspecialidade(espId)
      .then(setSlots)
      .finally(() => setLoadingSlots(false));
  }, [espId]);

  const handleEspChange = (newEspId: string) => {
    const esp = especialidades.find((e) => e.id === newEspId);
    if (esp && esp.total_medicos === 0) {
      setEmBreveNome(esp.nome);
      return;
    }
    setEspId(newEspId);
  };

  const escolher = (slotId: string) => {
    if (!session) {
      navigate(`/auth?redirect=/app/paciente/agendar/confirmar/${slotId}`);
      return;
    }
    navigate(`/app/paciente/agendar/confirmar/${slotId}`);
  };

  const espAtual = especialidades.find((e) => e.id === espId);

  return (
    <PageShell title="Agendar consulta" subtitle="Escolha a especialidade e o horário disponível.">
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

      <div className="mt-6">
        {loadingSlots ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Buscando horários…
          </div>
        ) : espAtual && espAtual.total_medicos === 0 ? (
          <div className="card-elevated p-8 text-center">
            <Clock className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-semibold text-lg">Em breve!</p>
            <p className="text-sm text-muted-foreground mt-1">
              A especialidade <strong>{espAtual.nome}</strong> ainda não possui médicos disponíveis.
              Novos profissionais estão sendo cadastrados constantemente.
            </p>
          </div>
        ) : slots.length === 0 ? (
          <div className="card-elevated p-8 text-center text-sm text-muted-foreground">
            Nenhum horário disponível nesta especialidade no momento.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {slots.map((s) => (
              <button
                key={s.id}
                onClick={() => escolher(s.id)}
                className="card-elevated p-4 text-left transition hover:-translate-y-0.5 hover:shadow-elegant"
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Stethoscope className="h-4 w-4 text-primary" /> {s.medico_nome}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> {formatDataBR(s.inicio)}
                  <span className="mx-1 text-muted-foreground">·</span>
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" /> {formatHora(s.inicio)}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                    Telemedicina
                  </span>
                  <span className="text-sm font-bold">
                    {(s.preco_centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

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
  const itens = [
    { q: "Como funciona a telemedicina?", a: "Você agenda, recebe um link de vídeo seguro e atende pelo navegador ou app." },
    { q: "As receitas têm validade legal?", a: "Sim, com assinatura digital ICP-Brasil válida em todo território nacional." },
    { q: "Empresas têm acesso ao prontuário?", a: "Não. Empresas só visualizam relatórios e documentos liberados pelo paciente." },
    { q: "Posso cancelar uma consulta?", a: "Sim, com até 4h de antecedência sem custo." },
  ];
  return (
    <PageShell title="Perguntas frequentes">
      <div className="space-y-3 max-w-3xl">
        {itens.map(i => (
          <details key={i.q} className="card-elevated p-5">
            <summary className="cursor-pointer font-semibold">{i.q}</summary>
            <p className="mt-2 text-sm text-muted-foreground">{i.a}</p>
          </details>
        ))}
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
    { k: "secretaria", label: "Secretaria", to: "/app/secretaria/dashboard" },
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
