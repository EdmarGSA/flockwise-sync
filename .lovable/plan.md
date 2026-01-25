
# Plano: Mini-ERP de Gestão de Campo para Fornecedor

## Resumo
Implementar estrutura completa de gestão de campo no Portal do Fornecedor, espelhando a estrutura da integradora, onde:
- **Fornecedor** = Integradora
- **Clientes do Fornecedor** = Integrados (produtores)
- **Vendedores do Fornecedor** = Veterinários (responsáveis técnicos)

Isso permitirá ao fornecedor cadastrar e acompanhar núcleos, galpões e lotes de seus clientes virtuais.

---

## Arquitetura de Dados

```text
┌───────────────────────────────────────────────────────────────────────────────┐
│                        PORTAL DO FORNECEDOR - GESTÃO CAMPO                    │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────┐                                                  │
│  │ vendedores_fornecedor   │ ← Funcionários/Representantes do fornecedor      │
│  │ • nome                  │                                                  │
│  │ • email / telefone      │                                                  │
│  │ • região                │                                                  │
│  │ • ativo                 │                                                  │
│  └─────────────────────────┘                                                  │
│             │                                                                 │
│             ▼                                                                 │
│  ┌─────────────────────────┐     ┌─────────────────────────┐                  │
│  │ nucleos_fornecedor      │────▶│ galpoes_fornecedor      │                  │
│  │ • cliente_fornecedor_id │     │ • nucleo_fornecedor_id  │                  │
│  │ • nome                  │     │ • nome                  │                  │
│  │ • cidade / estado       │     │ • capacidade_aves       │                  │
│  │ • tipo_producao         │     │ • ativo                 │                  │
│  └─────────────────────────┘     └───────────┬─────────────┘                  │
│                                              │                                │
│                                              ▼                                │
│                               ┌─────────────────────────────┐                 │
│                               │ lotes_fornecedor            │                 │
│                               │ • galpao_fornecedor_id      │                 │
│                               │ • vendedor_fornecedor_id    │ ← Responsável   │
│                               │ • quantidade_aves           │                 │
│                               │ • linhagem                  │                 │
│                               │ • data_alojamento           │                 │
│                               │ • status                    │                 │
│                               │ • semana_atual              │ ← Calculado     │
│                               └─────────────────────────────┘                 │
│                                                                               │
│  Isolamento: fornecedor_global_id + RLS em todas as tabelas                   │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Fase 1: Migração de Banco de Dados

### Tabela 1: `vendedores_fornecedor`
Cadastro de vendedores/representantes do fornecedor (equivalente a veterinários).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| fornecedor_global_id | UUID | FK para fornecedores_globais |
| nome | TEXT | Nome completo |
| email | TEXT | E-mail (opcional) |
| telefone | TEXT | Telefone/WhatsApp |
| regiao | TEXT | Região de atuação |
| codigo_vendedor | TEXT | Código interno |
| ativo | BOOLEAN | Status |
| observacoes | TEXT | Observações |
| created_at / updated_at | TIMESTAMPTZ | Timestamps |

### Tabela 2: `nucleos_fornecedor`
Unidades de produção dos clientes do fornecedor.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| fornecedor_global_id | UUID | FK para fornecedores_globais |
| cliente_fornecedor_id | UUID | FK para clientes_fornecedor |
| nome | TEXT | Nome do núcleo |
| cidade | TEXT | Cidade |
| estado | TEXT | UF |
| cep | TEXT | CEP |
| tipo_producao | TEXT | 'corte' ou 'postura' |
| ativo | BOOLEAN | Status |
| observacoes | TEXT | Observações |
| created_at / updated_at | TIMESTAMPTZ | Timestamps |

### Tabela 3: `galpoes_fornecedor`
Galpões dentro dos núcleos.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| fornecedor_global_id | UUID | FK para fornecedores_globais |
| nucleo_fornecedor_id | UUID | FK para nucleos_fornecedor |
| nome | TEXT | Nome/número do galpão |
| capacidade_aves | INTEGER | Capacidade máxima |
| comprimento | DECIMAL | Metros |
| largura | DECIMAL | Metros |
| ativo | BOOLEAN | Status |
| observacoes | TEXT | Observações |
| created_at / updated_at | TIMESTAMPTZ | Timestamps |

### Tabela 4: `lotes_fornecedor`
Lotes de aves nos galpões dos clientes.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| fornecedor_global_id | UUID | FK para fornecedores_globais |
| nucleo_fornecedor_id | UUID | FK para nucleos_fornecedor |
| galpao_fornecedor_id | UUID | FK para galpoes_fornecedor |
| vendedor_fornecedor_id | UUID | FK para vendedores_fornecedor (responsável) |
| quantidade_aves | INTEGER | Quantidade inicial |
| linhagem | TEXT | Linhagem das aves |
| data_alojamento | DATE | Data de alojamento |
| data_prevista_saida | DATE | Previsão de abate/fim |
| status | TEXT | 'previsao', 'alojado', 'fechado' |
| semana_atual | INTEGER | Semana de vida (calculado) |
| sexo | TEXT | 'macho', 'femea', 'misto' |
| observacoes | TEXT | Observações |
| created_at / updated_at | TIMESTAMPTZ | Timestamps |

### Políticas RLS
Todas as tabelas terão RLS com:
```sql
USING (fornecedor_global_id = get_my_fornecedor_global_id())
```

---

## Fase 2: Componentes do Frontend

### 2.1 Nova Tab: "Gestão de Campo"
Adicionar tab principal com sub-navegação interna.

**Componente:** `FornecedorGestaoCampoTab.tsx`

**Sub-tabs internas:**
- **Vendedores** - CRUD de vendedores
- **Núcleos** - CRUD de núcleos por cliente
- **Galpões** - CRUD de galpões por núcleo
- **Lotes** - CRUD de lotes com vendedor responsável

### 2.2 Formulários de Cadastro

| Componente | Função |
|------------|--------|
| `VendedorFornecedorForm.tsx` | Cadastro de vendedores |
| `NucleoFornecedorForm.tsx` | Cadastro de núcleos |
| `GalpaoFornecedorForm.tsx` | Cadastro de galpões |
| `LoteFornecedorForm.tsx` | Cadastro de lotes |

### 2.3 Tabelas de Listagem

| Componente | Função |
|------------|--------|
| `VendedoresFornecedorTable.tsx` | Lista vendedores |
| `NucleosFornecedorTable.tsx` | Lista núcleos com filtro por cliente |
| `GalpoesFornecedorTable.tsx` | Lista galpões com filtro por núcleo |
| `LotesFornecedorTable.tsx` | Lista lotes com indicadores |

### 2.4 Dashboard de Gestão
Cards resumo mostrando:
- Total de clientes ativos
- Total de núcleos
- Total de lotes ativos
- Lotes por fase (previsão/alojado)
- Vendedores ativos

---

## Fase 3: Hook de Dados

### Atualizar `useFornecedorData.tsx`

Adicionar estados:
```typescript
const [vendedores, setVendedores] = useState([]);
const [nucleosFornecedor, setNucleosFornecedor] = useState([]);
const [galpoesFornecedor, setGalpoesFornecedor] = useState([]);
const [lotesFornecedor, setLotesFornecedor] = useState([]);
```

Adicionar funções:
```typescript
// Vendedores
fetchVendedores(globalId)
criarVendedor(vendedor)
atualizarVendedor(id, dados)

