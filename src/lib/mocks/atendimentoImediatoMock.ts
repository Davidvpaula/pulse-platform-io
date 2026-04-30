// Mock determinístico do calendário compartilhado de atendimento imediato.
// Sem persistência em banco — só estado em memória + sessionStorage.

export type MockMedico = {
  id: string;
  nome: string;
  especialidade: string;
  aprovado_em: string; // ISO — define tempo de casa (mais antigo = melhor rank)
  consultas_no_dia: number; // carga inicial (ranking de desempate)
};

export type MockSlot = {
  key: string; // ISO do início
  inicio: Date;
  fim: Date;
  /** ids dos médicos que oficialmente estão disponíveis nesse horário (cap. máxima do slot) */
  medicosDisponiveis: string[];
};

export type Reserva = {
  pacienteId: string;
  medicoId: string;
  slotKey: string;
  expiresAt: number; // epoch ms
};

export const MOCK_DURACAO_MIN = 30;
export const MOCK_TTL_RESERVA_MS = 90_000;

export const mockMedicos: MockMedico[] = [
  {
    id: "med-ana",
    nome: "Ana Lima",
    especialidade: "Clínica Geral",
    aprovado_em: "2021-03-14T00:00:00Z", // mais antiga = topo do ranking
    consultas_no_dia: 2,
  },
  {
    id: "med-bruno",
    nome: "Bruno Carvalho",
    especialidade: "Clínica Geral",
    aprovado_em: "2022-07-02T00:00:00Z",
    consultas_no_dia: 1,
  },
  {
    id: "med-carla",
    nome: "Carla Souza",
    especialidade: "Pediatria",
    aprovado_em: "2023-11-20T00:00:00Z",
    consultas_no_dia: 0,
  },
  {
    id: "med-diego",
    nome: "Diego Martins",
    especialidade: "Clínica Geral",
    aprovado_em: "2024-05-08T00:00:00Z",
    consultas_no_dia: 0,
  },
];

// Pseudo-random determinístico (mulberry32) para que o mock seja estável.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Gera os slots compartilhados do dia (08:00–21:00, passo de 30 min).
 * Para cada horário, sorteia quais médicos estão livres → forma a capacidade.
 */
export function mockSlotsDoDia(date: Date): MockSlot[] {
  const seed =
    date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const rand = rng(seed);

  const slots: MockSlot[] = [];
  for (let h = 8; h < 21; h++) {
    for (const m of [0, 30]) {
      const inicio = new Date(date);
      inicio.setHours(h, m, 0, 0);
      const fim = new Date(inicio.getTime() + MOCK_DURACAO_MIN * 60_000);

      // ~70% de chance de cada médico estar livre nesse horário
      const disponiveis = mockMedicos
        .filter(() => rand() > 0.3)
        .map((md) => md.id);

      // garante que haja ao menos 1 médico em ~85% dos slots
      if (disponiveis.length === 0 && rand() > 0.15) {
        disponiveis.push(mockMedicos[Math.floor(rand() * mockMedicos.length)].id);
      }

      slots.push({
        key: inicio.toISOString(),
        inicio,
        fim,
        medicosDisponiveis: disponiveis,
      });
    }
  }
  return slots;
}

/**
 * Regra de ranking: tempo de casa (mais antigo vence) → menor carga no dia → alfabético.
 * Considera reservas ativas no MESMO slot para excluir médicos já pegos.
 */
