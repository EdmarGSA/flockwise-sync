

## Melhorias na Tela e Fluxo de Pedido de Vendas

Redesign do modulo Comercial para uma experiencia mais profissional, com foco em otimizar o preenchimento e melhorar a navegabilidade.

---

### 1. Novo Pedido: Fluxo em Etapas (Stepper)

Substituir o dialog monolitico atual (1083 linhas, tudo visivel de uma vez) por um fluxo guiado em **3 etapas** com indicador de progresso visual:

- **Etapa 1 - Cliente e Condicoes**: Selecao de cliente (com busca por texto), tabela de preco, forma/prazo de pagamento, data de entrega. Cards de credito e inadimplencia aparecem aqui.
- **Etapa 2 - Itens do Pedido**: Tabs de Produtos/Aves/Ovos para adicionar itens. Tabela de itens ja adicionados com edicao inline.
- **Etapa 3 - Revisao e Confirmacao**: Resumo completo do pedido com dados do cliente, itens, totais, observacoes. Botoes de Rascunho e Enviar para Aprovacao.

Beneficios: Menos sobrecarga visual, validacao progressiva, usuario nao precisa rolar a tela inteira.

### 2. Busca de Cliente com Texto

Substituir o Select simples de clientes por um campo com busca textual (usando `cmdk` ou Input filtrado), permitindo digitar parte do nome/fantasia para encontrar rapidamente.

### 3. Tabela de Pedidos com Cards Resumo

Adicionar **4 cards KPI** no topo da tab de Pedidos:
- Total de Pedidos (mes)
- Valor Total Faturado (mes)
- Pedidos Pendentes de Aprovacao
- Ticket Medio

### 4. Status Badges com Cores Mais Claras

Melhorar as badges de status com cores semanticas consistentes:
- Rascunho: cinza
- Pendente: amarelo/amber
- Aprovado: verde
- Em Separacao: azul
- Faturado: roxo/indigo
- Cancelado: vermelho

### 5. Tabela de Pedidos Responsiva com Informacoes Extras

- Adicionar coluna "Vendedor" na tabela
- Mostrar quantidade de itens como badge no numero do pedido
- Linhas com hover sutil e clique para abrir detalhe
- Em mobile, converter tabela para lista de cards

### 6. Totalizador Fixo no Novo Pedido

Na etapa de itens, manter um rodape fixo (sticky) com subtotal, desconto, frete e total sempre visivel enquanto o usuario adiciona produtos.

### 7. Preenchimento Rapido de Produtos

- Ao selecionar produto, auto-preencher preco da tabela selecionada (ja existe, manter)
- Permitir adicionar produto com Enter apos preencher quantidade
- Mostrar estoque disponivel como texto auxiliar no campo de produto

---

### Detalhes Tecnicos

**Arquivos a criar:**
- `src/components/comercial/NovoPedidoStepper.tsx` - Novo componente com fluxo em etapas (substituira NovoPedidoDialog)
- `src/components/comercial/PedidoStep1Cliente.tsx` - Etapa 1: Cliente e condicoes
- `src/components/comercial/PedidoStep2Itens.tsx` - Etapa 2: Itens do pedido
- `src/components/comercial/PedidoStep3Revisao.tsx` - Etapa 3: Revisao e confirmacao
- `src/components/comercial/PedidosKPICards.tsx` - Cards de KPI no topo

**Arquivos a modificar:**
- `src/components/comercial/PedidosTable.tsx` - Adicionar KPI cards, melhorar badges, layout mobile com cards
- `src/components/comercial/PedidoViewDialog.tsx` - Melhorar layout visual, badges coloridas
- `src/pages/Comercial.tsx` - Sem alteracoes estruturais

**Abordagem:**
- O NovoPedidoStepper reutilizara toda a logica de negocio existente (credito, inadimplencia, margem, lotes, ovos)
- Os componentes LotesVendaSection e OvosVendaSection serao reutilizados sem alteracao
- O estado do formulario sera mantido em um unico componente pai (Stepper) e passado via props para cada etapa
- A navegacao entre etapas tera validacao: so avanca da etapa 1 se cliente estiver selecionado

