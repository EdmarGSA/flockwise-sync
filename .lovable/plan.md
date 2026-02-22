

## Dividir Pesagem em Duas Etapas com UX Mobile Melhorada

### Etapa 1 -- Nivel do Silo (tela dedicada)

Quando o usuario abre a pesagem, se o galpao tem silo vinculado e o nivel ainda nao foi gravado, exibir APENAS a etapa do silo:

- Remover a secao de informacao/alerta "Grave o nivel do silo antes de registrar as pesagens"
- Melhorar os botoes "Gravar Nivel Informado" e "Aceitar Nivel Atual" para mobile:
  - Botoes empilhados verticalmente (full-width)
  - "Gravar Nivel Informado" com variante `default` (verde primario, destaque total)
  - "Aceitar Nivel Atual" com variante `outline` mas com tamanho `lg` para toque facil
  - Altura minima de 48px nos dois botoes
- Apos gravar o nivel, a etapa 1 colapsa mostrando o resumo e a etapa 2 abre automaticamente

### Etapa 2 -- Pesagem de Aves (nova tela/secao)

Apos o nivel do silo ser gravado (ou se nao ha silo vinculado), exibir o formulario de pesagem completo:

- Data/hora, tara, formulario de pesagem, tabela de itens, totais, analise CA
- Sem mudanca na logica, apenas na organizacao visual

### Detalhes tecnicos

**Arquivo: `src/components/lotes/PesagemDialog.tsx`**

Adicionar estado `etapa` (1 ou 2):
- Se `showSiloStep && !siloLevelSaved` -> exibe apenas `NivelSiloUpdateForm`
- Se `!showSiloStep || siloLevelSaved` -> exibe formulario de pesagem
- Transicao automatica da etapa 1 para 2 quando `onLevelSaved` e chamado

Reorganizar o render:
- Etapa 1: Apenas `NivelSiloUpdateForm` + indicador de progresso (Etapa 1 de 2)
- Etapa 2: Todo o conteudo de pesagem + indicador (Etapa 2 de 2) + resumo compacto do silo gravado

**Arquivo: `src/components/lotes/NivelSiloUpdateForm.tsx`**

Melhorar os botoes (linhas 542-564):
- "Gravar Nivel Informado": `variant="default"` + `size="lg"` + classe `h-12 text-base font-semibold`
- "Aceitar Nivel Atual": `variant="outline"` + `size="lg"` + classe `h-12 text-base`
- Layout: `flex flex-col gap-3` (sempre empilhados, sem `sm:flex-row`)

Remover o titulo "Etapa 1:" do CardHeader (ja que a etapa sera controlada pelo PesagemDialog com indicador proprio).

