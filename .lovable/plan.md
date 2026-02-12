

## Estoque de Ovos Quebrados e Descarte com Destino

### Resumo

Duas funcionalidades novas no modulo de Estoque de Ovos:

1. **Campo "Ovos Danificados" na entrada manual** - ao registrar uma nova entrada, o usuario podera informar a quantidade de ovos danificados/quebrados. Esses ovos serao registrados automaticamente em um estoque separado (classificacao "quebrado"), com movimento proprio no Kardex.

2. **Dialog de Descarte de Ovos** - nova opcao para dar saida de ovos informando o destino do descarte (ex: industria, compostagem, doacao, lixo, reciclagem animal).

---

### Alteracoes no Banco de Dados

**Migration SQL:**

1. Adicionar valor `quebrado` ao enum `classificacao_peso_ovo` (para identificar ovos danificados no estoque).
2. Criar tabela `descarte_ovos` para registrar saidas de descarte com campo `destino`:
   - `id`, `integrado_id`, `estoque_ovo_id` (nullable), `quantidade`, `motivo`, `destino`, `observacao`, `created_at`
   - Destinos possiveis: industria, compostagem, doacao, descarte_sanitario, reciclagem_animal, outro
   - RLS habilitado com politicas para SELECT/INSERT baseadas em `auth.uid()`

### Alteracoes no Codigo

**1. Formulario de Nova Entrada (`EstoqueOvos.tsx`)**

- Adicionar campo `quantidade_danificados` ao `formData`
- Exibir input "Ovos Danificados" abaixo do campo de quantidade
- No `handleSubmit`, apos criar o estoque principal, se `quantidade_danificados > 0`:
  - Criar um segundo registro em `estoque_ovos` com `classificacao_peso: 'quebrado'`
  - Registrar entrada no `kardex_ovos` com `tipo_movimento: 'entrada_manual'` e observacao indicando "Ovos danificados"
  - O lote interno recebera sufixo `-DMG` para diferenciar

**2. Novo componente: `DescarteOvosDialog.tsx`** (`src/components/ovos/`)

- Dialog para registrar descarte de ovos
- Campos: selecao do lote de estoque, quantidade a descartar, destino (select com opcoes), motivo, observacao
- Ao confirmar:
  - Reduz `quantidade_atual` no `estoque_ovos`
  - Registra movimento no `kardex_ovos` com `tipo_movimento: 'saida_descarte'`
  - Insere registro na tabela `descarte_ovos` com o destino

**3. Integracao na pagina (`EstoqueOvos.tsx`)**

- Adicionar botao "Descarte" ao lado dos botoes existentes (Validade, Etiquetas, Entrada Manual)
- Adicionar o `DescarteOvosDialog` nos dialogs da pagina
- Nos cards de resumo, mostrar ovos quebrados separadamente se existirem

### Destinos de Descarte Disponiveis

- Industria (processamento)
- Compostagem
- Doacao
- Descarte Sanitario
- Reciclagem Animal (racao)
- Outro

