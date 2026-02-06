
# Plano: Corrigir Bug na Função sync_produtos

## Problema Identificado

A integração ERP reporta sucesso, mas os produtos não aparecem no catálogo devido a incompatibilidades entre a Edge Function e o schema do banco de dados.

## Mapeamento de Erros

| Linha | Código Atual | Problema |
|-------|--------------|----------|
| 104 | `estoque_disponivel: produto.estoque` | Coluna não existe - nome correto é `estoque_proprio` |
| 118 | `estoque_disponivel: produto.estoque` | Mesmo problema no INSERT |
| 111-121 | INSERT sem `codigo_interno` | Constraint NOT NULL violada |

## Schema da Tabela (produtos_catalogo_fornecedor)

```text
+----------------------+----------+-------------+
| Coluna               | Tipo     | Restrição   |
+----------------------+----------+-------------+
| codigo_interno       | text     | NOT NULL    |
| codigo_erp           | text     | nullable    |
| estoque_proprio      | integer  | nullable    |
+----------------------+----------+-------------+
```

## Correções Necessárias

### Arquivo: supabase/functions/sync-erp/index.ts

**1. Linha 104 - UPDATE (corrigir nome da coluna)**
```typescript
// DE:
estoque_disponivel: produto.estoque,

// PARA:
estoque_proprio: produto.estoque,
```

**2. Linhas 111-121 - INSERT (corrigir nome + adicionar campo obrigatório)**
```typescript
// DE:
await supabase
  .from('produtos_catalogo_fornecedor')
  .insert({
    fornecedor_global_id: fornecedorGlobalId,
    codigo_erp: produto.codigo_erp,
    nome: produto.nome,
    preco_tabela: produto.preco,
    estoque_disponivel: produto.estoque,
    ativo: produto.ativo ?? true,
    unidade_venda: produto.unidade || 'UN'
  });

// PARA:
await supabase
  .from('produtos_catalogo_fornecedor')
  .insert({
    fornecedor_global_id: fornecedorGlobalId,
    codigo_erp: produto.codigo_erp,
    codigo_interno: produto.codigo_erp, // Usa codigo_erp como fallback
    nome: produto.nome,
    preco_tabela: produto.preco,
    estoque_proprio: produto.estoque,
    ativo: produto.ativo ?? true,
    unidade_venda: produto.unidade || 'UN'
  });
```

**3. Melhorar Captura de Erros (linhas 97-123)**

Adicionar verificação do resultado das operações para detectar erros silenciosos:

```typescript
if (existente) {
  const { error: updateError } = await supabase
    .from('produtos_catalogo_fornecedor')
    .update({...})
    .eq('id', existente.id);
  
  if (updateError) {
    erros.push({ codigo_erp: produto.codigo_erp, erro: updateError.message });
    continue;
  }
} else {
  const { error: insertError } = await supabase
    .from('produtos_catalogo_fornecedor')
    .insert({...});
  
  if (insertError) {
    erros.push({ codigo_erp: produto.codigo_erp, erro: insertError.message });
    continue;
  }
}
processados++;
```

## Arquivos a Modificar

| Arquivo | Operação |
|---------|----------|
| supabase/functions/sync-erp/index.ts | MODIFICAR |

## Resultado Esperado

Após a correção:
1. Produtos enviados via `sync_produtos` serão inseridos corretamente no banco
2. Produtos aparecerão no Catálogo e na tela de Vendas
3. Erros de banco serão capturados e reportados no log de sincronização
4. Log mostrará contagem real de processados vs erros

## Campos da API (Documentação Atualizada)

| Campo API | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| codigo_erp | string | Sim | Código único do produto no ERP |
| nome | string | Não | Nome do produto |
| preco | number | Não | Preço de tabela |
| estoque | number | Não | Quantidade em estoque |
| unidade | string | Não | Unidade de venda (default: UN) |
| ativo | boolean | Não | Status ativo (default: true) |
