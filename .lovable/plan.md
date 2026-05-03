## Contexto

No diálogo **Gerenciar Lote** (`GestaoCampo` → `LoteDashboardDialog` → aba "Editar Lote" → `LoteEditForm`), todos os campos ficam bloqueados (`disabled={!isEditable}`) quando o lote está em status `alojado`, `saiu_para_entrega` ou `fechado` — só lotes em `previsao` são editáveis. Hoje não há nenhuma forma de corrigir a **Data de Alojamento** (ex.: alojamento registrado no dia errado) nem trocar o **Programa de Iluminação** depois do alojamento, o que é uma necessidade real (ajuste de fotoperíodo durante o ciclo).

## Objetivo

Permitir editar **somente** dois campos em lotes não-previsão:
- `data_alojamento`
- `programa_iluminacao_id`

Sem reabrir a edição completa (quantidade de aves, peso pintinhos, sexo, etc., que afetam histórico e cálculos).

## Mudanças

### 1. `src/components/lotes/LoteEditForm.tsx`
- Novo estado local `modoEdicaoAvancada` (boolean).
- Novo botão **"Editar Lote"** (ícone `Pencil`) exibido no topo do form **apenas quando `!isEditable`** (ou seja, status `alojado`/`saiu_para_entrega`/`fechado`). Ao clicar, ativa `modoEdicaoAvancada`.
- Os campos `data_alojamento` (linha 405) e `programa_iluminacao_id` (linha 492) passam a usar `disabled={!isEditable && !modoEdicaoAvancada}` em vez de `disabled={!isEditable}`. Os demais campos continuam bloqueados.
- Quando `modoEdicaoAvancada` está ativo, exibir botões **Cancelar** e **Salvar Ajustes** logo após o campo de programa de iluminação. O Salvar chama um novo handler `handleSaveAjustes` que faz update somente de `data_alojamento` e `programa_iluminacao_id` (preservando os outros campos), com toast de sucesso/erro e `onSuccess()`.
- Mostrar um pequeno aviso visual (texto pequeno em `text-amber-600`): "Modo edição: alterar a data de alojamento recalcula idade do lote e curvas de fotoperíodo."

### 2. Comportamento dos botões existentes
- O bloco final com botões "Cancelar / Saiu p/ Entrega / Salvar" (linhas 533–554) continua só aparecendo quando `isEditable` (status `previsao`). Sem mudança.
- A seção `SaidaLoteSection` (alojado) também não muda.

### 3. Sem mudanças de schema
Os dois campos já existem na tabela `lotes` e já têm RLS adequada (a página está em rota protegida `/gestao-campo` com `useIntegradoId`). Não há migração.

## Observações

- O `auto-iluminacao` (edge function que roda a cada 1 min) recalcula o estado a partir de `programa_iluminacao_id` do lote no próximo tick, então a troca tem efeito quase imediato.
- Idade do lote (`calcularIdadeLote(data_alojamento)`) é derivada — qualquer ajuste retroativo se reflete em todos os lugares que leem essa data.

## Fora de escopo

- Auditoria/log de alteração da data (pode ser próximo passo se desejado).
- Edição de outros campos do lote em status alojado.
