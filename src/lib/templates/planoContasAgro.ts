// Template do Plano de Contas Agropecuário (Aves/Suínos)
// Estrutura hierárquica seguindo padrões contábeis para agronegócio

export interface PlanoContasTemplate {
  codigo: string;
  nome: string;
  tipo: 'receita' | 'custo' | 'despesa' | 'investimento';
  natureza: 'devedora' | 'credora';
  descricao?: string;
  nivel: number;
  codigoPai?: string; // Referência ao código da conta pai
}

export const planoContasAgroTemplate: PlanoContasTemplate[] = [
  // ================= 1. ATIVO (Balanço Patrimonial) =================
  { codigo: '1', nome: 'ATIVO', tipo: 'investimento', natureza: 'devedora', nivel: 1 },
  
  // 1.1 Ativo Circulante
  { codigo: '1.1', nome: 'Ativo Circulante', tipo: 'investimento', natureza: 'devedora', nivel: 2, codigoPai: '1' },
  { codigo: '1.1.1', nome: 'Caixa e Equivalentes de Caixa', tipo: 'investimento', natureza: 'devedora', nivel: 3, codigoPai: '1.1' },
  { codigo: '1.1.2', nome: 'Estoques de Insumos', tipo: 'investimento', natureza: 'devedora', nivel: 3, codigoPai: '1.1', descricao: 'Fábrica de Ração' },
  { codigo: '1.1.2.1', nome: 'Milho', tipo: 'investimento', natureza: 'devedora', nivel: 4, codigoPai: '1.1.2' },
  { codigo: '1.1.2.2', nome: 'Farelo de Soja', tipo: 'investimento', natureza: 'devedora', nivel: 4, codigoPai: '1.1.2' },
  { codigo: '1.1.2.3', nome: 'Núcleos e Premixes', tipo: 'investimento', natureza: 'devedora', nivel: 4, codigoPai: '1.1.2' },
  { codigo: '1.1.3', nome: 'Ativos Biológicos em Formação', tipo: 'investimento', natureza: 'devedora', nivel: 3, codigoPai: '1.1', descricao: 'Animais em crescimento' },
  { codigo: '1.1.3.1', nome: 'Aves em Engorda (Próprias)', tipo: 'investimento', natureza: 'devedora', nivel: 4, codigoPai: '1.1.3' },
  { codigo: '1.1.3.2', nome: 'Suínos em Engorda (Próprios)', tipo: 'investimento', natureza: 'devedora', nivel: 4, codigoPai: '1.1.3' },
  { codigo: '1.1.3.3', nome: 'Aves/Suínos em Integrados', tipo: 'investimento', natureza: 'devedora', nivel: 4, codigoPai: '1.1.3', descricao: 'Custo de insumos enviados aos parceiros' },
  { codigo: '1.1.4', nome: 'Estoque de Produtos Acabados', tipo: 'investimento', natureza: 'devedora', nivel: 3, codigoPai: '1.1' },
  { codigo: '1.1.4.1', nome: 'Ração Produzida', tipo: 'investimento', natureza: 'devedora', nivel: 4, codigoPai: '1.1.4', descricao: 'Para venda ou uso interno' },
  { codigo: '1.1.4.2', nome: 'Animais Prontos para Abate', tipo: 'investimento', natureza: 'devedora', nivel: 4, codigoPai: '1.1.4', descricao: 'Estoque de passagem' },
  
  // 1.2 Ativo Não Circulante
  { codigo: '1.2', nome: 'Ativo Não Circulante', tipo: 'investimento', natureza: 'devedora', nivel: 2, codigoPai: '1' },
  { codigo: '1.2.1', nome: 'Ativos Biológicos - Matrizes', tipo: 'investimento', natureza: 'devedora', nivel: 3, codigoPai: '1.2' },
  { codigo: '1.2.1.1', nome: 'Matrizes de Aves (Reprodutoras)', tipo: 'investimento', natureza: 'devedora', nivel: 4, codigoPai: '1.2.1' },
  { codigo: '1.2.1.2', nome: 'Matrizes de Suínos', tipo: 'investimento', natureza: 'devedora', nivel: 4, codigoPai: '1.2.1', descricao: 'Matrizes e Cachaços' },
  { codigo: '1.2.1.3', nome: '(-) Depreciação/Exaustão Acumulada', tipo: 'investimento', natureza: 'credora', nivel: 4, codigoPai: '1.2.1' },
  { codigo: '1.2.2', nome: 'Imobilizado', tipo: 'investimento', natureza: 'devedora', nivel: 3, codigoPai: '1.2' },
  { codigo: '1.2.2.1', nome: 'Silos e Equipamentos Fábrica', tipo: 'investimento', natureza: 'devedora', nivel: 4, codigoPai: '1.2.2' },
  { codigo: '1.2.2.2', nome: 'Galpões e Granjas', tipo: 'investimento', natureza: 'devedora', nivel: 4, codigoPai: '1.2.2' },
  { codigo: '1.2.2.3', nome: 'Máquinas e Implementos Agrícolas', tipo: 'investimento', natureza: 'devedora', nivel: 4, codigoPai: '1.2.2' },
  { codigo: '1.2.2.4', nome: 'Veículos', tipo: 'investimento', natureza: 'devedora', nivel: 4, codigoPai: '1.2.2', descricao: 'Caminhões de transporte carga viva/ração' },
  
  // ================= 2. PASSIVO (Obrigações) =================
  { codigo: '2', nome: 'PASSIVO', tipo: 'despesa', natureza: 'credora', nivel: 1 },
  { codigo: '2.1', nome: 'Fornecedores de Insumos', tipo: 'despesa', natureza: 'credora', nivel: 2, codigoPai: '2', descricao: 'Grãos e Medicamentos' },
  { codigo: '2.2', nome: 'Contas a Pagar - Integrados', tipo: 'despesa', natureza: 'credora', nivel: 2, codigoPai: '2', descricao: 'Comissões e valores devidos aos produtores parceiros' },
  { codigo: '2.3', nome: 'Financiamentos Rurais', tipo: 'despesa', natureza: 'credora', nivel: 2, codigoPai: '2', descricao: 'Custeio e Investimento' },
  
  // ================= 3. RECEITAS (DRE) =================
  { codigo: '3', nome: 'RECEITAS', tipo: 'receita', natureza: 'credora', nivel: 1 },
  { codigo: '3.1', nome: 'Venda de Animais Vivos', tipo: 'receita', natureza: 'credora', nivel: 2, codigoPai: '3', descricao: 'Mercado Interno/Externo' },
  { codigo: '3.2', nome: 'Transferências para Frigoríficos', tipo: 'receita', natureza: 'credora', nivel: 2, codigoPai: '3', descricao: 'Faturamento direto ou remessa para industrialização' },
  { codigo: '3.3', nome: 'Venda de Ração e Farelos', tipo: 'receita', natureza: 'credora', nivel: 2, codigoPai: '3', descricao: 'Excedentes da fábrica' },
  { codigo: '3.4', nome: 'Venda de Subprodutos', tipo: 'receita', natureza: 'credora', nivel: 2, codigoPai: '3' },
  { codigo: '3.4.1', nome: 'Cama de Frango', tipo: 'receita', natureza: 'credora', nivel: 3, codigoPai: '3.4' },
  { codigo: '3.4.2', nome: 'Dejeto Suíno/Adubo', tipo: 'receita', natureza: 'credora', nivel: 3, codigoPai: '3.4' },
  
  // ================= 4. CUSTOS E DESPESAS (DRE) =================
  { codigo: '4', nome: 'CUSTOS E DESPESAS', tipo: 'custo', natureza: 'devedora', nivel: 1 },
  
  // 4.1 Custos da Fábrica de Ração
  { codigo: '4.1', nome: 'Custos Fábrica de Ração', tipo: 'custo', natureza: 'devedora', nivel: 2, codigoPai: '4' },
  { codigo: '4.1.1', nome: 'Matéria-prima Consumida', tipo: 'custo', natureza: 'devedora', nivel: 3, codigoPai: '4.1' },
  { codigo: '4.1.2', nome: 'Energia Elétrica e Combustíveis', tipo: 'custo', natureza: 'devedora', nivel: 3, codigoPai: '4.1', descricao: 'Caldeiras' },
  { codigo: '4.1.3', nome: 'Mão de Obra Direta Fábrica', tipo: 'custo', natureza: 'devedora', nivel: 3, codigoPai: '4.1' },
  { codigo: '4.1.4', nome: 'Manutenção Silos e Moinhos', tipo: 'custo', natureza: 'devedora', nivel: 3, codigoPai: '4.1' },
  
  // 4.2 Custos de Produção (Aves e Suínos)
  { codigo: '4.2', nome: 'Custos de Produção', tipo: 'custo', natureza: 'devedora', nivel: 2, codigoPai: '4', descricao: 'Aves e Suínos' },
  { codigo: '4.2.1', nome: 'Consumo de Ração Interna', tipo: 'custo', natureza: 'devedora', nivel: 3, codigoPai: '4.2', descricao: 'Transferência da fábrica para as granjas' },
  { codigo: '4.2.2', nome: 'Medicamentos e Vacinas', tipo: 'custo', natureza: 'devedora', nivel: 3, codigoPai: '4.2' },
  { codigo: '4.2.3', nome: 'Mão de Obra de Manejo', tipo: 'custo', natureza: 'devedora', nivel: 3, codigoPai: '4.2' },
  { codigo: '4.2.4', nome: 'Custos de Integração', tipo: 'custo', natureza: 'devedora', nivel: 3, codigoPai: '4.2' },
  { codigo: '4.2.4.1', nome: 'Remuneração do Integrado', tipo: 'custo', natureza: 'devedora', nivel: 4, codigoPai: '4.2.4', descricao: 'Parceiro' },
  { codigo: '4.2.4.2', nome: 'Assistência Técnica', tipo: 'custo', natureza: 'devedora', nivel: 4, codigoPai: '4.2.4', descricao: 'Veterinários e Agrônomos' },
  { codigo: '4.2.4.3', nome: 'Frete Ração/Coleta Animais', tipo: 'custo', natureza: 'devedora', nivel: 4, codigoPai: '4.2.4', descricao: 'Entrega de ração e coleta de animais' },
  
  // 4.3 Despesas Logísticas
  { codigo: '4.3', nome: 'Despesas Logísticas', tipo: 'despesa', natureza: 'devedora', nivel: 2, codigoPai: '4' },
  { codigo: '4.3.1', nome: 'Transporte para Frigoríficos', tipo: 'despesa', natureza: 'devedora', nivel: 3, codigoPai: '4.3' },
  { codigo: '4.3.2', nome: 'GTA e Taxas Sanitárias', tipo: 'despesa', natureza: 'devedora', nivel: 3, codigoPai: '4.3', descricao: 'Guia de Trânsito Animal' },
];
