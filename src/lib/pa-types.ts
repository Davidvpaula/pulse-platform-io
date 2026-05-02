/** Tipo genérico de slot usado pelo módulo de Atendimento Imediato (PA). */
export type PASlot = {
  key: string;        // ISO do início — chave única
  slot_id: string;    // UUID do agenda_slots
  inicio: Date;
  fim: Date;
  medico_id: string;
  total_vagas: number;
};

export type PAReserva = {
  slot_id: string;
  slot_key: string;
  medico_id: string;
  medico_nome: string;
  inicio: string; // ISO
  fim: string;    // ISO
  expiresAt: number; // epoch ms
};

export function turnoDoSlot(s: { inicio: Date }): "manha" | "tarde" | "noite" {
  const h = s.inicio.getHours();
  if (h < 12) return "manha";
  if (h < 18) return "tarde";
  return "noite";
}
