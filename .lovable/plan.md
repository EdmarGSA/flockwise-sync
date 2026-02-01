
# Plano: Entrada Manual de Ovos com Lote de Producao Obrigatorio

## Objetivo

Modificar o formulario de entrada manual de ovos no modulo Estoque de Ovos para exigir a selecao obrigatoria de um lote de criacao de aves poedeiras, garantindo rastreabilidade completa da origem dos ovos.

## Situacao Atual

O formulario atual (`EstoqueOvos.tsx`, linhas 344-440) permite criar entradas manuais de ovos sem vincular a um lote de producao:
- Tipo de ovo
- Classificacao de peso
- Data producao / validade
- Quantidade
- Custo unitario
- Observacoes

O campo `lote_producao_id` existe na tabela `estoque_ovos` mas nao e preenchido na entrada manual.

## Arquitetura da Solucao

```text
+-------------------------------------------+
|     Dialog: Nova Entrada de Ovos          |
+-------------------------------------------+
|                                           |
|  [1] Selecionar Lote de Postura *         |
|      +------------------------------+     |
|      | Galpao 01 - Nucleo Sul       |     |
|      | 12.500 aves | LSL Classic    |     |
|      +------------------------------+     |
|                                           |
|  [2] Tipo de Ovo (inferido da linhagem)   |
|  [3] Classificacao de Peso                |
|  [4] Data Producao / Validade             |
|  [5] Quantidade / Custo                   |
|                                           |
+-------------------------------------------+
```

## Implementacao

### Fase 1: Modificar Estado do Formulario

Adicionar ao estado do componente:
- `lotesPostura`: Array de lotes ativos de nucleos com tipo_producao = 'postura'
- `selectedLoteId`: ID do lote selecionado
- `loadingLotes`: Estado de carregamento

Adicionar ao `formData`:
- `lote_producao_id`: string (obrigatorio)

### Fase 2: Buscar Lotes de Postura

Criar funcao para buscar lotes ativos de nucleos de postura:

```typescript
const fetchLotesPostura = async () => {
  const { data } = await supabase
    .from('lotes')
    .select(`
      id,
      quantidade_aves,
      linhagem_postura,
      data_alojamento,
      galpao:galpoes(nome),
      nucleo:nucleos!inner(nome, tipo_producao)
    `)
    .eq('integrado_id', user?.id)
    .eq('status', 'alojado')
    .ilike('nucleo.tipo_producao', '%postura%')
    .order('created_at', { ascending: false });
};
```

### Fase 3: Adicionar Select de Lote ao Formulario

Inserir campo Select antes do tipo de ovo:
- Listar lotes de postura ativos
- Exibir: Nome galpao + Nome nucleo + Quantidade aves + Linhagem
- Ao selecionar, inferir automaticamente o tipo de ovo baseado na linhagem

### Fase 4: Inferencia de Tipo de Ovo

Quando um lote for selecionado, inferir automaticamente o tipo de ovo:
- Linhagem com "LSL", "White", "Branco" = Branco
- Linhagem com "Brown", "Marrom" = Castanho
- Demais = Castanho (padrao)

### Fase 5: Validacao e Persistencia

Modificar a funcao `handleSubmit`:
- Validar que `lote_producao_id` foi selecionado
- Incluir `lote_producao_id` no insert de `estoque_ovos`
- Atualizar observacao no kardex para incluir referencia ao lote

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/pages/EstoqueOvos.tsx` | Adicionar busca de lotes, campo Select, logica de inferencia |

## Mudancas no Formulario

### Estado Adicional
```typescript
const [lotesPostura, setLotesPostura] = useState<LotePostura[]>([]);
const [loadingLotes, setLoadingLotes] = useState(false);
```

### FormData Atualizado
```typescript
const [formData, setFormData] = useState({
  lote_producao_id: '',  // NOVO - Obrigatorio
  tipo_ovo: '',
  classificacao_peso: '',
  data_producao: format(new Date(), 'yyyy-MM-dd'),
  data_validade: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
  quantidade: 0,
  custo_unitario: 0,
  observacoes: '',
});
```

### Novo Campo no Formulario
```text
+------------------------------------+
| Lote de Producao *                 |
| [ Selecione o lote de postura  v]  |
|   - Galpao 01 (Nucleo Sul)         |
|     12.500 aves | LSL Classic      |
|   - Galpao 02 (Nucleo Norte)       |
|     8.000 aves | Hy-Line Brown     |
+------------------------------------+
```

## Beneficios

| Beneficio | Descricao |
|-----------|-----------|
| Rastreabilidade | Cada entrada de ovos vinculada ao lote de origem |
| Consistencia | Tipo de ovo inferido automaticamente da linhagem |
| Controle | Apenas lotes ativos de postura sao exibidos |
| Integracao | Dados consistentes com o fluxo de transferencia de producao |

## Casos de Borda

| Cenario | Tratamento |
|---------|------------|
| Nenhum lote de postura ativo | Exibir mensagem informativa e desabilitar cadastro |
| Linhagem nao reconhecida | Usar "Castanho" como padrao, permitir alteracao manual |
| Usuario muda tipo de ovo apos selecao | Permitir, pois usuario pode ter ovos de cor diferente |
