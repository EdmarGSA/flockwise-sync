
# Plano: Cadastro de Produtos e Clientes Exclusivos do Fornecedor

## Resumo
Implementar funcionalidade para que fornecedores cadastrem seus próprios produtos (catálogo) e clientes (virtuais) no Portal do Fornecedor. Esses dados serão **exclusivos** do fornecedor e **não serão visíveis** para as organizações clientes nem serão usuários do sistema.

---

## Contexto Atual

### O que existe hoje:
- Fornecedores veem **produtos das organizações** via tabela `produto_fornecedor` (de-para)
- Fornecedores veem **parceiros das organizações** que os cadastraram como fornecedor
- Não existe catálogo próprio de produtos do fornecedor
- Não existem clientes virtuais exclusivos do fornecedor

### O que será criado:
- **Catálogo de Produtos do Fornecedor** - Produtos que o fornecedor vende
- **Clientes do Fornecedor** - Clientes externos que não são usuários do sistema

---

## Arquitetura de Dados

```text
┌─────────────────────────────────────────────────────────────┐
│                    PORTAL DO FORNECEDOR                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐    ┌─────────────────────────────┐│
│  │ produtos_catalogo_  │    │   clientes_fornecedor       ││
│  │ fornecedor          │    │                             ││
│  │                     │    │ • CNPJ/CPF                  ││
│  │ • nome              │    │ • Razão Social              ││
│  │ • SKU interno       │    │ • Endereço                  ││
│  │ • preço sugerido    │    │ • Contato                   ││
│  │ • unidade           │    │ • Limite crédito            ││
│  │ • categoria         │    │ • Status (ativo/inativo)    ││
│  └─────────────────────┘    └─────────────────────────────┘│
│                                                             │
│  Isolamento: fornecedor_global_id + RLS                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Fase 1: Migração de Banco de Dados

### Tabela: `clientes_fornecedor`
Armazena clientes virtuais do fornecedor (não são usuários do sistema).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| fornecedor_global_id | UUID | FK para fornecedores_globais |
| tipo_pessoa | ENUM | fisica / juridica |
| cpf_cnpj | TEXT | Documento único por fornecedor |
| razao_social_nome | TEXT | Nome/Razão Social |
| nome_fantasia | TEXT | Nome fantasia (opcional) |
| inscricao_estadual | TEXT | IE (opcional) |
| telefone | TEXT | Telefone principal |
| celular | TEXT | Celular/WhatsApp |
| email | TEXT | E-mail de contato |
| cep | TEXT | CEP |
| logradouro | TEXT | Endereço |
| numero | TEXT | Número |
| complemento | TEXT | Complemento |
| bairro | TEXT | Bairro |
| cidade | TEXT | Cidade |
| estado | TEXT | UF |
| codigo_ibge | TEXT | Código IBGE da cidade |
| limite_credito | NUMERIC | Limite de crédito em R$ |
| saldo_credito | NUMERIC | Saldo disponível |
| observacoes | TEXT | Observações gerais |
| ativo | BOOLEAN | Status ativo/inativo |
| created_at | TIMESTAMPTZ | Data criação |
| updated_at | TIMESTAMPTZ | Data atualização |

### Tabela: `produtos_catalogo_fornecedor`
Catálogo de produtos do fornecedor.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| fornecedor_global_id | UUID | FK para fornecedores_globais |
| codigo_interno | TEXT | SKU/código do fornecedor |
| nome | TEXT | Nome do produto |
| descricao | TEXT | Descrição detalhada |
| categoria | TEXT | Categoria livre |
| marca | TEXT | Marca do produto |
| unidade_venda | TEXT | UN, KG, SC, CX, etc. |
| preco_tabela | NUMERIC | Preço sugerido de venda |
| custo | NUMERIC | Custo interno (opcional) |
| codigo_barras | TEXT | EAN/GTIN (opcional) |
| ncm | TEXT | NCM fiscal (opcional) |
| estoque_proprio | NUMERIC | Estoque disponível |
| estoque_minimo | NUMERIC | Estoque mínimo para alerta |
| ativo | BOOLEAN | Status ativo/inativo |
| created_at | TIMESTAMPTZ | Data criação |
| updated_at | TIMESTAMPTZ | Data atualização |

### Políticas RLS
- **SELECT/INSERT/UPDATE/DELETE**: Apenas registros onde `fornecedor_global_id = get_my_fornecedor_global_id()`
- Isolamento total entre fornecedores

---

## Fase 2: Componentes do Frontend

### 2.1 Nova Tab: "Meus Produtos"
Adicionar ao PortalFornecedor uma aba para gerenciar o catálogo próprio.

**Componente:** `FornecedorCatalogoTab.tsx`

**Funcionalidades:**
- Listar produtos do catálogo com busca e filtros
- Botão "Novo Produto" abre formulário
- Edição inline ou em dialog
- Indicador de estoque baixo
- Exportar catálogo (futuro)

### 2.2 Nova Tab: "Meus Clientes"
Adicionar ao PortalFornecedor uma aba para gerenciar clientes virtuais.

**Componente:** `FornecedorClientesTab.tsx`

**Funcionalidades:**
- Listar clientes com busca por nome/CNPJ
- Botão "Novo Cliente" com formulário completo
- Edição de cliente existente
- Visualização de limite/saldo de crédito
- Consulta automática CNPJ via BrasilAPI

### 2.3 Atualização do Portal
- Adicionar tabs "Catálogo" e "Meus Clientes" ao menu
- Atualizar contadores no dashboard

---

## Fase 3: Hook de Dados

### Atualizar `useFornecedorData.tsx`

Adicionar:
```typescript
// Novos estados
const [produtosCatalogo, setProdutosCatalogo] = useState([]);
const [meusClientes, setMeusClientes] = useState([]);