export function escolherMedico(
  slot: MockSlot,
  reservasAtivas: Reserva[],
  agora: number = Date.now(),
): MockMedico | null {
  const ocupadosNesteSlot = new Set(
    reservasAtivas
      .filter((r) => r.slotKey === slot.key && r.expiresAt > agora)
      .map((r) => r.medicoId),
  );

  // carga acumulada do dia por médico (incluindo reservas ativas)
  const cargaPorMedico = new Map<string, number>();
  for (const md of mockMedicos) cargaPorMedico.set(md.id, md.consultas_no_dia);
  for (const r of reservasAtivas) {
    if (r.expiresAt > agora) {
      cargaPorMedico.set(r.medicoId, (cargaPorMedico.get(r.medicoId) ?? 0) + 1);
    }
  }

  const candidatos = mockMedicos
    .filter((md) => slot.medicosDisponiveis.includes(md.id))
    .filter((md) => !ocupadosNesteSlot.has(md.id));

  if (candidatos.length === 0) return null;

  candidatos.sort((a, b) => {
    const tempoA = new Date(a.aprovado_em).getTime();
    const tempoB = new Date(b.aprovado_em).getTime();
    if (tempoA !== tempoB) return tempoA - tempoB;
    const cargaA = cargaPorMedico.get(a.id) ?? 0;
    const cargaB = cargaPorMedico.get(b.id) ?? 0;
    if (cargaA !== cargaB) return cargaA - cargaB;
    return a.nome.localeCompare(b.nome);
  });

  return candidatos[0];
}

/** Vagas restantes num slot considerando reservas ativas. */
export function vagasRestantes(
  slot: MockSlot,
  reservasAtivas: Reserva[],
  agora: number = Date.now(),
): number {
  const ocupadas = reservasAtivas.filter(
    (r) => r.slotKey === slot.key && r.expiresAt > agora,
  ).length;
  return Math.max(0, slot.medicosDisponiveis.length - ocupadas);
}

/**
 * Procura o slot mais próximo (em tempo) que ainda tenha um médico atribuível.
 * Ignora slots no passado e o próprio slot alvo.
 */
export function slotMaisProximoComVaga(
  slots: MockSlot[],
  alvo: MockSlot,
  reservasAtivas: Reserva[],
  agora: number = Date.now(),
): { slot: MockSlot; medico: MockMedico } | null {
  const candidatos = slots
    .filter((s) => s.key !== alvo.key && s.inicio.getTime() > agora)
    .map((s) => ({
      s,
      delta: Math.abs(s.inicio.getTime() - alvo.inicio.getTime()),
    }))
    .sort((a, b) => a.delta - b.delta);

  for (const { s } of candidatos) {
    const md = escolherMedico(s, reservasAtivas, agora);
    if (md) return { slot: s, medico: md };
  }
  return null;
}

/** Identidade do "paciente" da aba — permite simular conflito entre abas. */
export function obterPacienteId(): string {
  if (typeof window === "undefined") return "ssr";
  const url = new URL(window.location.href);
  const forced = url.searchParams.get("paciente");
  if (forced) return `paciente-${forced}`;
  const KEY = "ai_mock_paciente_id";
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = `paciente-${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(KEY, id);
  }
  return id;
}

/**
 * Canal cross-tab para simular concorrência entre pacientes diferentes.
 * Usa BroadcastChannel quando disponível, senão é no-op.
 */
export function criarCanalReservas(): {
  publish: (reservas: Reserva[]) => void;
  subscribe: (cb: (reservas: Reserva[]) => void) => () => void;
} {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return { publish: () => {}, subscribe: () => () => {} };
  }
  const ch = new BroadcastChannel("ai_mock_reservas_v1");
  return {
    publish: (reservas) => ch.postMessage({ t: "sync", reservas }),
    subscribe: (cb) => {
      const handler = (ev: MessageEvent) => {
        if (ev.data?.t === "sync" && Array.isArray(ev.data.reservas)) {
          cb(ev.data.reservas);
        }
      };
      ch.addEventListener("message", handler);
      return () => ch.removeEventListener("message", handler);
    },
  };
}

export function fmtHora(d: Date): string {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function turnoDoSlot(s: MockSlot): "manha" | "tarde" | "noite" {
  const h = s.inicio.getHours();
  if (h < 12) return "manha";
  if (h < 18) return "tarde";
  return "noite";
}
