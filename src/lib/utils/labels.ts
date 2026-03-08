import { Badge } from '@/components/ui/badge';
import React from 'react';

/**
 * Unified label mapping for bird lineages (corte)
 */
export const getLinhagemLabel = (linhagem: string): string => {
  const labels: Record<string, string> = {
    cobb_500: 'Cobb 500',
    ross_308: 'Ross 308',
    hubbard: 'Hubbard',
  };
  return labels[linhagem] || linhagem;
};

/**
 * Unified label mapping for bird lineages (postura)
 */
export const getLinhagemPosturaLabel = (linhagem: string | null): string => {
  if (!linhagem) return '-';
  const labels: Record<string, string> = {
    lohmann_brown_lite: 'Lohmann Brown-Lite',
    lohmann_lsl_lite: 'Lohmann LSL Lite',
    hy_line_brown: 'Hy-Line Brown',
    isa_brown: 'ISA Brown',
    lohmann_lsl: 'Lohmann LSL',
    dekalb_white: 'Dekalb White',
  };
  return labels[linhagem] || linhagem;
};

/**
 * Unified label mapping for sexo
 */
export const getSexoLabel = (sexo: string): string => {
  const labels: Record<string, string> = {
    macho: 'Macho',
    femea: 'Fêmea',
    misto: 'Misto',
  };
  return labels[sexo] || sexo;
};

/**
 * Unified short label mapping for sexo
 */
export const getSexoLabelShort = (sexo: string): string => {
  const labels: Record<string, string> = {
    macho: 'M',
    femea: 'F',
    misto: 'Mix',
  };
  return labels[sexo] || sexo;
};

/**
 * Complete status configuration for lote badges.
 * All possible lote statuses are mapped here.
 */
export interface StatusBadgeConfig {
  label: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
}

export const LOTE_STATUS_CONFIG: Record<string, StatusBadgeConfig> = {
  previsao: { label: 'Previsão', variant: 'outline' },
  agendado: { label: 'Agendado', variant: 'outline' },
  alojado: { label: 'Alojado', variant: 'default' },
  em_producao: { label: 'Em Produção', variant: 'default' },
  jejum: { label: 'Jejum', variant: 'destructive' },
  saiu_para_entrega: { label: 'Saiu p/ Entrega', variant: 'secondary' },
  abatido: { label: 'Abatido', variant: 'secondary' },
  fechado: { label: 'Fechado', variant: 'secondary' },
};

/**
 * Get the badge config for a given lote status.
 * Returns a fallback config for unknown statuses.
 */
export const getStatusBadgeConfig = (status: string): StatusBadgeConfig => {
  return LOTE_STATUS_CONFIG[status] || { label: status, variant: 'outline' as const };
};
