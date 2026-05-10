import { useEffect, useRef, useState, useCallback } from 'react';

export interface MortalidadeDraftV1 {
  v: 1;
  savedAt: string;
  items: any[];
  dataRegistroISO: string;
  horaRegistro: string;
  motivo: string;
  submotivos: string[];
  quantidade: string;
  pesoKg: string;
  temperaturaC: string;
  umidadePct: string;
}

const KEY = (loteId: string) => `mortalidade_draft_${loteId}`;
const DEBOUNCE_MS = 400;

export function loadDraft(loteId: string): MortalidadeDraftV1 | null {
  try {
    const raw = localStorage.getItem(KEY(loteId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.v !== 1) return null;
    return parsed as MortalidadeDraftV1;
  } catch {
    return null;
  }
}

export function clearDraft(loteId: string) {
  try {
    localStorage.removeItem(KEY(loteId));
  } catch {
    // ignore
  }
}

export function isDraftMeaningful(d: MortalidadeDraftV1 | null): boolean {
  if (!d) return false;
  return (
    (d.items && d.items.length > 0) ||
    !!d.quantidade ||
    !!d.pesoKg ||
    !!d.temperaturaC ||
    !!d.umidadePct
  );
}

interface UseDraftSaverOpts {
  loteId: string;
  enabled: boolean;
  build: () => Omit<MortalidadeDraftV1, 'v' | 'savedAt'>;
  deps: any[];
}

export function useDraftSaver({ loteId, enabled, build, deps }: UseDraftSaverOpts) {
  const [savingDraft, setSavingDraft] = useState(false);
  const timerRef = useRef<number | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableBuild = useCallback(build, deps);

  useEffect(() => {
    if (!enabled || !loteId) return;
    setSavingDraft(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      try {
        const payload: MortalidadeDraftV1 = {
          v: 1,
          savedAt: new Date().toISOString(),
          ...stableBuild(),
        };
        localStorage.setItem(KEY(loteId), JSON.stringify(payload));
      } catch {
        // quota / disabled — silently ignore
      } finally {
        setSavingDraft(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, loteId, stableBuild]);

  return { savingDraft };
}
