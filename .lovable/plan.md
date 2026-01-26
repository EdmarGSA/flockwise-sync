
# Plano: Cadastro de Acesso Usuário Vendedor do Portal do Fornecedor

## Resumo
Implementar criação automática de usuário quando um vendedor for cadastrado no Portal do Fornecedor. O vendedor terá senha padrão `Vend123#` e será notificado para trocar a senha no primeiro login.

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FLUXO DE CADASTRO DO VENDEDOR                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Formulário VendedorFornecedorForm                                       │
│     └── Email obrigatório para gerar acesso                                 │
│     └── Switch "Gerar Acesso ao Portal"                                     │
│                                                                             │
│  2. Edge Function create-salesperson-user                                   │
│     └── Cria usuário com senha Vend123#                                     │
│     └── Atualiza profile.senha_alterada = false                             │
│     └── Atualiza profile.vendedor_fornecedor_id (vínculo)                   │
│     └── Adiciona role 'vendedor_fornecedor' em user_roles                   │
│     └── Atualiza vendedores_fornecedor.user_id                              │
│                                                                             │
│  3. Login do Vendedor                                                       │
│     └── Auth.tsx detecta role 'vendedor_fornecedor'                         │
│     └── Redireciona para PortalVendedor                                     │
│     └── Toast aviso para trocar senha (se senha_alterada = false)           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Fase 1: Alterações no Banco de Dados

### 1.1 Adicionar coluna `user_id` na tabela `vendedores_fornecedor`
Para vincular o vendedor ao usuário autenticado:

```sql
ALTER TABLE public.vendedores_fornecedor
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vendedores_fornecedor_user_id 
  ON public.vendedores_fornecedor(user_id) WHERE user_id IS NOT NULL;
```

### 1.2 Adicionar coluna `vendedor_fornecedor_id` na tabela `profiles`
Para identificar vendedores no login:

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vendedor_fornecedor_id UUID REFERENCES vendedores_fornecedor(id) ON DELETE SET NULL;
```

### 1.3 Adicionar role 'vendedor_fornecedor' ao enum `app_role`
Se necessário, adicionar o novo papel:

```sql
-- Verificar se o enum já possui o valor
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'vendedor_fornecedor' 
                 AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'vendedor_fornecedor';
  END IF;
END$$;
```

---

## Fase 2: Edge Function para Criar Usuário Vendedor

### Arquivo: `supabase/functions/create-salesperson-user/index.ts`

A função receberá:
- `vendedor_fornecedor_id`: ID do vendedor
- `email`: E-mail do vendedor
- `nome`: Nome do vendedor
- `fornecedor_global_id`: ID do fornecedor

Ações:
1. Verificar se já existe usuário com este email
2. Criar usuário com senha padrão `Vend123#`
3. Atualizar `profiles`:
   - `vendedor_fornecedor_id` → vínculo ao vendedor
   - `fornecedor_global_id` → herda do fornecedor
   - `senha_alterada = false` → força troca de senha
4. Inserir role `vendedor_fornecedor` em `user_roles`
5. Atualizar `vendedores_fornecedor.user_id` com o novo user_id
6. Retornar credenciais geradas

---

## Fase 3: Atualização do Formulário de Vendedor

### Arquivo: `src/components/fornecedor/VendedorFornecedorForm.tsx`

Alterações:

| Campo/Componente | Descrição |
|------------------|-----------|
| Email | Tornar obrigatório quando "Gerar Acesso" ativo |
| Switch "Gerar Acesso" | Novo campo para habilitar criação de usuário |
| Badge informativo | Mostrar se vendedor já possui acesso |

Lógica no `onSubmit`:
1. Salvar o vendedor normalmente
2. Se "Gerar Acesso" ativo e email preenchido:
   - Chamar edge function `create-salesperson-user`
   - Exibir toast com credenciais
3. Se editando e já tem `user_id`, desabilitar switch

---

## Fase 4: Detecção e Redirecionamento no Login

### Arquivo: `src/pages/Auth.tsx`

Adicionar verificação após login bem-sucedido:

```typescript
// Verificar se é vendedor do fornecedor
if (profile.vendedor_fornecedor_id) {
  // Redirecionar para portal do vendedor (ou fornecedor com visão limitada)
  if (profile.senha_alterada === false) {
    toast({
      title: "Atenção",
      description: "Recomendamos alterar sua senha padrão nas configurações.",
      variant: "default",
    });
  }
  navigate('/portal-vendedor'); // ou rota específica
}
```

