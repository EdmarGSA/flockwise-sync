import { Step } from 'react-joyride';

export interface ModuleTutorial {
  moduleCode: string;
  title: string;
  steps: Step[];
}

export const tutorials: ModuleTutorial[] = [
  {
    moduleCode: 'meus_lotes',
    title: 'Tour: Meus Lotes',
    steps: [
      {
        target: 'body',
        content: 'Bem-vindo ao módulo Meus Lotes! Aqui você gerencia todos os lotes de aves da sua granja.',
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '[data-tutorial="lote-card"]',
        content: 'Cada card representa um lote ativo. Você pode ver informações como idade, quantidade de aves e status.',
        placement: 'bottom',
      },
      {
        target: '[data-tutorial="novo-lote"]',
        content: 'Clique aqui para criar um novo lote. Você precisará informar o galpão, quantidade de aves e data de alojamento.',
        placement: 'left',
      },
      {
        target: '[data-tutorial="mortalidade"]',
        content: 'Registre a mortalidade diária para acompanhar a viabilidade do lote.',
        placement: 'top',
      },
      {
        target: '[data-tutorial="pesagem"]',
        content: 'Faça pesagens periódicas para monitorar o ganho de peso e comparar com as metas.',
        placement: 'top',
      },
    ],
  },
  {
    moduleCode: 'gestao_campo',
    title: 'Tour: Gestão de Campo',
    steps: [
      {
        target: 'body',
        content: 'Este módulo permite gerenciar a estrutura física da sua operação: áreas, núcleos e galpões.',
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '[data-tutorial="areas-tab"]',
        content: 'Áreas representam suas fazendas ou unidades produtivas.',
        placement: 'bottom',
      },
      {
        target: '[data-tutorial="nucleos-tab"]',
        content: 'Núcleos são agrupamentos de galpões dentro de uma área.',
        placement: 'bottom',
      },
      {
        target: '[data-tutorial="galpoes-tab"]',
        content: 'Galpões são onde os lotes são alojados. Cadastre todas as especificações técnicas.',
        placement: 'bottom',
      },
    ],
  },
  {
    moduleCode: 'fabrica_racao',
    title: 'Tour: Fábrica de Ração',
    steps: [
      {
        target: 'body',
        content: 'Gerencie todo o processo de fabricação de ração: compras, estoque e produção.',
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '[data-tutorial="compras-tab"]',
        content: 'Crie ordens de compra para seus fornecedores e acompanhe entregas.',
        placement: 'bottom',
      },
      {
        target: '[data-tutorial="recebimentos-tab"]',
        content: 'Registre o recebimento de mercadorias e controle divergências.',
        placement: 'bottom',
      },
      {
        target: '[data-tutorial="producao-tab"]',
        content: 'Gerencie a produção de ração: ordens de produção, formulações e controle de qualidade.',
        placement: 'bottom',
      },
      {
        target: '[data-tutorial="estoque-tab"]',
        content: 'Monitore o estoque de insumos e rações produzidas.',
        placement: 'bottom',
      },
    ],
  },
  {
    moduleCode: 'comercial',
    title: 'Tour: Comercial',
    steps: [
      {
        target: 'body',
        content: 'O módulo comercial gerencia vendas de aves e ovos, desde o pedido até o faturamento.',
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '[data-tutorial="pedidos-tab"]',
        content: 'Crie e gerencie pedidos de venda para seus clientes.',
        placement: 'bottom',
      },
      {
        target: '[data-tutorial="separacao-tab"]',
        content: 'Separe os produtos vendidos e prepare para entrega.',
        placement: 'bottom',
      },
      {
        target: '[data-tutorial="faturamento-tab"]',
        content: 'Finalize o processo com a emissão de notas fiscais.',
        placement: 'bottom',
      },
    ],
  },
  {
    moduleCode: 'financeiro',
    title: 'Tour: Financeiro',
    steps: [
      {
        target: 'body',
        content: 'Controle financeiro completo: contas a pagar, a receber e fluxo de caixa.',
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '[data-tutorial="contas-pagar"]',
        content: 'Gerencie todas as suas obrigações financeiras.',
        placement: 'bottom',
      },
      {
        target: '[data-tutorial="contas-receber"]',
        content: 'Acompanhe os recebíveis e controle a inadimplência.',
        placement: 'bottom',
      },
      {
        target: '[data-tutorial="fluxo-caixa"]',
        content: 'Visualize a projeção do seu fluxo de caixa.',
        placement: 'bottom',
      },
    ],
  },
];

export const getTutorialByModule = (moduleCode: string): ModuleTutorial | undefined => {
  return tutorials.find(t => t.moduleCode === moduleCode);
};

const COMPLETED_TUTORIALS_KEY = 'completed_tutorials';

export const getCompletedTutorials = (): string[] => {
  try {
    const stored = localStorage.getItem(COMPLETED_TUTORIALS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const markTutorialComplete = (moduleCode: string): void => {
  const completed = getCompletedTutorials();
  if (!completed.includes(moduleCode)) {
    completed.push(moduleCode);
    localStorage.setItem(COMPLETED_TUTORIALS_KEY, JSON.stringify(completed));
  }
};

export const isTutorialCompleted = (moduleCode: string): boolean => {
  return getCompletedTutorials().includes(moduleCode);
};

export const resetTutorial = (moduleCode: string): void => {
  const completed = getCompletedTutorials().filter(c => c !== moduleCode);
  localStorage.setItem(COMPLETED_TUTORIALS_KEY, JSON.stringify(completed));
};
