

## Vincular Dispositivos à Tabela de Automação

### Situação Atual

Hoje, cada dispositivo tem campos `funcao_automacao` e `automacao_ativa` diretamente na tabela `dispositivos_iot`. As regras de temperatura (`regras_temperatura_lote`) são globais por organização. Não há vínculo explícito entre o dispositivo e as regras.

### O que será feito

Criar um vínculo explícito entre dispositivos e a tabela de regras de automação. Na aba "Automação", ao invés de apenas selecionar função e toggle, o usuário:
1. Seleciona o dispositivo
2. Escolhe "Automatizar"
3. O sistema busca e exibe as regras de temperatura disponíveis
4. O dispositivo fica vinculado às regras, mostrando visualmente quais faixas se aplicam

### Alterações

**Banco de dados (migração)**
- Adicionar coluna `regra_grupo` (text, nullable) em `dispositivos_iot` para agrupar qual conjunto de regras o dispositivo segue (ex: "Padrão Frango Corte")
- Adicionar coluna `nome` como campo de agrupamento em `regras_temperatura_lote` (já existe, valor default "Padrão")

**`src/pages/DispositivosIoT.tsx`** — Refatorar a seção "Função dos Dispositivos":
- Ao ativar automação em um dispositivo, abrir um dialog/seção que mostra as regras de temperatura disponíveis (agrupadas por `nome`)
- Mostrar preview das faixas vinculadas ao dispositivo (mini-tabela com dia início/fim, temp min/max)
- O toggle de automação vincula/desvincula o dispositivo das regras
- Badge no card do dispositivo indicando o nome do grupo de regras vinculado
- Se não houver regras cadastradas, exibir aviso com botão para criar regras padrão

**`supabase/functions/auto-temperatura/index.ts`**
- Sem alteração de lógica — já busca regras por `integrado_id` e dispositivos por `galpao_id`. O vínculo visual no frontend complementa o funcionamento existente.

### Detalhes técnicos

- A coluna `regra_grupo` no dispositivo armazena o nome do grupo de regras (ex: "Padrão Frango Corte"), criando o vínculo visual
- Na UI, ao clicar "Automatizar", um dialog busca `regras_temperatura_lote` filtrado pelo `integrado_id` e agrupa por `nome`
- O usuário seleciona o grupo de regras e a função (aquecimento/ventilação)
- Ao confirmar, atualiza `funcao_automacao`, `automacao_ativa` e `regra_grupo` no dispositivo
- A tabela de dispositivos na aba Automação mostra o grupo vinculado com link para expandir as faixas

