

# Plano: Puxar Linhagem e Sexo das Tabelas de Desempenho

## Resumo

Atualizar o formulário de novo lote no Portal do Fornecedor para buscar dinamicamente as opções de **Linhagem** e **Sexo** a partir das tabelas de referência `desempenho_aves` (aves de corte) e `desempenho_postura` (aves de postura), ao invés de usar listas fixas no código.

---

## Dados Disponíveis no Banco

### Tabela `desempenho_aves` (Corte)

| Linhagem | Sexo |
|----------|------|
| cobb_500 | macho, femea, misto |
| ross_308 | macho, femea, misto |

### Tabela `desempenho_postura` (Postura)

| Linhagem |
|----------|
| lohmann_brown_lite |
| lohmann_lsl_lite |

Para postura, o sexo é sempre **fêmea**.

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    FORMULÁRIO NOVO LOTE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Select "Tipo de Produção"                                       │
│     └── Corte | Postura                                             │
│                                                                     │
│  2. Select "Linhagem" (dinâmico)                                    │
│     └── Se Corte → busca de desempenho_aves                         │
│     └── Se Postura → busca de desempenho_postura                    │
│                                                                     │
│  3. Select "Sexo" (dinâmico)                                        │
│     └── Se Corte → busca de desempenho_aves                         │
│     └── Se Postura → fixo "fêmea" (desabilitado)                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Mudanças Necessárias

### 1. Adicionar campo `tipo_producao` na tabela `lotes_fornecedor`

Para diferenciar lotes de corte e postura:

```sql
ALTER TABLE public.lotes_fornecedor
  ADD COLUMN IF NOT EXISTS tipo_producao TEXT DEFAULT 'corte';
```

### 2. Atualizar `LoteFornecedorForm.tsx`

| Mudança | Descrição |
|---------|-----------|
| Novo estado `tipoProducao` | Controla se é 'corte' ou 'postura' |
| Novo estado `linhagensBanco` | Lista de linhagens do banco |
| Novo estado `sexosBanco` | Lista de sexos do banco |
| Hook `useEffect` para buscar dados | Ao mudar tipo de produção, busca linhagens/sexos |
| Remover constante `LINHAGENS` | Substituir por dados dinâmicos |
| Select de Tipo de Produção | Novo campo antes de Linhagem |
| Desabilitar Sexo se Postura | Fixar como 'femea' automaticamente |

---

## Detalhes Técnicos

### Queries para buscar dados

```typescript
// Para Corte
const { data: corteData } = await supabase
  .from('desempenho_aves')
  .select('linhagem, sexo')
  .order('linhagem');

// Extrair valores únicos
const linhagens = [...new Set(corteData.map(d => d.linhagem))];
const sexos = [...new Set(corteData.map(d => d.sexo))];
```

```typescript
// Para Postura
const { data: posturaData } = await supabase
  .from('desempenho_postura')
  .select('linhagem')
  .order('linhagem');

// Extrair valores únicos
const linhagens = [...new Set(posturaData.map(d => d.linhagem))];
// Sexo fixo: 'femea'
```

### Mapeamento de Labels

```typescript
const LINHAGEM_LABELS: Record<string, string> = {
  // Corte
  cobb_500: 'Cobb 500',
  ross_308: 'Ross 308',
  hubbard: 'Hubbard',
  // Postura
  lohmann_brown_lite: 'Lohmann Brown-Lite',
  lohmann_lsl_lite: 'Lohmann LSL-Lite',
  hy_line_brown: 'Hy-Line Brown',
  hy_line_w36: 'Hy-Line W-36',
  isa_brown: 'ISA Brown',
  novogen_brown: 'Novogen Brown',
  dekalb_white: 'Dekalb White',
  bovans_brown: 'Bovans Brown',
  hisex_white: 'Hisex White',
};

const SEXO_LABELS: Record<string, string> = {
  macho: 'Macho',
  femea: 'Fêmea',
  misto: 'Misto',
};
```

### Novo layout do formulário

```tsx
<div className="grid grid-cols-3 gap-4">
  {/* Tipo de Produção */}
  <FormField
    name="tipo_producao"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Tipo de Produção</FormLabel>
        <Select onValueChange={(value) => {
          field.onChange(value);
          // Resetar linhagem e sexo ao mudar tipo
          form.setValue('linhagem', '');
          form.setValue('sexo', value === 'postura' ? 'femea' : 'misto');
        }} value={field.value}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="corte">Corte</SelectItem>
            <SelectItem value="postura">Postura</SelectItem>
          </SelectContent>
        </Select>
      </FormItem>
    )}
  />

  {/* Linhagem - dinâmico */}
  <FormField
    name="linhagem"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Linhagem</FormLabel>
        <Select onValueChange={field.onChange} value={field.value}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            {linhagensBanco.map((l) => (
              <SelectItem key={l} value={l}>
                {LINHAGEM_LABELS[l] || l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormItem>
    )}
  />

  {/* Sexo - dinâmico/fixo */}
  <FormField
    name="sexo"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Sexo</FormLabel>
        <Select 
          onValueChange={field.onChange} 
          value={field.value}
          disabled={tipoProducao === 'postura'}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {sexosBanco.map((s) => (
              <SelectItem key={s} value={s}>
                {SEXO_LABELS[s] || s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {tipoProducao === 'postura' && (
          <p className="text-xs text-muted-foreground">
            Lotes de postura são sempre fêmea
          </p>
        )}
      </FormItem>
    )}
  />
</div>
```

---

## Arquivos a Modificar

| # | Arquivo | Descrição |
|---|---------|-----------|
| 1 | `supabase/migrations/` | Adicionar coluna `tipo_producao` em `lotes_fornecedor` |
| 2 | `src/components/fornecedor/LoteFornecedorForm.tsx` | Busca dinâmica de linhagens/sexos + novo campo tipo |
| 3 | `src/components/fornecedor/FornecedorGestaoCampoTab.tsx` | Exibir tipo de produção na listagem (opcional) |

---

## Fluxo de Uso

1. Usuário abre formulário "Novo Lote"
2. Seleciona **Tipo de Produção**: Corte ou Postura
3. Sistema busca linhagens disponíveis no banco
4. Seleciona **Linhagem** (opções filtradas pelo tipo)
5. Se Corte: seleciona **Sexo** (macho, fêmea, misto)
6. Se Postura: **Sexo** já está fixado como fêmea (desabilitado)
7. Preenche demais campos e salva

---

## Benefícios

| Benefício | Descrição |
|-----------|-----------|
| Dados centralizados | Linhagens vêm do banco, não do código |
| Escalabilidade | Novas linhagens adicionadas ao banco aparecem automaticamente |
| Consistência | Mesmos valores usados para cálculos de desempenho |
| UX intuitiva | Sexo fixo para postura evita erros |

