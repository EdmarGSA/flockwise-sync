

## Transformar o card de Aparencia em card compacto com dialog

O card de Aparencia ficara do mesmo tamanho dos demais cards de menu. Ao clicar nele, abrira um Dialog (modal) para o usuario selecionar o tema, evitando trocas acidentais.

### Alteracoes

**Arquivo:** `src/pages/Configuracoes.tsx`

1. Remover o bloco atual do Card de Aparencia (com CardContent e botoes de tema embutidos).
2. Adicionar "Aparencia" como mais um item no array `menuItems`, com icone `Palette`, descricao "Tema visual do sistema", mas em vez de `path`, tera uma acao que abre um Dialog.
3. Criar um state `themeDialogOpen` para controlar a abertura do Dialog.
4. No grid de cards, o card de Aparencia tera a mesma estrutura dos demais (so icone, titulo e descricao), mas ao clicar abrira o dialog em vez de navegar.
5. Renderizar um `Dialog` com os dois botoes de tema (White e Dark Green) dentro, usando os mesmos estilos atuais dos botoes de selecao.

### Resultado

- O card de Aparencia fica visualmente identico aos outros cards do grid.
- O usuario so troca o tema quando clica no card e depois seleciona no modal, eliminando trocas acidentais.
- Nenhum arquivo novo sera criado; tudo fica em `Configuracoes.tsx` usando o componente `Dialog` ja existente no projeto.
