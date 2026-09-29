import { supabase } from '@/integrations/supabase/client';
import { requireSuccess } from './supabase-result';

export async function transicionarConsulta(consultaId: string, status: 'em_andamento' | 'concluida' | 'cancelada') {
  await requireSuccess(supabase.rpc('medico_transicionar_consulta' as never, { _consulta_id: consultaId, _status: status } as never));
}
