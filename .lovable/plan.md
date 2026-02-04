
# Plano: Filtro de Clientes por Vendedor

## Resumo

Implementar a funcionalidade que permite cada vendedor visualizar apenas sua carteira de clientes atribuida, garantindo isolamento de dados entre vendedores do mesmo fornecedor.

## Contexto Atual

### Estrutura Existente

```text
+-----------------------------+      +-----------------------------+
|   clientes_fornecedor       |      |   vendedores_fornecedor     |
+-----------------------------+      +-----------------------------+
| id                          |      | id                          |
| fornecedor_global_id (FK)   |      | fornecedor_global_id (FK)   |
| razao_social_nome           |      | nome                        |
| cpf_cnpj                    |      | email                       |
| saldo_credito               |      | user_id (auth.users)        |
| ...                         |      | ...                         |
|                             |      |                             |
| [SEM VINCULO VENDEDOR!]     |      +-----------------------------+
+-----------------------------+
```

### Comportamento Atual
- Todos os clientes sao vistos por todos os usuarios do fornecedor
- O vendedor e registrado no pedido (vendedor_fornecedor_id em pedidos_catalogo_fornecedor)
- Nao ha filtragem de clientes por vendedor no carrinho ou listagem

## Arquitetura Proposta

### Novo Modelo de Dados

```text
+-----------------------------+
|   clientes_fornecedor       |
+-----------------------------+
| id                          |
| fornecedor_global_id (FK)   |
| vendedor_fornecedor_id (FK) | <-- NOVO CAMPO
| razao_social_nome           |
| ...                         |
+-----------------------------+
         |
         v
+-----------------------------+
|   vendedores_fornecedor     |
+-----------------------------+
| id                          |
| fornecedor_global_id (FK)   |
| user_id (auth.users)        |
| ...                         |
+-----------------------------+
```

## Etapas de Implementacao

### 1. Migracao de Banco de Dados

Adicionar coluna vendedor_fornecedor_id na tabela clientes_fornecedor:

| Coluna | Tipo | Nullable | Descricao |
|--------|------|----------|-----------|
| vendedor_fornecedor_id | UUID | Sim | FK para vendedores_fornecedor |

### 2. Atualizar Hook useFornecedorData

| Funcao | Modificacao |
|--------|-------------|
| fetchMeusClientes | Adicionar filtro por vendedor_fornecedor_id quando usuario e vendedor |

Logica de filtragem:
- Se usuario e proprietario do fornecedor (sem vendedor vinculado): ver todos os clientes
- Se usuario e vendedor: ver apenas clientes onde vendedor_fornecedor_id = seu ID OU vendedor_fornecedor_id IS NULL

### 3. Atualizar Formulario de Cliente

| Componente | Modificacao |
|------------|-------------|
| ClienteFornecedorForm.tsx | Adicionar campo Select para escolher vendedor responsavel |
| FornecedorClientesTab.tsx | Exibir coluna Vendedor na tabela |

### 4. Atualizar Hook useVendedorFornecedor

| Modificacao | Descricao |
|-------------|-----------|
| Retornar vendedor.id | Para usar como filtro nas queries |
| isOwner flag | Identificar se usuario e dono do fornecedor (ve tudo) |

### 5. Atualizar Componentes de Vendas

| Componente | Modificacao |
|------------|-------------|
| CarrinhoDrawer.tsx | Receber lista de clientes ja filtrada |
| VendasTab.tsx | Passar clientes filtrados para o carrinho |

### 6. Atualizar API sync-erp

Adicionar campo vendedor_codigo_erp na acao sync_clientes para permitir vinculacao automatica via ERP.

## Arquivos a Modificar

| Arquivo | Tipo de Alteracao |
|---------|-------------------|
| Database Migration | Adicionar coluna vendedor_fornecedor_id |
| src/hooks/useFornecedorData.tsx | Filtrar clientes por vendedor |
| src/hooks/useVendedorFornecedor.tsx | Adicionar flag isOwner |
| src/components/fornecedor/ClienteFornecedorForm.tsx | Adicionar campo de selecao de vendedor |
| src/components/fornecedor/FornecedorClientesTab.tsx | Exibir vendedor na tabela, filtrar por vendedor |
| src/components/fornecedor/vendas/CarrinhoDrawer.tsx | Receber clientes filtrados |
| supabase/functions/sync-erp/index.ts | Suportar vendedor_codigo_erp em sync_clientes |

## Detalhes Tecnicos

### Migracao SQL

```sql
-- Adicionar coluna para vincular cliente ao vendedor
ALTER TABLE clientes_fornecedor
ADD COLUMN vendedor_fornecedor_id UUID REFERENCES vendedores_fornecedor(id);

-- Indice para performance
CREATE INDEX idx_clientes_fornecedor_vendedor 
ON clientes_fornecedor(vendedor_fornecedor_id);
```

### Logica de Filtragem no Hook

```typescript
// Em fetchMeusClientes
const fetchMeusClientes = useCallback(async (globalId: string, vendedorId?: string | null) => {
  let query = supabase
    .from('clientes_fornecedor')
    .select('*')
    .eq('fornecedor_global_id', globalId);

  // Se e vendedor, filtrar apenas seus clientes
  if (vendedorId) {
    query = query.or(`vendedor_fornecedor_id.eq.${vendedorId},vendedor_fornecedor_id.is.null`);
  }

  const { data } = await query.order('razao_social_nome');
  return data || [];
}, []);
```

### Campo de Selecao no Formulario

```typescript
// Novo campo em ClienteFornecedorForm
<FormField
  control={form.control}
  name="vendedor_fornecedor_id"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Vendedor Responsavel</FormLabel>
      <Select onValueChange={field.onChange} value={field.value || ''}>
        <SelectTrigger>
          <SelectValue placeholder="Todos (nao atribuido)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todos (nao atribuido)</SelectItem>
          {vendedores.map(v => (
            <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormItem>
  )}
/>
```

## Comportamentos Esperados

| Usuario | Visualizacao de Clientes |
|---------|--------------------------|
| Proprietario do fornecedor | Todos os clientes |
| Vendedor A | Clientes atribuidos ao Vendedor A + clientes sem atribuicao |
| Vendedor B | Clientes atribuidos ao Vendedor B + clientes sem atribuicao |

## Impacto na API sync-erp

### sync_clientes Atualizado

```json
{
  "acao": "sync_clientes",
  "clientes": [
    {
      "codigo_erp": "CLI001",
      "vendedor_codigo_erp": "VEND001",
      "razao_social_nome": "Cliente Exemplo",
      ...
    }
  ]
}
```

A API ira buscar o vendedor pelo codigo_erp e vincular automaticamente.

## Beneficios

| Beneficio | Descricao |
|-----------|-----------|
| Isolamento de carteira | Cada vendedor ve apenas seus clientes |
| Flexibilidade | Clientes sem vendedor sao visiveis por todos |
| Integracao ERP | Vinculacao automatica via codigo_vendedor |
| Auditoria | Pedidos ja registram qual vendedor criou |
