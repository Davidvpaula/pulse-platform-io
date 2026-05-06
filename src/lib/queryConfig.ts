/**
 * React Query — Configurações padronizadas para o módulo médico.
 * Centraliza staleTime, gcTime, retry e refetch policies.
 */

/** Dados que mudam raramente (especialidades, configurações, termos) */
export const QUERY_STATIC = {
  staleTime: 10 * 60 * 1000,   // 10 min
  gcTime: 30 * 60 * 1000,      // 30 min cache
  retry: 1,
  refetchOnWindowFocus: false,
} as const;

/** Dados semi-estáticos (perfil médico, planos ativos, serviços) */
export const QUERY_PROFILE = {
  staleTime: 5 * 60 * 1000,    // 5 min
  gcTime: 15 * 60 * 1000,
  retry: 2,
  refetchOnWindowFocus: false,
} as const;

/** Dados dinâmicos (agenda, consultas, financeiro) */
export const QUERY_DYNAMIC = {
  staleTime: 60 * 1000,        // 1 min
  gcTime: 5 * 60 * 1000,
  retry: 2,
  refetchOnWindowFocus: true,
} as const;

/** Dados em tempo real (mensagens, notificações) */
export const QUERY_REALTIME = {
  staleTime: 0,
  gcTime: 2 * 60 * 1000,
  retry: 1,
  refetchOnWindowFocus: true,
} as const;

/** Dados de gamificação/ranking */
export const QUERY_GAMIFICATION = {
  staleTime: 3 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
  retry: 1,
  refetchOnWindowFocus: false,
} as const;

/**
 * Padronização de query keys para o módulo médico.
 * Evita colisões e facilita invalidação seletiva.
 */
export const medicoKeys = {
  all: ["medico"] as const,
  perfil: (medicoId: string) => ["medico", "perfil", medicoId] as const,
  agenda: (medicoId: string) => ["medico", "agenda", medicoId] as const,
  slots: (medicoId: string) => ["medico", "slots", medicoId] as const,
  consultas: (medicoId: string) => ["medico", "consultas", medicoId] as const,
  financeiro: (medicoId: string) => ["medico", "financeiro", medicoId] as const,
  gamificacao: (medicoId: string) => ["medico", "gamificacao", medicoId] as const,
  planos: (medicoId: string) => ["medico", "planos", medicoId] as const,
  servicos: (medicoId: string) => ["medico", "servicos", medicoId] as const,
  mensagens: (medicoId: string) => ["medico", "mensagens", medicoId] as const,
  propostas: (medicoId: string) => ["medico", "propostas", medicoId] as const,
  corporativo: (medicoId: string) => ["medico", "corporativo", medicoId] as const,
  campanhas: (medicoId: string) => ["medico", "campanhas", medicoId] as const,
  premium: (medicoId: string) => ["medico", "premium", medicoId] as const,
} as const;