// Núcleos
fetchNucleosFornecedor(globalId, clienteFilter?)
criarNucleoFornecedor(nucleo)

// Galpões
fetchGalpoesFornecedor(globalId, nucleoFilter?)
criarGalpaoFornecedor(galpao)

// Lotes
fetchLotesFornecedor(globalId, filtros?)
criarLoteFornecedor(lote)
atualizarLoteFornecedor(id, dados)
```

---

## Arquivos a Criar/Modificar

### Novos Arquivos (10 arquivos):
1. `supabase/migrations/XXXX_gestao_campo_fornecedor.sql`
2. `src/components/fornecedor/FornecedorGestaoCampoTab.tsx`
3. `src/components/fornecedor/VendedorFornecedorForm.tsx`
4. `src/components/fornecedor/NucleoFornecedorForm.tsx`
5. `src/components/fornecedor/GalpaoFornecedorForm.tsx`
6. `src/components/fornecedor/LoteFornecedorForm.tsx`
7. `src/components/fornecedor/VendedoresFornecedorTable.tsx`
8. `src/components/fornecedor/NucleosFornecedorTable.tsx`
9. `src/components/fornecedor/GalpoesFornecedorTable.tsx`
10. `src/components/fornecedor/LotesFornecedorTable.tsx`

### Arquivos a Modificar (2 arquivos):
1. `src/pages/PortalFornecedor.tsx` - Adicionar tab "Gestão Campo"
2. `src/hooks/useFornecedorData.tsx` - Adicionar funções e estados

---

## Detalhes Técnicos

### SQL da Migração (Resumo)

```sql
-- Vendedores do Fornecedor
CREATE TABLE public.vendedores_fornecedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_global_id UUID NOT NULL REFERENCES fornecedores_globais(id),
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  regiao TEXT,
  codigo_vendedor TEXT,
  ativo BOOLEAN DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(fornecedor_global_id, codigo_vendedor)
);

