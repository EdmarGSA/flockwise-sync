import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { differenceInDays } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calcula a idade do lote em dias, considerando que o dia do alojamento = Dia 1
 * Regra de campo: Do alojamento até 24h depois = Dia 1, e assim por diante
 * 
 * @param dataAlojamento - Data de alojamento do lote (string ou Date)
 * @returns Número de dias desde o alojamento (mínimo 1 no dia do alojamento)
 */
export function calcularIdadeLote(dataAlojamento: string | Date | null | undefined): number {
  if (!dataAlojamento) return 0;
  
  const dataAloj = typeof dataAlojamento === 'string' 
    ? new Date(dataAlojamento) 
    : dataAlojamento;
  
  if (isNaN(dataAloj.getTime())) return 0;
  
  const hoje = new Date();
  const diffDias = differenceInDays(hoje, dataAloj);
  
  // Dia do alojamento = Dia 1 (não Dia 0)
  return diffDias + 1;
}

/**
 * Calcula a idade em dias entre duas datas, considerando +1
 * Útil para calcular idade de um registro específico em relação ao alojamento
 */
export function calcularIdadeNaData(dataAlojamento: string | Date | null | undefined, dataRegistro: string | Date): number {
  if (!dataAlojamento) return 0;
  
  const dataAloj = typeof dataAlojamento === 'string' 
    ? new Date(dataAlojamento) 
    : dataAlojamento;
  
  const dataReg = typeof dataRegistro === 'string'
    ? new Date(dataRegistro)
    : dataRegistro;
  
  if (isNaN(dataAloj.getTime()) || isNaN(dataReg.getTime())) return 0;
  
  const diffDias = differenceInDays(dataReg, dataAloj);
  
  // +1 para que o dia do alojamento seja Dia 1
  return diffDias + 1;
}