// Novas funções
const fetchCatalogoProdutos = async (globalId) => {...}
const fetchMeusClientes = async (globalId) => {...}
const criarProdutoCatalogo = async (produto) => {...}
const criarCliente = async (cliente) => {...}
const atualizarCliente = async (id, dados) => {...}
```

---

## Arquivos a Criar/Modificar

### Novos Arquivos:
1. `supabase/migrations/XXXX_clientes_produtos_fornecedor.sql`
2. `src/components/fornecedor/FornecedorCatalogoTab.tsx`
3. `src/components/fornecedor/FornecedorClientesTab.tsx`
4. `src/components/fornecedor/ClienteFornecedorForm.tsx`
5. `src/components/fornecedor/ProdutoCatalogoForm.tsx`

### Arquivos a Modificar:
1. `src/pages/PortalFornecedor.tsx` - Adicionar novas tabs
2. `src/hooks/useFornecedorData.tsx` - Adicionar funções para novas entidades
3. `src/integrations/supabase/types.ts` - Atualizado automaticamente

---

## Detalhes Técnicos

### SQL da Migração (Resumo)

```sql
-- Tabela de Clientes do Fornecedor
CREATE TABLE public.clientes_fornecedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_global_id UUID NOT NULL REFERENCES fornecedores_globais(id),
  tipo_pessoa TEXT NOT NULL DEFAULT 'juridica',
  cpf_cnpj TEXT NOT NULL,
  razao_social_nome TEXT NOT NULL,
  ...
  UNIQUE(fornecedor_global_id, cpf_cnpj)
);

-- Tabela de Catálogo de Produtos
CREATE TABLE public.produtos_catalogo_fornecedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_global_id UUID NOT NULL REFERENCES fornecedores_globais(id),
  codigo_interno TEXT NOT NULL,
  nome TEXT NOT NULL,
  ...
  UNIQUE(fornecedor_global_id, codigo_interno)
);

-- RLS para isolamento total
ALTER TABLE clientes_fornecedor ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fornecedor vê próprios clientes"
  ON clientes_fornecedor FOR ALL
  USING (fornecedor_global_id = get_my_fornecedor_global_id());
```

---

## Benefícios

1. **Isolamento Total**: Dados exclusivos do fornecedor, invisíveis para organizações
2. **Sem Conflito**: Clientes virtuais não interferem com parceiros das organizações
3. **Catálogo Próprio**: Fornecedor gerencia seus produtos independentemente
4. **Preparação ERP**: Estrutura pronta para sincronização com ERP local
5. **Gestão de Crédito**: Controle de limite/saldo por cliente

---

## Resultado Esperado

Após implementação, o fornecedor terá no portal:

| Tab | Funcionalidade |
|-----|----------------|
| Dashboard | Estatísticas gerais |
| Estoque | Estoque nos clientes (organizações) |
| Pedidos | OCs recebidas das organizações |
| Preços | Histórico de alterações |
| **Catálogo** | 🆕 Meus produtos para venda |
| **Meus Clientes** | 🆕 Clientes virtuais externos |
| Configurações | Senha e dados |
