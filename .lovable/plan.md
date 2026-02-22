

## Redirecionar criador direto para o Painel de Lotes

Quando o usuario logado tiver **apenas** o papel de "criador", ao acessar `/home` ele sera redirecionado automaticamente para `/criador-painel`, pulando a tela de selecao de modulos.

### O que sera feito

1. **Criar um hook `useCriadorCheck`** -- consulta a tabela `profiles` para verificar se o `role` do usuario e "criador". Retorna `{ isCriador, loading }`.

2. **Criar um wrapper `CriadorRedirectWrapper`** no `App.tsx` -- envolve a rota `/home`. Se o usuario for apenas criador (nao superadmin), redireciona para `/criador-painel`. Caso contrario, exibe a Home normalmente.

3. **Atualizar `PublicRoute`** -- quando o usuario ja esta logado e acessa `/`, o redirect atual vai para `/home`. Precisamos que, se for criador, va direto para `/criador-painel`.

### Fluxo

- Usuario criador faz login --> redirecionado para `/criador-painel`
- Usuario criador acessa `/home` manualmente --> redirecionado para `/criador-painel`
- Usuario com outro papel (admin, integrado, veterinario) --> comportamento atual mantido (tela Home com modulos)

### Detalhes tecnicos

**Novo hook `src/hooks/useCriadorCheck.tsx`:**
- Consulta `profiles` onde `id = user.id` e verifica se `role = 'criador'`
- Retorna `{ isCriador: boolean, loading: boolean }`

**Wrapper `CriadorRedirectWrapper` em `App.tsx`:**
- Usa `useCriadorCheck` e `useSuperAdminCheck`
- Se `isCriador && !isSuperAdmin` retorna `<Navigate to="/criador-painel" replace />`
- Senao renderiza `children`

**Alteracao na `PublicRoute`:**
- Adicionar `useCriadorCheck` para que usuarios logados do tipo criador sejam redirecionados para `/criador-painel` em vez de `/home`

**Alteracao na rota `/home` do `App.tsx`:**
- Envolver `<Home />` com `<CriadorRedirectWrapper>` (dentro do `SupplierRedirectWrapper` existente)

