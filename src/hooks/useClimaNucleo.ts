import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ClimaNucleoData {
  observacao: any | null;
  forecast: any[];
  alertas: any[];
  solar: any | null;
  ultimoSync: any | null;
}

export function useClimaNucleo(nucleoId: string | null | undefined) {
  const [data, setData] = useState<ClimaNucleoData>({ observacao: null, forecast: [], alertas: [], solar: null, ultimoSync: null });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!nucleoId) { setLoading(false); return; }
    setLoading(true);
    const hoje = new Date().toISOString().slice(0, 10);
    const [obs, fc, al, sol, sync] = await Promise.all([
      supabase.from("weather_observacoes").select("*").eq("nucleo_id", nucleoId).maybeSingle(),
      supabase.from("weather_forecast_horario").select("*").eq("nucleo_id", nucleoId)
        .gte("hora_prevista", new Date().toISOString()).order("hora_prevista").limit(24),
      supabase.from("alertas_climaticos").select("*").eq("nucleo_id", nucleoId)
        .is("reconhecido_em", null).order("horario_evento").limit(5),
      supabase.from("solar_diario").select("*").eq("nucleo_id", nucleoId).eq("data", hoje).maybeSingle(),
      supabase.from("weather_sync_log").select("*").eq("nucleo_id", nucleoId)
        .order("executado_em", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setData({ observacao: obs.data, forecast: fc.data ?? [], alertas: al.data ?? [], solar: sol.data, ultimoSync: sync.data });
    setLoading(false);
  }, [nucleoId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { ...data, loading, refetch: fetchData };
}
