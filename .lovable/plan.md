

# Plano: Atualizar Documentação do Protocolo GSA Tibiri

## Contexto

Após as correções recentes na Edge Function `sync-erp` e a reorganização do Swagger UI, a documentação em `docs/GSA-TIBIRI-PROTOCOL.md` precisa ser atualizada para refletir:

1. As correções de campos (`estoque` mapeia para `estoque_proprio`, `codigo_interno` é preenchido automaticamente)
2. A nova estrutura do Swagger UI com endpoints separados por tags
3. Informações sobre o Cloud Agent como "cérebro" central da integração

## Alterações Necessárias

### 1. Atualizar Seção sync_produtos (linha ~79-128)

**Situação atual (desatualizada):**
```markdown
### Comportamento
- Produtos são identificados pelo `codigo_erp`
- Se o produto não existir no Cloud, será ignorado (cadastro deve ser feito manualmente)
- Apenas campos enviados são atualizados
```

**Correção necessária:**
- O comportamento mudou: produtos NOVOS são CRIADOS automaticamente agora (não mais ignorados)
- O campo `codigo_interno` é preenchido automaticamente usando `codigo_erp`
- O campo `estoque` da API mapeia para `estoque_proprio` no banco

### 2. Adicionar Seção sobre Mapeamento de Campos (novo)

Incluir tabela clara de mapeamento API → Banco:

| Campo API | Campo Banco | Notas |
|-----------|-------------|-------|
| `estoque` | `estoque_proprio` | Quantidade em estoque próprio |
| `codigo_erp` | `codigo_erp` + `codigo_interno` | Usado como identificador e código interno |

### 3. Atualizar Diagrama de Arquitetura (linha ~5-24)

Adicionar conceito do "Cloud Agent" explicando:
- Edge Function `sync-erp` como centro de comando
- Edge Function `sync-erp-docs` como interface Swagger
- Fluxo de autenticação via SHA-256 hash

### 4. Adicionar Link para Documentação Interativa

Incluir referência ao Swagger UI:
```markdown
## Documentação Interativa (Swagger)

Acesse a documentação interativa com exemplos executáveis:
https://zqpjxtlfhxjtenhhzaax.supabase.co/functions/v1/sync-erp-docs
```

### 5. Atualizar Seção de Erros (linha ~124-128)

Documentar melhor os erros capturados:
- Erros individuais por produto são retornados no array `detalhes`
- Campo `erros` retorna a contagem total
- Erros de banco de dados agora são capturados corretamente

## Arquivo a Modificar

| Arquivo | Operação |
|---------|----------|
| `docs/GSA-TIBIRI-PROTOCOL.md` | MODIFICAR |

## Seções do Documento a Atualizar

1. **Visão Geral** (~linhas 1-25): Adicionar conceito de Cloud Agent
2. **sync_produtos** (~linhas 79-128): Corrigir comportamento e mapeamento
3. **Nova seção**: "Documentação Interativa" após Autenticação
4. **Nova seção**: "Mapeamento de Campos API → Banco" 
5. **Respostas de Erro**: Detalhar estrutura de erros

## Exemplo de Atualização - sync_produtos

```markdown
## 1. Sincronizar Produtos (`sync_produtos`)

Sincroniza catálogo de produtos entre ERP e Cloud. 
Produtos são identificados pelo `codigo_erp` - se existir atualiza, se não existir cria novo.

### Mapeamento de Campos

| Campo API | Campo Banco | Obrigatório | Descrição |
|-----------|-------------|-------------|-----------|
| `codigo_erp` | `codigo_erp`, `codigo_interno` | Sim | Identificador único (usado em ambos os campos) |
| `nome` | `nome` | Não | Nome do produto |
| `preco` | `preco_tabela` | Não | Preço de venda |
| `estoque` | `estoque_proprio` | Não | Quantidade em estoque |
| `unidade` | `unidade_venda` | Não | Unidade (default: UN) |
| `ativo` | `ativo` | Não | Status ativo/inativo (default: true) |

### Comportamento

- Produtos são identificados pelo `codigo_erp`
- Se o produto NÃO existir no Cloud, será CRIADO automaticamente
- Se já existir, apenas os campos enviados são atualizados
- O campo `codigo_interno` é preenchido automaticamente com o valor de `codigo_erp`
- Erros individuais são retornados no array `detalhes`
```

## Resultado Esperado

Após as atualizações:
1. Documentação reflete o comportamento real da API
2. Mapeamento de campos claramente explicado
3. Link para Swagger UI disponível
4. Conceito de Cloud Agent documentado
5. Desenvolvedores terão referência precisa para integração

