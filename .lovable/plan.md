
# Plano: Implementar sync_vendedores na API sync-erp

## Objetivo

Adicionar a acao `sync_vendedores` na Edge Function `sync-erp` para permitir sincronizacao bidirecional de vendedores entre o ERP local e o Cloud do Portal do Fornecedor.

## Estrutura da Tabela vendedores_fornecedor

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| id | UUID | Auto | Identificador unico |
| fornecedor_global_id | UUID | Sim | FK para fornecedor |
| codigo_vendedor | string | Nao | Codigo unico no ERP local |
| nome | string | Sim | Nome do vendedor |
| email | string | Nao | Email do vendedor |
| telefone | string | Nao | Telefone de contato |
| regiao | string | Nao | Regiao de atuacao |
| observacoes | string | Nao | Observacoes adicionais |
| ativo | boolean | Sim | Status ativo/inativo |
| user_id | UUID | Nao | Vinculo com auth.users |

## Arquitetura da Solucao

```text
+-------------------------------------------+
|            sync_vendedores                |
+-------------------------------------------+
|                                           |
|  Direcao: ERP -> Cloud (bidirecional)    |
|                                           |
|  Operacoes:                               |
|    - INSERT: codigo_vendedor nao existe   |
|    - UPDATE: codigo_vendedor ja existe    |
|    - Manter vinculo user_id intacto       |
|                                           |
+-------------------------------------------+
```

## Especificacao da Acao

### Requisicao

```json
{
  "acao": "sync_vendedores",
  "vendedores": [
    {
      "codigo_erp": "VEND001",
      "nome": "Carlos Silva",
      "email": "carlos@empresa.com",
      "telefone": "(11) 99999-8888",
      "regiao": "Sul",
      "observacoes": "Vendedor senior",
      "ativo": true
    }
  ]
}
```

### Campos do Vendedor

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| codigo_erp | string | Sim | Codigo unico no ERP local |
| nome | string | Sim | Nome completo do vendedor |
| email | string | Nao | Email de contato |
| telefone | string | Nao | Telefone de contato |
| regiao | string | Nao | Regiao de atuacao |
| observacoes | string | Nao | Notas adicionais |
| ativo | boolean | Nao | Status (default: true) |

### Resposta de Sucesso

```json
{
  "success": true,
  "acao": "sync_vendedores",
  "processados": 2,
  "erros": 0,
  "detalhes": []
}
```

## Implementacao Tecnica

### Nova Funcao: syncVendedores

```typescript
async function syncVendedores(supabase: any, fornecedorGlobalId: string, vendedores: any[]) {
  let processados = 0;
  let erros: any[] = [];

  for (const vendedor of vendedores) {
    try {
      // Validacao de campos obrigatorios
      if (!vendedor.codigo_erp || !vendedor.nome) {
        erros.push({ codigo_erp: vendedor.codigo_erp, erro: 'codigo_erp e nome sao obrigatorios' });
        continue;
      }

      // Verificar se vendedor existe pelo codigo_erp
      const { data: existente } = await supabase
        .from('vendedores_fornecedor')
        .select('id, user_id')
        .eq('fornecedor_global_id', fornecedorGlobalId)
        .eq('codigo_vendedor', vendedor.codigo_erp)
        .single();

      const vendedorData = {
        nome: vendedor.nome,
        email: vendedor.email,
        telefone: vendedor.telefone,
        regiao: vendedor.regiao,
        observacoes: vendedor.observacoes,
        ativo: vendedor.ativo ?? true,
        updated_at: new Date().toISOString()
      };

      if (existente) {
        // UPDATE - manter user_id intacto
        await supabase
          .from('vendedores_fornecedor')
          .update(vendedorData)
          .eq('id', existente.id);
      } else {
        // INSERT
        await supabase
          .from('vendedores_fornecedor')
          .insert({
            ...vendedorData,
            fornecedor_global_id: fornecedorGlobalId,
            codigo_vendedor: vendedor.codigo_erp
          });
      }
      processados++;
    } catch (e: any) {
      erros.push({ codigo_erp: vendedor.codigo_erp, erro: e.message });
    }
  }

  // Registrar log
  await registrarLog(
    supabase, fornecedorGlobalId, 'vendedores', 'erp_para_cloud',
    vendedores.length, processados, erros.length, erros, { acao: 'sync_vendedores' }
  );

  return { processados, erros: erros.length, detalhes: erros };
}
```

### Case no Switch Router

```typescript
case 'sync_vendedores':
  if (!dados.vendedores || !Array.isArray(dados.vendedores)) {
    throw new Error('Campo "vendedores" deve ser um array');
  }
  resultado = await syncVendedores(supabase, fornecedorGlobalId, dados.vendedores);
  break;
```

### Atualizar Mensagem de Erro

Atualizar a lista de acoes validas na mensagem de erro default:

```typescript
default:
  throw new Error(`Acao desconhecida: ${acao}. Acoes validas: sync_produtos, sync_clientes, sync_credito, sync_vendedores, buscar_pedidos, confirmar_pedido_erp, atualizar_status, confirmar_nfe, registrar_erro_pedido`);
```

## Arquivo a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `supabase/functions/sync-erp/index.ts` | Adicionar funcao syncVendedores e case no switch |

## Comportamentos Importantes

| Cenario | Comportamento |
|---------|---------------|
| Vendedor novo | INSERT com codigo_vendedor do ERP |
| Vendedor existente | UPDATE apenas dados basicos, preserva user_id |
| Vendedor com user_id | Vinculo de login permanece intacto |
| Desativar vendedor | Enviar `ativo: false` |

## Exemplo de Uso (Python)

```python
def sync_vendedores(api_key, vendedores):
    response = requests.post(
        "https://zqpjxtlfhxjtenhhzaax.supabase.co/functions/v1/sync-erp",
        headers={"X-API-Key": api_key, "Content-Type": "application/json"},
        json={
            "acao": "sync_vendedores",
            "vendedores": vendedores
        }
    )
    return response.json()

# Exemplo
vendedores = [
    {"codigo_erp": "V001", "nome": "Carlos Silva", "email": "carlos@empresa.com", "regiao": "Sul"},
    {"codigo_erp": "V002", "nome": "Maria Santos", "email": "maria@empresa.com", "regiao": "Norte"}
]
resultado = sync_vendedores(api_key, vendedores)
```

## Documentacao a Atualizar

Apos implementacao, adicionar ao `docs/GSA-TIBIRI-PROTOCOL.md`:
- Secao sobre sync_vendedores
- Exemplo de requisicao/resposta
- Campos e comportamentos

## Beneficios

| Beneficio | Descricao |
|-----------|-----------|
| Cadastro centralizado | Vendedores cadastrados no ERP sincronizam automaticamente |
| Rastreabilidade | Pedidos vinculados ao codigo_vendedor do ERP |
| Integridade | Vinculo user_id (login) preservado durante sync |
| Flexibilidade | Suporta ativacao/desativacao remota |
