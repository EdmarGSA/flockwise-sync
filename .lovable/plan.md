
# Plano: Correção do Cadastro de Núcleos, Galpões e Lotes no Portal do Fornecedor

## Problema Identificado

Após análise detalhada do código, identifiquei que os formulários de cadastro de **Núcleo**, **Galpão** e **Lote** estão corretamente implementados, porém existe uma **cadeia de dependência** que pode estar bloqueando o usuário:

```text
Clientes → Núcleos → Galpões → Lotes
   ↓          ↓          ↓         ↓
  (0)        (0)        (0)       (0)
```

A consulta ao banco confirmou que a tabela `clientes_fornecedor` está **vazia**, o que causa:
1. Botão "Novo Núcleo" está **desabilitado** (linha 292: `disabled={clientesAtivos.length === 0}`)
2. Botão "Novo Galpão" está **desabilitado** (linha 374: `disabled={nucleos.length === 0}`)
3. Botão "Novo Lote" está **desabilitado** (linha 455: `disabled={galpoes.length === 0}`)

## Problemas Adicionais Encontrados

1. **Inconsistência de filtros**: Os botões verificam `nucleos.length` e `galpoes.length` (todos os registros), mas os formulários recebem apenas os ativos (`nucleos.filter(n => n.ativo)` e `galpoes.filter(g => g.ativo)`). Isso pode causar situação onde o botão está habilitado mas o select do formulário está vazio.

2. **UX confusa**: As mensagens de aviso ("Cadastre pelo menos um cliente/núcleo/galpão") aparecem, mas podem não estar visíveis o suficiente.

## Correções Propostas

### 1. Corrigir Consistência dos Filtros

Atualizar o `FornecedorGestaoCampoTab.tsx` para usar os mesmos filtros nos botões e formulários:

| Local | Atual | Correção |
|-------|-------|----------|
| Botão Galpão (linha 374) | `nucleos.length === 0` | `nucleosAtivos.length === 0` |
| Botão Lote (linha 455) | `galpoes.length === 0` | `galpoesAtivos.length === 0` |
| Aviso Galpão (linha 379) | `nucleos.length === 0` | `nucleosAtivos.length === 0` |
| Aviso Lote (linha 460) | `galpoes.length === 0` | `galpoesAtivos.length === 0` |

Adicionar variáveis para listas filtradas:
```typescript
const nucleosAtivos = nucleos.filter(n => n.ativo);
const galpoesAtivos = galpoes.filter(g => g.ativo);
```

### 2. Melhorar Mensagens de Orientação

Adicionar um card de orientação no topo da aba "Campo" quando não houver clientes cadastrados, indicando claramente que o usuário precisa:
1. Primeiro cadastrar clientes na aba "Clientes"
2. Depois voltar à aba "Campo" para criar a estrutura

### 3. Adicionar Link Direto

Incluir um link/botão na mensagem de aviso que leva o usuário diretamente para a aba de cadastro de clientes.

## Arquivos a Modificar

1. **`src/components/fornecedor/FornecedorGestaoCampoTab.tsx`**
   - Adicionar variáveis `nucleosAtivos` e `galpoesAtivos`
   - Corrigir condições de `disabled` nos botões
   - Corrigir condições de exibição dos avisos
   - Adicionar card de orientação inicial quando não há clientes

## Detalhes Técnicos

### Mudanças no FornecedorGestaoCampoTab.tsx

```typescript
// Adicionar após linha 141
const nucleosAtivos = nucleos.filter(n => n.ativo);
const galpoesAtivos = galpoes.filter(g => g.ativo);

// Linha 292 - Botão Núcleo (já está correto)
disabled={clientesAtivos.length === 0}

// Linha 374 - Botão Galpão (corrigir)
disabled={nucleosAtivos.length === 0}

// Linha 379 - Aviso Galpão (corrigir)
{nucleosAtivos.length === 0 && (...)}

// Linha 455 - Botão Lote (corrigir)
disabled={galpoesAtivos.length === 0}

// Linha 460 - Aviso Lote (corrigir)
{galpoesAtivos.length === 0 && (...)}
```

### Card de Orientação Inicial

Adicionar logo após os Dashboard Cards (após linha 202):

```tsx
{clientesAtivos.length === 0 && (
  <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
    <CardContent className="p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium text-amber-800 dark:text-amber-200">
            Configure seus clientes primeiro
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Para criar núcleos, galpões e lotes, você precisa ter pelo menos um cliente cadastrado. 
            Acesse a aba "Clientes" para cadastrar seu primeiro cliente.
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

## Resultado Esperado

Após as correções:

1. **Botões terão comportamento consistente**: Se não há núcleos ativos, não será possível criar galpões (e o form não terá opções vazias)
2. **Orientação clara**: Usuário saberá exatamente o que fazer para desbloquear o cadastro
3. **Fluxo intuitivo**: Card de orientação direciona o usuário para a aba correta

## Fluxo de Uso Correto

1. Usuário acessa aba **"Clientes"** → Cadastra cliente
2. Usuário acessa aba **"Campo"** → sub-aba **"Núcleos"** → Cadastra núcleo
3. Sub-aba **"Galpões"** → Cadastra galpão
4. Sub-aba **"Lotes"** → Cadastra lote com vendedor responsável
