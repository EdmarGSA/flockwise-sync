

## Envolver o seletor de tema em um Card

Na pagina de Configuracoes, a secao "Aparencia" (tema visual do sistema) esta renderizada sem um Card ao redor, diferente dos demais itens da pagina. A correcao e simples:

### Alteracao

**Arquivo:** `src/pages/Configuracoes.tsx`

- Envolver toda a secao de "Aparencia" (icone Palette, titulo, subtitulo e os botoes de tema) dentro de um componente `Card` com `CardHeader` e `CardContent`, seguindo o mesmo padrao visual dos cards de menu abaixo.
- O titulo "Aparencia" e subtitulo "Tema visual do sistema" ficam no `CardHeader` com `CardTitle` e `CardDescription`.
- Os botoes de selecao de tema ficam dentro do `CardContent`.
- Remover a estrutura manual atual (div com flex + h2 + span) e substituir pela estrutura padrao de Card.

Resultado: a secao de tema fica visualmente consistente com o restante da pagina.

