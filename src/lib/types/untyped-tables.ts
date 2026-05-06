/**
 * Tipos auxiliares para tabelas que existem no banco mas ainda não estão
 * no types.ts auto-gerado. Usar estes tipos em vez de `as any`.
 *
 * Quando o types.ts for regenerado e incluir estas tabelas, este arquivo
 * pode ser removido e as referências atualizadas.
 */

/* ── documentos_paciente ─────────────────────────────────────────────── */
export interface DocumentoPacienteRow {
  id: string;
  paciente_id: string;
  user_id: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  storage_path: string;
  mime_type: string | null;
  tamanho_bytes: number | null;
  created_at: string;
  updated_at: string;
}

/* ── cupons ───────────────────────────────────────────────────────────── */
export interface CupomRow {
  id: string;
  codigo: string;
  descricao: string | null;
  tipo_desconto: "percentual" | "fixo";
  valor_desconto: number;
  ativo: boolean;
  uso_maximo: number | null;
  uso_atual: number;
  validade: string | null;
  medico_ids: string[] | null;
  especialidade_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

/* ── medico_notificacao_prefs ────────────────────────────────────────── */
export interface MedicoNotificacaoPrefsRow {
  id: string;
  medico_id: string;
  lembretes_consulta: boolean;
  alertas_operacionais: boolean;
  resumo_diario_email: boolean;
  created_at: string;
  updated_at: string;
}

/* ── inbox_acesso_temporario ─────────────────────────────────────────── */
export interface InboxAcessoTemporarioRow {
  id: string;
  conversa_id: string;
  user_id: string;
  concedido_por: string;
  expira_em: string;
  created_at: string;
}

/* ── comunicacao_auditoria ───────────────────────────────────────────── */
export interface ComunicacaoAuditoriaRow {
  id: string;
  conversa_id: string | null;
  user_id: string;
  acao: string;
  detalhes: Record<string, unknown> | null;
  created_at: string;
}

/* ── Helper: cast seguro para tabelas não tipadas ────────────────────── */
/**
 * Wrapper para `supabase.from()` em tabelas fora do types.ts.
 * Usa `as any` internamente MAS expõe tipo correto ao chamador.
 *
 * Uso:
 *   const { data } = await untypedFrom<DocumentoPacienteRow[]>(
 *     supabase.from("documentos_paciente" as any).select("*")
 *   );
 */
export async function untypedQuery<T>(
  query: PromiseLike<{ data: unknown; error: { message: string } | null }>
): Promise<{ data: T | null; error: { message: string } | null }> {
  const result = await query;
  return result as { data: T | null; error: { message: string } | null };
}
