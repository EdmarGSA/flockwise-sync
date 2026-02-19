

## Backoffice Admin - Painel Administrativo da Plataforma

Criar um painel administrativo completo com visao cross-tenant (todas as granjas/organizacoes) acessivel apenas por usuarios com role `superadmin`.

---

### 1. Banco de Dados

**1.1 Novo role `superadmin`**
- Adicionar `superadmin` ao enum `app_role` existente
- A funcao `has_role()` ja suporta qualquer valor do enum, entao funciona automaticamente

**1.2 Tabela `support_tickets`**
- `id`, `integrado_id` (referencia profiles), `titulo`, `descricao`, `status` (aberto/em_andamento/resolvido/fechado), `prioridade` (baixa/media/alta/critica), `categoria`, `criado_por` (user_id), `atribuido_a` (user_id superadmin), `created_at`, `updated_at`, `resolvido_at`
- RLS: superadmin ve todos; usuarios normais veem apenas os proprios

**1.3 Tabela `onboarding_steps`**
- `id`, `integrado_id`, `etapa` (text), `concluida` (boolean), `concluida_em`, `notas`
- Controla progresso de onboarding de cada granja

**1.4 Tabela `admin_notifications`**
- `id`, `tipo`, `titulo`, `mensagem`, `lida`, `user_id` (destinatario superadmin), `integrado_id` (granja relacionada), `created_at`

**1.5 Funcao `is_superadmin()`**
- SECURITY DEFINER que verifica se `auth.uid()` tem role `superadmin` em `user_roles`
- Usada nas policies RLS das novas tabelas

---

### 2. Roteamento e Controle de Acesso

**2.1 Nova rota `/backoffice`**
- Protegida por `ProtectedRoute` + verificacao de role `superadmin`
- Novo componente `SuperAdminRoute` que consulta `user_roles` e redireciona se nao for superadmin

**2.2 Novas paginas**
- `src/pages/backoffice/BackofficeLayout.tsx` - Layout com sidebar e header proprio
- `src/pages/backoffice/BackofficeDashboard.tsx` - Dashboard principal
- `src/pages/backoffice/BackofficeGranjas.tsx` - Gestao de granjas
- `src/pages/backoffice/BackofficeUsuarios.tsx` - Gestao de usuarios
- `src/pages/backoffice/BackofficeCS.tsx` - Customer Success
- `src/pages/backoffice/BackofficeFerramentas.tsx` - Ferramentas administrativas
- `src/pages/backoffice/BackofficeNotificacoes.tsx` - Central de notificacoes

---

### 3. Estrutura das Abas

**3.1 Dashboard**
- KPI cards: Total granjas ativas, Total usuarios, Total lotes ativos, Total aves alojadas
- Grafico de crescimento de granjas (novos cadastros por mes)
- Granjas com maior volume de producao
- Ultimos tickets abertos

**3.2 Granjas**
- Tabela com todas as organizacoes (profiles agrupados por integrado_id)
- Colunas: Nome da granja, Qtd usuarios, Qtd lotes ativos, Qtd aves, Status (ativo/inativo), Data cadastro
- Acoes: Ver detalhes, Ativar/Desativar
- Filtros por status e busca por nome
- Detalhes: visao geral da granja com seus nucleos, galpoes e lotes

**3.3 Usuarios**
- Tabela com todos os usuarios do sistema (profiles + user_roles)
- Colunas: Nome, Email, Role, Granja vinculada, Ultimo acesso, Status
- Acoes: Ver detalhes, Editar role, Resetar senha
- Filtros por role, granja e busca

**3.4 Customer Success**
- **Health Score**: Pontuacao automatica baseada em: frequencia de uso, lotes ativos, mortalidade media, tickets abertos
- **Onboarding Tracker**: Lista de etapas de onboarding por granja (cadastro completo, primeiro lote, primeira pesagem, etc.)
- **Tickets de Suporte**: CRUD completo para tickets (criar, atribuir, resolver, fechar)
- Filtros por status, prioridade e granja

**3.5 Ferramentas**
- Promover usuario a superadmin
- Executar demo setup para uma granja
- Visualizar logs de sync ERP
- Ver webhooks recentes

**3.6 Notificacoes**
- Lista de notificacoes administrativas
- Alertas de granjas com problemas (mortalidade alta, tickets criticos)
- Marcar como lida

---

### 4. Componentes

**4.1 Layout**
- `BackofficeSidebar.tsx` - Sidebar com navegacao entre as 6 abas
- `BackofficeHeader.tsx` - Header com logo, nome do admin e logout

**4.2 Dashboard**
- `BackofficeKPICards.tsx` - Cards com metricas globais
- `BackofficeCrescimentoChart.tsx` - Grafico de novos cadastros

**4.3 Granjas**
- `GranjaTable.tsx` - Tabela de granjas
- `GranjaDetalheDialog.tsx` - Dialog com detalhes da granja

**4.4 Usuarios**
- `UsuariosTable.tsx` - Tabela global de usuarios
- `UsuarioDetalheDialog.tsx` - Dialog com detalhes do usuario

**4.5 Customer Success**
- `TicketsTable.tsx` - Tabela de tickets
- `TicketFormDialog.tsx` - Formulario de ticket
- `OnboardingTracker.tsx` - Progresso de onboarding
- `HealthScoreCard.tsx` - Card de health score

---

### 5. Hook `useSuperAdminCheck`
- Similar ao `useSupplierCheck` mas para verificar role `superadmin`
- Usado no `SuperAdminRoute` e no header para mostrar link do backoffice

---

### 6. Navegacao
- No `Home.tsx`, se o usuario for superadmin, mostrar um card/botao "Backoffice Admin" no topo
- No `Header.tsx`, adicionar link para `/backoffice` se superadmin

---

### Ordem de Implementacao

1. Migracao SQL (enum, tabelas, funcoes, RLS)
2. Hook `useSuperAdminCheck` + `SuperAdminRoute`
3. `BackofficeLayout` + roteamento no `App.tsx`
4. Dashboard com KPIs
5. Aba Granjas
6. Aba Usuarios
7. Aba Customer Success (tickets + onboarding + health score)
8. Aba Ferramentas
9. Aba Notificacoes
10. Links de acesso no Home/Header

