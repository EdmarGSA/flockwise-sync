

# Plano: Melhorar UX Mobile da Aba de Vendas

## Analise Realizada

Verifiquei o codigo atual e confirmei que:

1. **As categorias estao corretas**: O componente `CategoriasSidebar` extrai categorias de `produtos_catalogo_fornecedor` (tabela exclusiva do fornecedor)
2. **Os dados estao corretos**: VendasTab recebe `produtos={produtosCatalogo}` que vem do hook `useFornecedorData`, que busca de `produtos_catalogo_fornecedor` filtrado por `fornecedor_global_id`
3. **Nao ha erro de query**: Os produtos do catalogo do fornecedor estao sendo buscados corretamente

A confusao pode ter sido causada pela imagem de exemplo do plano anterior que mostrava "Racao Inicial" como exemplo generico.

---

## O que sera implementado

Transformar a interface de vendas em um layout otimizado para mobile, estilo aplicativo:

### Layout Mobile Proposto

```text
+------------------------------------------+
|  [Busca...]                              |
+------------------------------------------+
|    +--------+  +--------+  +--------+    |
|    | [FOTO] |  | [FOTO] |  | [FOTO] |    |
|    | Prod A |  | Prod B |  | Prod C |    |
|    | R$ 185 |  | R$ 72  |  | R$ 320 |    |
|    | [+ADD] |  | [+ADD] |  | [+ADD] |    |
|    +--------+  +--------+  +--------+    |
|                                          |
+------------------------------------------+
|  [Home]  [Categorias]  [Carrinho]  [Menu]|
|    🏠        📂          🛒(3)       ☰   |
+------------------------------------------+
```

### Sheet de Categorias (abre da esquerda)

```text
+---------------------------+
|  CATEGORIAS        [X]    |
+---------------------------+
|  [Todos]            (45)  |
|  [>] Medicamento    (2)   |
|  [>] Suplementos    (5)   |
|  [>] Sem categoria  (10)  |
+---------------------------+
```

---

## Componentes a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/fornecedor/vendas/BottomNavVendas.tsx` | Barra de navegacao inferior fixa com 4 botoes |
| `src/components/fornecedor/vendas/CategoriasSheet.tsx` | Sheet lateral que encapsula CategoriasSidebar |
| `src/components/fornecedor/vendas/MenuVendasSheet.tsx` | Sheet com opcoes extras (Meus Pedidos, Config) |

## Componentes a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/components/fornecedor/vendas/VendasTab.tsx` | Integrar barra inferior, detectar mobile, padding inferior |
| `src/components/fornecedor/vendas/CategoriasSidebar.tsx` | Ajustar altura para funcionar dentro do Sheet |

---

## Detalhes Tecnicos

### 1. BottomNavVendas.tsx

Barra fixa no rodape (somente mobile) com 4 botoes:

| Botao | Icone | Acao |
|-------|-------|------|
| Inicio | Home | Scroll para topo / limpar filtros |
| Categorias | LayoutGrid | Abre Sheet lateral de categorias |
| Carrinho | ShoppingCart | Abre Drawer do carrinho (badge com quantidade) |
| Menu | Menu | Abre opcoes (Meus Pedidos, etc) |

Estilizacao:
- Posicao: `fixed bottom-0 left-0 right-0`
- Altura: `h-16` (64px) - area de toque adequada
- Z-index: `z-50` para ficar acima do conteudo
- Background: `bg-card border-t`

### 2. CategoriasSheet.tsx

Sheet que abre pela esquerda contendo a lista de categorias:
- Side: `left`
- Width: `w-[280px]`
- Fecha automaticamente ao selecionar categoria

### 3. MenuVendasSheet.tsx

Opcoes secundarias:
- Meus Pedidos (navega para `/meus-pedidos-fornecedor`)
- Selecionar Cliente
- Atualizar Produtos

### 4. VendasTab.tsx Modificado

Logica condicional baseada no hook `useIsMobile()`:

| Elemento | Desktop (>768px) | Mobile (<768px) |
|----------|-----------------|-----------------|
| Sidebar categorias | Visivel lateral | Oculta (via Sheet) |
| Grid produtos | 4 colunas | 2 colunas |
| Botao carrinho | No header | Na barra inferior |
| Barra inferior | Nao exibe | Fixa no rodape |
| Padding inferior | Normal | `pb-20` para nao ficar atras da barra |

---

## Fluxo de Uso Mobile

1. Vendedor abre aba "Vendas"
2. Ve grid de produtos em 2 colunas
3. Usa busca no topo para filtrar
4. Toca em "Categorias" na barra inferior
5. Sheet abre pela esquerda com lista de categorias
6. Seleciona categoria, sheet fecha automaticamente
7. Grid atualiza com produtos filtrados
8. Toca em "+ Add" nos produtos desejados
9. Badge no icone Carrinho mostra quantidade
10. Toca em "Carrinho" para ver itens e finalizar

---

## Resultado Esperado

| Funcionalidade | Beneficio |
|----------------|-----------|
| Barra inferior fixa | Navegacao rapida com polegar, padrao de apps nativos |
| Categorias em Sheet | Economiza espaco, facil de abrir/fechar |
| Grid 2 colunas | Cards maiores, mais faceis de tocar |
| Badge no carrinho | Feedback visual imediato |
| Padding inferior | Conteudo nao fica escondido atras da barra |

