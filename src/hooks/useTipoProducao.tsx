import { useMemo } from 'react';

export type TipoProducao = 'aves_corte' | 'aves_postura' | 'suinos' | 'bovinos' | null;

export function useTipoProducao(tipoProducao: string | null | undefined): {
  isPostura: boolean;
  isCorte: boolean;
  tipo: TipoProducao;
} {
  return useMemo(() => {
    const tipo = tipoProducao?.toLowerCase() || null;
    
    const isPostura = tipo === 'aves postura' || tipo === 'aves_postura';
    const isCorte = tipo === 'aves corte' || tipo === 'aves_corte';
    
    let tipoNormalizado: TipoProducao = null;
    if (isPostura) tipoNormalizado = 'aves_postura';
    else if (isCorte) tipoNormalizado = 'aves_corte';
    else if (tipo?.includes('suino')) tipoNormalizado = 'suinos';
    else if (tipo?.includes('bovino')) tipoNormalizado = 'bovinos';
    
    return {
      isPostura,
      isCorte,
      tipo: tipoNormalizado,
    };
  }, [tipoProducao]);
}
