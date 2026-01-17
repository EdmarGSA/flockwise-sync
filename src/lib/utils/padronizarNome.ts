/**
 * Utilitário para padronizar nomes de produtos vindos de XML de NF-e
 */

// Mapeamento de abreviações comuns do agronegócio
const ABREVIACOES: Record<string, string> = {
  // Unidades
  'SC': 'Saco',
  'CX': 'Caixa',
  'PCT': 'Pacote',
  'UN': 'Unidade',
  'KG': 'Quilograma',
  'L': 'Litro',
  'ML': 'Mililitro',
  'G': 'Grama',
  'MG': 'Miligrama',
  'TON': 'Tonelada',
  'T': 'Tonelada',
  'FD': 'Fardo',
  'GL': 'Galão',
  'BB': 'Bombona',
  'BG': 'Big Bag',
  'RL': 'Rolo',
  'PC': 'Peça',
  'PR': 'Par',
  'DZ': 'Dúzia',
  'CT': 'Cartela',
  'FR': 'Frasco',
  'TB': 'Tubo',
  'LT': 'Lata',
  'BD': 'Balde',
  'BT': 'Botijão',
  'ENV': 'Envelope',
  
  // Produtos agro
  'CONC': 'Concentrado',
  'NUCL': 'Núcleo',
  'PREM': 'Premix',
  'SUPL': 'Suplemento',
  'ADIT': 'Aditivo',
  'VIT': 'Vitamina',
  'MIN': 'Mineral',
  'PROT': 'Proteico',
  'ENERG': 'Energético',
  'FARELO': 'Farelo',
  'FAR': 'Farelo',
  'GRAO': 'Grão',
  'GR': 'Grão',
  'OL': 'Óleo',
  'OLEO': 'Óleo',
  'AC': 'Ácido',
  'SAL': 'Sal',
  'CAL': 'Calcário',
  'CALC': 'Calcário',
  'FOSF': 'Fosfato',
  'URE': 'Ureia',
  'MET': 'Metionina',
  'LIS': 'Lisina',
  'TREO': 'Treonina',
  'TRIP': 'Triptofano',
  
  // Ingredientes comuns
  'MILHO': 'Milho',
  'SOJA': 'Soja',
  'TRIGO': 'Trigo',
  'SORGO': 'Sorgo',
  'ARROZ': 'Arroz',
  'AVEIA': 'Aveia',
  'CEVADA': 'Cevada',
  
  // Medicamentos
  'ANTIBI': 'Antibiótico',
  'VACINA': 'Vacina',
  'VAC': 'Vacina',
  'VERMIF': 'Vermífugo',
  'ANTIP': 'Antiparasitário',
  'DESINF': 'Desinfetante',
  
  // Outros
  'IND': 'Industrial',
  'COM': 'Comercial',
  'ESP': 'Especial',
  'PREM_QUAL': 'Premium',
  'STD': 'Standard',
  'REF': 'Refinado',
  'DEGER': 'Degermado',
  'MOIDO': 'Moído',
  'INTEG': 'Integral',
  'DESC': 'Descascado',
  'PELLET': 'Peletizado',
  'EXTR': 'Extrusado',
  'MICR': 'Micronizado',
  'TOST': 'Tostado',
  'SECO': 'Seco',
  'UMID': 'Úmido',
};

// Palavras que devem permanecer em minúsculas
const PALAVRAS_MINUSCULAS = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'com', 'para', 'por'];

// Palavras que devem permanecer em maiúsculas (siglas)
const SIGLAS = ['DL', 'HCL', 'PH', 'UV', 'IM', 'SC', 'IV', 'BHT', 'BHA', 'EDTA', 'GMO', 'OGM'];

/**
 * Capitaliza uma palavra (primeira letra maiúscula, resto minúscula)
 */
