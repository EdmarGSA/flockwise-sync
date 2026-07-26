import { describe, it, expect } from 'vitest';
import {
  normalizarNumero,
  normalizarData,
  normalizarHora,
  normalizarExtracao,
  conferirExtracao,
} from './ripiImport';

describe('normalizarNumero', () => {
  it('lê padrão brasileiro com milhar e decimal', () => {
    expect(normalizarNumero('1.234,5678')).toBeCloseTo(1234.5678);
    expect(normalizarNumero('64.130,00')).toBeCloseTo(64130);
  });
  it('lê apenas decimal', () => {
    expect(normalizarNumero('4,7418')).toBeCloseTo(4.7418);
  });
  it('lê milhar sem decimal', () => {
    expect(normalizarNumero('23.100')).toBe(23100);
  });
  it('mantém decimal com ponto quando não é grupo de 3', () => {
    expect(normalizarNumero('3.023')).toBe(3023);
    expect(normalizarNumero('3.02')).toBeCloseTo(3.02);
  });
  it('remove símbolos e trata negativos', () => {
    expect(normalizarNumero('R$ 19.365,99')).toBeCloseTo(19365.99);
    expect(normalizarNumero('-2,839')).toBeCloseTo(-2.839);
    expect(normalizarNumero('(1.200,50)')).toBeCloseTo(-1200.5);
    expect(normalizarNumero('8,4%')).toBeCloseTo(8.4);
  });
  it('devolve null para vazio ou inválido', () => {
    expect(normalizarNumero('')).toBeNull();
    expect(normalizarNumero(null)).toBeNull();
    expect(normalizarNumero('abc')).toBeNull();
  });
});

describe('normalizarData', () => {
  it('converte dd/mm/aaaa', () => {
    expect(normalizarData('05/03/2026')).toBe('2026-03-05');
    expect(normalizarData('5-3-26')).toBe('2026-03-05');
  });
  it('mantém ISO e rejeita inválidos', () => {
    expect(normalizarData('2026-03-05')).toBe('2026-03-05');
    expect(normalizarData('xx')).toBeNull();
    expect(normalizarData('05/13/2026')).toBeNull();
  });
});

describe('normalizarHora', () => {
  it('normaliza formatos comuns', () => {
    expect(normalizarHora('7:05')).toBe('07:05');
    expect(normalizarHora('23h30')).toBe('23:30');
    expect(normalizarHora('25:00')).toBeNull();
  });
});

describe('normalizarExtracao', () => {
  it('converte campos e listas', () => {
    const e = normalizarExtracao({
      aves_abatidas: '21.215',
      peso_total_kg: '64.130,00',
      data_abate: '10/04/2026',
      hora_media_abate: '6h20',
      cargas: [{ quantidade: '4.243', peso_total_kg: '12.826,00', data_abate: '10/04/2026' }],
      condenacoes: [{ tipo: 'FP', codigo: 249, quantidade: '12' }],
      descontos: [{ descricao: 'Funrural', debito: '-120,50' }],
    });
    expect(e.aves_abatidas).toBe(21215);
    expect(e.peso_total_kg).toBeCloseTo(64130);
    expect(e.data_abate).toBe('2026-04-10');
    expect(e.hora_media_abate).toBe('06:20');
    expect(e.cargas?.[0].quantidade).toBe(4243);
    expect(e.condenacoes?.[0].codigo).toBe('249');
    expect(e.descontos?.[0].debito).toBeCloseTo(-120.5);
  });
});

describe('conferirExtracao', () => {
  it('acusa soma de cargas divergente', () => {
    const avisos = conferirExtracao({
      aves_abatidas: 21215,
      peso_total_kg: 64130,
      cargas: [{ quantidade: 20000, peso_total_kg: 60000 }],
    });
    expect(avisos.some((a) => a.bloco === 'Cargas')).toBe(true);
  });
  it('não acusa quando bate', () => {
    const avisos = conferirExtracao({
      aves_abatidas: 100,
      peso_total_kg: 300,
      peso_medio_kg: 3,
      cargas: [{ quantidade: 100, peso_total_kg: 300 }],
      percentual_basico: 8.4,
      aval_conversao: -2.839,
      aval_condenacao: 0.015,
      aval_calo_pata: 0.177,
      aval_checklist: 0.615,
      resultado_bruto_pc: 6.368,
    });
    expect(avisos).toHaveLength(0);
  });
});
