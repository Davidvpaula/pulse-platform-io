import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PublicHomeStats {
  medicos: number;
  pacientes: number;
  consultas: number;
  loading: boolean;
}

const FALLBACK = { medicos: 0, pacientes: 3000, consultas: 5000 };

export function usePublicHomeStats(): PublicHomeStats {
  const [data, setData] = useState({ ...FALLBACK, loading: true });

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      const { data: result, error } = await supabase.rpc("public_home_stats");
      if (cancelled || error || !result) return;
      const r = result as { medicos?: number; pacientes?: number; consultas?: number };
      setData({
        medicos: r.medicos ?? FALLBACK.medicos,
        pacientes: r.pacientes ?? FALLBACK.pacientes,
        consultas: r.consultas ?? FALLBACK.consultas,
        loading: false,
      });
    };

    fetchStats();
    const id = setInterval(fetchStats, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return data;
}
