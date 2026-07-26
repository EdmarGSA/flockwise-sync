
# Importação do PDF do RIPI (Etapa 5)

## Situação atual (verificada)

- O fechamento multi-aba existe: `FechamentoLoteDialog.tsx` (564 linhas) com estados `abate`, `partilha`, `cargas`, `condenacoes`, `descontos`, condenações totais/parciais e calo de pata.
- Os cálculos estão em `src/lib/utils/fechamentoRipi.ts` e os componentes de aba em `src/components/lotes/fechamento/`.
- **Não existe nenhuma importação de PDF hoje**: não há função de servidor de leitura de RIPI, nem campo de upload no diálogo. `jspdf` no projeto é só geração de PDF, não leitura.
- Já existem funções de servidor usando IA (`relatorio-lote-diario`, `climate-learn`), então o caminho de extração por IA é o mesmo padrão já usado no projeto.

## O que será construído

### 1. Upload do PDF no diálogo de fechamento
Nova área no topo da aba **Abate**: "Importar RIPI (PDF)" com arrastar/soltar. O arquivo é enviado para um bucket privado `ripi-pdfs` (caminho `organizacao/lote/arquivo.pdf`), acessível apenas pela própria granja.

### 2. Função de servidor `importar-ripi`
- Recebe o PDF, valida tamanho (até 10 MB) e tipo.
- Envia o documento para o modelo de IA multimodal com um esquema fixo de saída (JSON), pedindo exatamente os campos do RIPI:
  - Cabeçalho: lote da integradora, abatedouro, data/hora média de abate, idade, aves alojadas/abatidas, peso total, peso médio, peso projetado, técnico.
  - Desempenho: conversão prevista/real/ajustada, viabilidade, mortalidade prevista/real, calo de pata previsto/real.
  - Partilha: preço do kg, valor da ração, percentual básico e as quatro avaliações, resultado bruto.
  - Listas: cargas de abate, condenações SIF por código, descontos/créditos, origem dos pintos.
- Retorna também um **nível de confiança por campo** e o texto de origem, sem gravar nada no banco.

### 3. Tela de conferência antes de salvar
Um passo intermediário mostrando lado a lado "valor lido do PDF" x "valor atual do formulário", com caixas de seleção por bloco (Abate, Cargas, Condenações, Partilha, Descontos). Campos com baixa confiança ficam marcados em amarelo. Só o que o usuário aceitar é aplicado ao formulário; nada é salvo automaticamente.

### 4. Conferências automáticas após aplicar
- Soma das cargas x peso total e aves abatidas do cabeçalho.
- Soma das condenações x totais informados.
- Resultado bruto recalculado x o valor lido no PDF.
- O painel de divergências sistema × frigorífico já existente passa a ser alimentado direto pelos dados importados.
Diferenças aparecem como aviso, não bloqueiam o salvamento.

### 5. Rastreabilidade
Guardar no fechamento a referência do PDF importado (caminho no armazenamento, data da importação e quem importou), permitindo reabrir o documento original a partir do fechamento.

## Detalhes técnicos

- Bucket privado `ripi-pdfs` com políticas por `integrado_id`; leitura via URL assinada.
- Função `supabase/functions/importar-ripi/index.ts` com validação de entrada (Zod), CORS, verificação do JWT do chamador e checagem de que o lote pertence à organização.
- Extração via IA multimodal enviando o PDF como bloco `file` em base64, com `response_format` JSON estruturado; nenhuma chave extra é necessária.
- Novos campos em `fechamento_lotes`: `ripi_arquivo_path`, `ripi_importado_em`, `ripi_importado_por`, `ripi_dados_brutos` (jsonb) — em uma migração.
- Normalização de números no padrão brasileiro (1.234,5678) e datas dd/mm/aaaa em utilitário próprio, com testes em vitest.
- O RIPI da Seara serve de modelo de referência; layouts de outras integradoras são tratados pelo mesmo esquema de saída, com os campos ausentes voltando nulos em vez de erro.
