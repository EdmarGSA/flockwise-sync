import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ClimaNucleoData {
  observacao: any | null;
  forecast: any[];
  alertas: any[];
}

export function useClimaNucleo(nucleoId: string | null | undefined) {
  const [data, setData] = useState<ClimaNucleoData>({ observacao: null, forecast: [], alertas: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!nucleoId) { setLoading(false); return; }
    let cancel = false;
    (async () => {
      setLoading(true);
      const [obs, fc, al] = await Promise.all([
        supabase.from("weather_observacoes").select("*").eq("nucleo_id", nucleoId).maybeSingle(),
        supabase.from("weather_forecast_horario").select("*").eq("nucleo_id", nucleoId)
          .gte("hora_prevista", new Date().toISOString()).order("hora_prevista").limit(24),
        supabase.from("alertas_climaticos").select("*").eq("nucleo_id", nucleoId)
          .is("reconhecido_em", null).order("horario_evento").limit(5),
      ]);
      if (cancel) return;
      setData({ observacao: obs.data, forecast: fc.data ?? [], alertas: al.data ?? [] });
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [nucleoId]);

  return { ...data, loading };
}
