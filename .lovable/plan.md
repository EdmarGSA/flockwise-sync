
## Promover edmarguimaraes05@gmail.com a Superadmin

Adicionar a role `superadmin` ao usuario EDMAR NEVES GUIMARAES (ID: `d351a123-d5fa-43fe-a6e1-2ead36d96d1f`) na tabela `user_roles`.

### O que sera feito

1. Inserir um novo registro na tabela `user_roles` com role `superadmin` para o usuario
2. O usuario mantera a role `admin` existente (as roles nao sao exclusivas)
3. Apos a insercao, o usuario tera acesso ao painel Backoffice Admin em `/backoffice`

### Detalhes tecnicos

- Executar um INSERT na tabela `user_roles` via migracao SQL
- Nenhuma alteracao de codigo necessaria - o hook `useSuperAdminCheck` e o `SuperAdminRoute` ja estao implementados e funcionais
- O card "Backoffice Admin" aparecera automaticamente na Home para este usuario