---

## Fase 5: Interface do Vendedor (Opcional - Futuro)

Se necessário, criar página `PortalVendedor.tsx` com visão limitada:
- Ver apenas os lotes que ele é responsável
- Visualizar clientes associados
- Alterar senha

Por ora, pode redirecionar para o `PortalFornecedor` com restrições via RLS.

---

## Arquivos a Criar

| # | Arquivo | Descrição |
|---|---------|-----------|
| 1 | `supabase/migrations/XXXX_vendedor_user_access.sql` | Migração de banco de dados |
| 2 | `supabase/functions/create-salesperson-user/index.ts` | Edge function para criar usuário |

## Arquivos a Modificar

| # | Arquivo | Descrição |
|---|---------|-----------|
| 1 | `src/components/fornecedor/VendedorFornecedorForm.tsx` | Adicionar switch "Gerar Acesso" e lógica |
| 2 | `src/pages/Auth.tsx` | Detectar vendedor_fornecedor_id e redirecionar |
| 3 | `src/components/fornecedor/FornecedorGestaoCampoTab.tsx` | Mostrar ícone/badge de usuário com acesso |

---

## Detalhes Técnicos

### SQL da Migração

```sql
-- 1. Adicionar user_id na tabela de vendedores
ALTER TABLE public.vendedores_fornecedor
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Índice único para garantir 1:1
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendedores_fornecedor_user_id 
  ON public.vendedores_fornecedor(user_id) WHERE user_id IS NOT NULL;

-- 3. Adicionar vendedor_fornecedor_id no profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vendedor_fornecedor_id UUID;

-- 4. Adicionar role ao enum (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum 
                 WHERE enumlabel = 'vendedor_fornecedor' 
                 AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'vendedor_fornecedor';
  END IF;
END$$;
```

### Edge Function (Estrutura Principal)

```typescript
// Constantes
const DEFAULT_SALESPERSON_PASSWORD = 'Vend123#';

// Fluxo
1. Validar campos obrigatórios
2. Verificar se vendedor já tem user_id (já tem acesso)
3. Verificar se email já existe no auth.users
4. Criar usuário via admin.createUser()
5. Atualizar profile com vendedor_fornecedor_id e fornecedor_global_id
6. Inserir role 'vendedor_fornecedor'
7. Atualizar vendedores_fornecedor.user_id
8. Retornar sucesso com credenciais
```

### Formulário Atualizado (Snippet Principal)

```tsx
// Novo campo: gerar acesso
<FormField
  name="gerarAcesso"
  render={({ field }) => (
    <FormItem className="flex items-center justify-between rounded-lg border p-3">
      <div>
        <FormLabel>Gerar Acesso ao Portal</FormLabel>
        <p className="text-xs text-muted-foreground">
          Cria login para o vendedor com senha padrão Vend123#
        </p>
      </div>
      <FormControl>
        <Switch 
          checked={field.value} 
          onCheckedChange={field.onChange}
          disabled={!!vendedor?.user_id} // Desabilitar se já tem acesso
        />
      </FormControl>
    </FormItem>
  )}
/>

// Validação condicional
email: z.string()
  .refine((val) => {
    if (gerarAcesso && !val) return false;
    return true;
  }, { message: 'Email é obrigatório para gerar acesso' })
```

---

## Fluxo de Uso

1. **Fornecedor** acessa aba "Campo" > "Vendedores"
2. Clica em "Novo Vendedor"
3. Preenche dados e ativa "Gerar Acesso ao Portal"
4. Informa e-mail obrigatório
5. Sistema cria vendedor + usuário
6. Toast exibe: "Acesso criado! Email: X | Senha: Vend123#"
7. **Vendedor** faz login
8. Sistema redireciona e exibe aviso para trocar senha
9. Vendedor acessa aba "Configurações" e altera senha

---

## Resultado Esperado

| Funcionalidade | Descrição |
|----------------|-----------|
| Cadastro integrado | Criar vendedor já gera acesso automaticamente |
| Senha padrão | `Vend123#` para todos os novos vendedores |
| Aviso de troca | Toast no login recomendando alteração |
| Aba Configurações | Já existente para trocar senha |
| Badge visual | Indicar na tabela quais vendedores têm acesso |
