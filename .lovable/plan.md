

## Plano: Evolução do Registro de Mortalidade com Fotos e Análise por IA

### Resumo das Mudanças

1. **Submotivo "Deficiente" como checkbox** -- Atualmente, submotivo aparece como Select apenas quando motivo = "eliminado". A mudança transforma submotivo em checkboxes (multi-select) para permitir marcar "deficiente" independentemente.

2. **Peso obrigatório** -- Tornar o campo `pesoKg` obrigatório na validação de `handleAddItem`, exibindo `*` no label e impedindo adicionar item sem peso.

3. **Upload de fotos de 10% das aves mortas por motivo** -- Adicionar seção de fotos no formulário de mortalidade que calcula automaticamente quantas fotos são necessárias (10% da quantidade por motivo) e permite tirar fotos via câmera ou galeria.

4. **Edge Function com IA para análise de mortalidade** -- Backend function que recebe as fotos + dados contextuais (temperatura, humidade, consumo de água, histórico de pesagens, GPD) e retorna prováveis causas da mortalidade com sugestões de ação.

---

### Detalhes Técnicos

#### 1. Submotivo como Checkbox (multi-select)
- No `MortalidadeDialog.tsx`, substituir o `Select` de submotivo por 3 checkboxes que aparecem quando `motivo === 'eliminado'`
- Alterar `submotivo` no state de `string | null` para `SubmotivoEliminacao[]`
- Ao salvar, criar um `mortalidade_itens` por submotivo selecionado (ou manter como principal + campo adicional)
- **Decisao**: Manter um único item por adição mas com submotivo principal. O "deficiente" pode ser marcado como flag adicional sem mudar a estrutura do banco.

#### 2. Peso Obrigatório
- Em `handleAddItem()`, validar que `pesoKg` não está vazio e é > 0
- Atualizar label de "Peso (kg) - Opcional" para "Peso (kg) *"
- Exibir `toast.error` se peso não informado

#### 3. Upload de Fotos de Mortalidade
- **Migration**: Criar tabela `mortalidade_fotos` com colunas: `id`, `mortalidade_id`, `motivo`, `url`, `created_at`
- **Storage**: Criar bucket `mortalidade-fotos` (público)
- **RLS**: Policies para insert/select baseadas em `integrado_id` via join com `mortalidade`
- **UI**: Após adicionar itens, mostrar seção "Fotos Obrigatórias" com contagem (10% de cada motivo). Reutilizar padrão do `MediaUpload` existente adaptado para mortalidade.

#### 4. Edge Function de Análise IA
- **Função**: `supabase/functions/analise-mortalidade/index.ts`
- Recebe: `mortalidade_id`, fotos (URLs), dados do lote
- Busca no banco: pesagens recentes (GPD), dados de consumo, histórico mortalidade
- Envia para Lovable AI (`google/gemini-2.5-pro` por suportar imagens) com prompt especializado em avicultura
- Retorna: prováveis causas, classificação de risco, sugestões de ação
- **Migration**: Adicionar coluna `analise_ia` (jsonb, nullable) na tabela `mortalidade` para armazenar resultado
- **UI**: Após salvar mortalidade com fotos, botão "Analisar com IA" que chama a edge function e exibe resultado em card formatado

#### 5. Dados Contextuais para IA
- Temperatura/Humidade: verificar se existem campos no banco (se não, incluir campos opcionais no formulário de mortalidade)
- Consumo de água: buscar de `desempenho_aves` ou campo no lote
- GPD: calcular a partir das pesagens existentes (`pesagens` + `pesagem_itens`)

---

### Arquivos a Criar/Editar

| Arquivo | Ação |
|---|---|
| `src/components/lotes/MortalidadeDialog.tsx` | Editar: checkboxes submotivo, peso obrigatório, seção fotos, botão IA |
| `src/components/lotes/MortalidadeFotoUpload.tsx` | Criar: componente de upload de fotos com cálculo de 10% |
| `src/components/lotes/AnaliseIAMortalidadeCard.tsx` | Criar: card de exibição do resultado da análise IA |
| `supabase/functions/analise-mortalidade/index.ts` | Criar: edge function com Lovable AI |
| Migration | Criar tabela `mortalidade_fotos`, bucket storage, coluna `analise_ia` em `mortalidade`, campos opcionais `temperatura_c` e `umidade_pct` em `mortalidade` |

