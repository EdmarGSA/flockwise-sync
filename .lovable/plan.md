

## Análise do Problema

A usuária Marcia tem papel **"integrado"** no sistema. O `RoleRedirectWrapper` em `App.tsx` só trata os papéis `criador` e `veterinario`, por isso o papel `integrado` não é interceptado e o usuário cai na tela `/home` (grid de módulos).

Os papéis existentes no banco são: `criador`, `integrado`, `admin`.

## Solução

Adicionar verificação do papel `integrado` no fluxo de redirecionamento, enviando esses usuários direto para `/meus-lotes`.

### Alterações em `src/App.tsx`

1. **Criar hook `useIntegradoCheck`** (mesmo padrão de `useCriadorCheck`): verifica se `profiles.role === 'integrado'`.

2. **`RoleRedirectWrapper` (linha 123-138)**: adicionar check de integrado, redirecionando para `/meus-lotes`:
```typescript
const { isIntegrado, loading: integradoLoading } = useIntegradoCheck();
// ...
if (isIntegrado) return <Navigate to="/meus-lotes" replace />;
```

3. **`PublicRoute` (linha 140-155)**: adicionar mesma lógica para integrado no redirecionamento pós-login.

4. **Botão "Sair" em `MeusLotes.tsx`**: já existe (adicionado anteriormente), então integrados também terão acesso ao logout.

