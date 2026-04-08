

## Validação de Peso Atípico com Confirmação Obrigatória

### Situação atual
Hoje (linha 550-562), quando o peso médio desvia >20% da referência da tabela, aparece apenas um `toast.warning` — o item já foi adicionado à lista sem confirmação.

### O que será feito

Trocar o toast por um **AlertDialog de confirmação** que bloqueia a adição do item até o usuário confirmar. A validação comparará contra **duas referências**:

1. **Média das pesagens anteriores do mesmo lote** (pesagens já registradas no banco + itens já adicionados na sessão atual)
2. **Peso da tabela de referência** (`desempenho_aves` para o dia atual)

Se o peso médio do item desviar mais de 20% de qualquer uma das referências, o dialog aparece mostrando:
- Peso informado vs referência da tabela
- Peso informado vs média das pesagens anteriores
- Qual o desvio percentual
- Botões "Corrigir" (cancela) e "Confirmar mesmo assim" (adiciona)

### Alteração

**`src/components/lotes/PesagemDialog.tsx`**

- Adicionar estado `pendingItem` (item aguardando confirmação) e `showOutlierDialog` (boolean)
- No `handleAddItem`, após calcular o peso líquido, verificar:
  - Desvio vs `pesoReferencia` (já disponível no state)
  - Desvio vs média dos itens já inseridos na sessão (`itens`)
  - Se desvio > 20% em qualquer comparação → setar `pendingItem` e abrir dialog
  - Se ok → adicionar normalmente
- Criar `handleConfirmOutlier` que adiciona o `pendingItem` à lista
- Criar `handleCancelOutlier` que limpa o `pendingItem` e foca no input
- Renderizar `AlertDialog` com detalhes do desvio encontrado

