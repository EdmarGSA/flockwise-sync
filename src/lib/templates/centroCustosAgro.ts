// Template de Centros de Custos para Agropecuária (Aves/Suínos)
// Estrutura analítica para identificar rentabilidade por unidade de negócio

export interface CentroCustosTemplate {
  codigo: string;
  nome: string;
  tipo: 'lote' | 'nucleo' | 'geral' | 'projeto';
  descricao?: string;
}

export const centroCustosAgroTemplate: CentroCustosTemplate[] = [
  { 
    codigo: '1000', 
    nome: 'Administração Central', 
    tipo: 'geral',
    descricao: 'Custos administrativos gerais da empresa'
  },
  { 
    codigo: '2000', 
    nome: 'Fábrica de Ração', 
    tipo: 'geral',
    descricao: 'Custos de produção de ração'
  },
  { 
    codigo: '3100', 
    nome: 'Produção Própria - Aves', 
    tipo: 'geral',
    descricao: 'Custos de produção de aves próprias'
  },
  { 
    codigo: '3200', 
    nome: 'Produção Própria - Suínos', 
    tipo: 'geral',
    descricao: 'Custos de produção de suínos próprios'
  },
  { 
    codigo: '4100', 
    nome: 'Sistema Integração - Aves', 
    tipo: 'geral',
    descricao: 'Custos do sistema de integração avícola'
  },
  { 
    codigo: '4200', 
    nome: 'Sistema Integração - Suínos', 
    tipo: 'geral',
    descricao: 'Custos do sistema de integração suinícola'
  },
  { 
    codigo: '5000', 
    nome: 'Logística e Transporte', 
    tipo: 'geral',
    descricao: 'Custos de transporte e logística'
  },
];
