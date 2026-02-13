

## Barra de Cotacoes de Commodities na Fabrica de Racao

Adicionar uma barra horizontal rolavel (ticker) logo abaixo do header da pagina Fabrica de Racao, exibindo:

1. **Cotacoes de commodities** (Milho, Farelo de Soja, Sorgo, Milheto) vindas de uma API externa
2. **Precos da ultima compra** dos produtos do grupo "Cereais" cadastrados no sistema

---

### Fonte de Dados - Cotacoes

Sera usada a API **Commoditic** (commoditic.com), que cobre Corn, Soybeans/Soybean Meal, Sorghum e Millet a um custo acessivel (~$7/mes). A chamada sera feita via Edge Function para proteger a API key.

**Alternativa sem custo**: caso o usuario prefira nao contratar uma API, a barra mostrara apenas os precos da ultima compra do sistema (sem cotacoes externas). A barra funcionara independentemente da API.

---

### Alteracoes

**1. Edge Function: `commodity-prices`** (`supabase/functions/commodity-prices/index.ts`)

- Recebe o `integrado_id` como parametro
- Busca cotacoes da API Commoditic (Corn, Soybean Meal, Sorghum, Millet) com cache de 1h (armazena em memoria para evitar chamadas excessivas)
- Busca no banco os precos da ultima compra (OC com status `aprovada` ou `recebida`) dos produtos cujo grupo de produto contenha "cereal" ou "cereais"
  - Join: `ordens_compra_itens` -> `ordens_compra` (para status e data) -> `produtos` -> `grupos_produto` (para filtrar por nome)
  - Agrupa por produto, pega o mais recente
- Retorna JSON com dois arrays: `cotacoes` (da API) e `ultimaCompra` (do banco)
- Se a API key nao estiver configurada, retorna `cotacoes: []` (graceful fallback)

**2. Novo componente: `CommodityTicker.tsx`** (`src/components/fabrica/CommodityTicker.tsx`)

- Barra horizontal com animacao CSS de scroll infinito (marquee)
- Exibe os itens lado a lado com separadores
- Cada item mostra: nome da commodity, preco, unidade (R$/ton ou R$/kg)
- Os precos da ultima compra aparecem com badge "Ult. Compra" para diferenciar das cotacoes de mercado
- Cores: verde se o preco interno esta abaixo da cotacao de mercado, vermelho se acima
- Fallback: se nao houver dados, a barra nao aparece

**3. Integracao na pagina** (`src/pages/FabricaRacao.tsx`)

- Importar e renderizar `CommodityTicker` entre o header fixo e o conteudo principal (dentro do `<main>`, antes das `<Tabs>`)
- Passar `integradoId` como prop
- A barra tera altura fixa (~40px) e fundo sutil para se destacar

### Secret necessario

- `COMMODITIC_API_KEY`: chave da API Commoditic. Sera solicitada ao usuario antes de implementar. Se nao fornecida, a barra funcionara apenas com precos internos.

### Visual da barra

```text
|  Milho CBOT: $4.30/bu  |  F. Soja: $310/ton  |  Sorgo: $280/ton  |  Milheto: $250/ton  |  Milho (Ult. Compra): R$1,85/kg  |  F. Soja (Ult. Compra): R$2,40/kg  |
```

A barra rola continuamente da direita para a esquerda, estilo ticker de bolsa de valores.