-- Núcleos do Fornecedor
CREATE TABLE public.nucleos_fornecedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_global_id UUID NOT NULL REFERENCES fornecedores_globais(id),
  cliente_fornecedor_id UUID NOT NULL REFERENCES clientes_fornecedor(id),
  nome TEXT NOT NULL,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  tipo_producao TEXT DEFAULT 'corte',
  ativo BOOLEAN DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Galpões do Fornecedor
CREATE TABLE public.galpoes_fornecedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_global_id UUID NOT NULL REFERENCES fornecedores_globais(id),
  nucleo_fornecedor_id UUID NOT NULL REFERENCES nucleos_fornecedor(id),
  nome TEXT NOT NULL,
  capacidade_aves INTEGER DEFAULT 0,
  comprimento DECIMAL(10,2),
  largura DECIMAL(10,2),
  ativo BOOLEAN DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Lotes do Fornecedor
CREATE TABLE public.lotes_fornecedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_global_id UUID NOT NULL REFERENCES fornecedores_globais(id),
  nucleo_fornecedor_id UUID NOT NULL REFERENCES nucleos_fornecedor(id),
  galpao_fornecedor_id UUID NOT NULL REFERENCES galpoes_fornecedor(id),
  vendedor_fornecedor_id UUID REFERENCES vendedores_fornecedor(id),
  quantidade_aves INTEGER NOT NULL,
  linhagem TEXT,
  data_alojamento DATE,
  data_prevista_saida DATE,
  status TEXT DEFAULT 'previsao',
  sexo TEXT DEFAULT 'misto',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS em todas as tabelas
ALTER TABLE vendedores_fornecedor ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fornecedor CRUD vendedores" ON vendedores_fornecedor
  FOR ALL USING (fornecedor_global_id = get_my_fornecedor_global_id());

-- (repetir para as demais tabelas)
```

---

## Resultado Esperado

Após implementação, o Portal do Fornecedor terá:

| Tab | Funcionalidade |
|-----|----------------|
| Dashboard | Estatísticas gerais + gestão campo |
| Estoque | Estoque nos clientes (organizações) |
| Pedidos | OCs recebidas |
| Preços | Histórico de alterações |
| Catálogo | Meus produtos |
| Clientes | Clientes virtuais |
| **Gestão Campo** | **Vendedores + Núcleos + Galpões + Lotes** |
| Configurações | Senha e dados |

### Fluxo de Uso

1. Fornecedor cadastra **Vendedores** (equipe de vendas/técnica)
2. Para cada **Cliente** cadastrado, cria **Núcleos** (granjas)
3. Para cada **Núcleo**, cadastra **Galpões** (aviários)
4. Para cada **Galpão**, registra **Lotes** com vendedor responsável
5. Acompanha indicadores de semana, status e performance

---

## Benefícios

1. **Visão completa**: Fornecedor gerencia toda cadeia produtiva dos clientes
2. **Previsão de vendas**: Lotes em andamento indicam demanda futura
3. **Responsabilidade**: Cada lote tem vendedor responsável
4. **Independência**: Dados isolados, sem interferir no sistema principal
5. **Escalabilidade**: Estrutura preparada para métricas e desempenho