function capitalize(word: string): string {
  if (word.length === 0) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Remove caracteres especiais desnecessários e múltiplos espaços
 */
function limparTexto(texto: string): string {
  return texto
    .replace(/[*#@!]+/g, '') // Remove caracteres especiais
    .replace(/\s+/g, ' ')     // Múltiplos espaços → 1
    .replace(/\s*-\s*/g, ' ') // Hífen com espaços → espaço
    .replace(/\s*\/\s*/g, '/') // Remove espaços ao redor de barras
    .trim();
}

/**
 * Expande números com unidades (30KG → 30 kg)
 */
function expandirUnidades(texto: string): string {
  // Padrões como "30KG", "1000ML", "5L"
  return texto.replace(/(\d+)\s*(KG|G|MG|L|ML|UN|PC|CX|SC|TON)/gi, (_, num, unit) => {
    return `${num} ${unit.toLowerCase()}`;
  });
}

/**
 * Padroniza o nome de um produto vindo do XML da NF-e
 * 
 * @param nomeXml - Nome original do produto no XML
 * @returns Nome padronizado e formatado
 * 
 * @example
 * padronizarNome("MILHO GRAO SC 30KG") // → "Milho Grão Saco 30 kg"
 * padronizarNome("FARELO SOJA 46%") // → "Farelo Soja 46%"
 * padronizarNome("CONC PROT AVES POSTURA") // → "Concentrado Proteico Aves Postura"
 */
export function padronizarNome(nomeXml: string): string {
  if (!nomeXml) return '';
  
  // 1. Limpar texto
  let resultado = limparTexto(nomeXml);
  
  // 2. Expandir unidades coladas em números
  resultado = expandirUnidades(resultado);
  
  // 3. Processar palavra por palavra
  const palavras = resultado.split(' ');
  const palavrasProcessadas = palavras.map((palavra, index) => {
    const palavraUpper = palavra.toUpperCase();
    
    // Verificar se é uma sigla que deve permanecer em maiúsculas
    if (SIGLAS.includes(palavraUpper)) {
      return palavraUpper;
    }
    
    // Verificar se é uma abreviação conhecida
    if (ABREVIACOES[palavraUpper]) {
      return ABREVIACOES[palavraUpper];
    }
    
    // Verificar se é um número ou contém número (ex: "30kg", "46%")
    if (/^\d/.test(palavra) || /\d$/.test(palavra)) {
      return palavra.toLowerCase();
    }
    
    // Verificar se é uma palavra de ligação (não é a primeira)
    if (index > 0 && PALAVRAS_MINUSCULAS.includes(palavra.toLowerCase())) {
      return palavra.toLowerCase();
    }
    
    // Capitalizar normalmente
    return capitalize(palavra);
  });
  
  return palavrasProcessadas.join(' ');
}

/**
 * Valida se um NCM parece válido (8 dígitos numéricos)
 */
export function validarNCM(ncm: string): { valido: boolean; mensagem?: string } {
  if (!ncm) {
    return { valido: false, mensagem: 'NCM não informado' };
  }
  
  // Remove pontos e espaços
  const ncmLimpo = ncm.replace(/[\s.]/g, '');
  
  if (!/^\d+$/.test(ncmLimpo)) {
    return { valido: false, mensagem: 'NCM deve conter apenas números' };
  }
  
  if (ncmLimpo.length !== 8) {
    return { valido: false, mensagem: `NCM deve ter 8 dígitos (informado: ${ncmLimpo.length})` };
  }
  
  // Prefixos comuns do agronegócio
  const prefixosAgro = ['10', '11', '12', '15', '17', '22', '23', '25', '28', '29', '30', '38'];
  const prefixo = ncmLimpo.substring(0, 2);
  
  if (!prefixosAgro.includes(prefixo)) {
    return { 
      valido: true, 
      mensagem: `NCM fora dos prefixos comuns do agronegócio (${prefixo}xx.xx.xx)` 
    };
  }
  
  return { valido: true };
}

/**
 * Formata NCM para exibição (1234.56.78)
 */
export function formatarNCM(ncm: string): string {
  if (!ncm) return '';
  const limpo = ncm.replace(/[\s.]/g, '');
  if (limpo.length !== 8) return ncm;
  return `${limpo.slice(0,4)}.${limpo.slice(4,6)}.${limpo.slice(6,8)}`;
}

/**
 * Retorna descrição da origem da mercadoria
 */
export function getDescricaoOrigem(codigo: string): string {
  const origens: Record<string, string> = {
    '0': 'Nacional',
    '1': 'Estrangeira - Importação direta',
    '2': 'Estrangeira - Adquirida no mercado interno',
    '3': 'Nacional - Conteúdo de importação > 40%',
    '4': 'Nacional - Processos básicos',
    '5': 'Nacional - Conteúdo de importação ≤ 40%',
    '6': 'Estrangeira - Importação direta, sem similar',
    '7': 'Estrangeira - Mercado interno, sem similar',
    '8': 'Nacional - Conteúdo de importação > 70%',
  };
  return origens[codigo] || `Código ${codigo}`;
}
