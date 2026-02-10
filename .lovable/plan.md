
# Plano: Seletor de Tema nas Configuracoes (Dark Green / White)

## Objetivo

Permitir que o usuario escolha entre dois temas visuais diretamente na tela de Configuracoes:
- **White** (claro) - padrao atual, ideal para uso no campo
- **Dark Green** (escuro) - o tema original do sistema

A preferencia sera salva no `localStorage` e persistida entre sessoes.

## Arquivos a Criar

### 1. `src/hooks/useTheme.tsx`

Hook customizado para gerenciar o tema:
- Le a preferencia salva no `localStorage` (chave `app-theme`)
- Aplica/remove a classe `dark` no elemento `<html>`
- Padrao: `"light"` (White)
- Exporta `theme` (valor atual) e `setTheme` (funcao para trocar)

## Arquivos a Modificar

### 2. `src/pages/Configuracoes.tsx`

Adicionar um novo card no grid de configuracoes:
- Titulo: **"Aparencia"**
- Descricao: "Tema visual do sistema"
- Icone: `Palette` (do lucide-react)
- Ao clicar, nao navega para outra pagina - abre um seletor inline ou usa toggle direto no card
- Duas opcoes visuais:
  - **White** - fundo claro com preview de cores
  - **Dark Green** - fundo escuro com preview de cores
- O tema selecionado recebe destaque visual (borda verde)
- A troca e instantanea e salva no `localStorage`

### 3. `src/App.tsx`

Adicionar a inicializacao do tema na raiz do app:
- Ler `localStorage` no carregamento
- Aplicar classe `dark` no `<html>` se o tema salvo for "dark"
- Isso garante que o tema correto seja aplicado antes do primeiro render

## Fluxo

```text
Usuario abre Configuracoes
  -> Ve card "Aparencia" junto aos demais cards
  -> Clica no card -> expande seletor de tema inline
  -> Seleciona "Dark Green" ou "White"
  -> Classe "dark" e adicionada/removida do <html>
  -> Preferencia salva no localStorage
  -> Todas as telas refletem o tema imediatamente
```

## Detalhes Tecnicos

- O CSS ja possui ambos os temas definidos (`:root` para claro, `.dark` para escuro)
- Nenhuma alteracao no CSS e necessaria
- O `next-themes` ja esta instalado mas nao sera usado - um hook simples e suficiente e evita dependencias extras
- A preferencia fica apenas no navegador do usuario (localStorage), sem necessidade de banco de dados

## Resultado

| Item | Detalhe |
|------|---------|
| Arquivos novos | `src/hooks/useTheme.tsx` |
| Arquivos modificados | `src/pages/Configuracoes.tsx`, `src/App.tsx` |
| Persistencia | localStorage |
| Temas disponiveis | White (claro), Dark Green (escuro) |
| Padrao | White |
