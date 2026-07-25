# Fechamento de Lote com dados do frigorífico (RIPI)

O PDF enviado é um **RIPI da Seara — Demonstrativo de Resultado do Lote 2602**. Ele traz cinco blocos de informação que hoje o sistema não guarda por completo:

1. **Alojamento x Abate** — 23.100 alojadas / 21.215 abatidas, 64.130 kg, peso médio 3,023 kg, idade 48,4 dias, GPD 62,46, IEE 280, IEP 301, peso projetado 2,944.
2. **Desempenho** — conversão prevista 1,6780, real 1,9071, ajustada 1,8506, viabilidade 91,84%, mortalidade real 8,16% x prevista 8,62%, calo de pata previsto 20% x real 4,2%.
3. **Partilha do integrado** — preço do kg 4,7418, valor ração 1,20, percentual básico 8,4%, avaliações (conversão −2,839; condenação 0,015; calo 0,177; check-list 0,615), resultado bruto 6,368% = R$ 19.365,99.
4. **Valores** — descontos (financiamento, funrural, juros, senar) e líquido a depositar R$ 16.917,85.
5. **Detalhamento** — lotes de matriz/incubatório, tabela semanal (peso, mortos, descartados), movimentação de ração por entrega, 5 cargas de abate com nota do produtor, histórico dos 3 últimos lotes e condenações SIF por código (FT 380 / FP 249 com causas: aerossaculite, septicemia, celulite, etc.).

O que já existe: tabela `fechamento_lotes` com os indicadores zootécnicos básicos e o `FechamentoLoteDialog` que calcula CA, CA ajustada, IEP, IEE e viabilidade. Falta todo o lado do frigorífico, condenações detalhadas, cargas e a parte financeira.

## O que será construído

### Etapa 1 — Base de dados
Novas colunas em `fechamento_lotes` (dados do cabeçalho e da partilha):
- Abate: data média de abate, hora média, peso recebido, tipo de produto, abatedouro, número do lote da integradora, técnico responsável.
- Previstos x reais: conversão prevista, % condenação previsto/real, % calo de pata previsto/real, mortalidade prevista.
- Partilha: preço do kg do frango, valor da ração, percentual básico, avaliação de conversão, condenação, calo de patas, check-list, resultado bruto (% / kg / R$ / R$ por cabeça).
- Financeiro: renda bruta, valor da nota, total a depositar.

Novas tabelas ligadas ao fechamento:
- `fechamento_cargas` — cada carga de abate (abatedouro, data, quantidade, peso total, peso médio, nota do produtor).
- `fechamento_condenacoes` — condenações SIF por código (tipo FT/FP, código, descrição, quantidade, %).
- `fechamento_descontos` — linhas de débito/crédito do bloco Valores.
- `fechamento_origem_pintos` — lote de matriz, idade, linhagem, incubatório, peso do pinto, quantidade.

Todas com isolamento por organização (mesma regra das demais tabelas: o usuário só vê e edita dados da própria granja) e permissões explícitas.

### Etapa 2 — Formulário de fechamento ampliado
Reformular o `FechamentoLoteDialog` em abas:
- **Abate** — data/hora média, aves abatidas, peso recebido, tipo de produto, abatedouro, idade e peso projetado.
- **Cargas** — lista editável das cargas com nota do produtor; totais somados automaticamente e usados como peso total/aves abatidas.
- **Condenações** — condenações totais e parciais, calo de pata, e lista de causas SIF com quantidade (percentual calculado sozinho).
- **Partilha** — preço do kg, valor da ração, percentuais de avaliação e descontos; cálculo automático do resultado bruto, renda bruta e valor a depositar (somente registro/visualização, sem lançar no Financeiro).
- **Resumo** — todos os indicadores calculados (CA real, CA ajustada, viabilidade, GPD, IEP, IEE) como já hoje, mais os novos.

### Etapa 3 — Painel de divergências (Sistema x Frigorífico)
Card no resumo do fechamento comparando o que o sistema registrou com o oficial:

```text
Indicador          Sistema     RIPI/Frigorífico   Diferença
Ração consumida    120.400 kg  122.302 kg         +1.902 kg  (+1,6%)
Mortalidade        7,9%        8,16%              +0,26 pp
Peso médio         2,98 kg     3,023 kg           +0,043 kg
Aves abatidas      21.300      21.215             -85
```

Fontes internas: movimentações de ração do lote, registros de mortalidade/descarte, pesagens do galpão e aves vivas calculadas. Diferenças acima de um limite configurável ficam marcadas em destaque, com explicação (ex.: “ração do RIPI inclui sobra de lote anterior”).

### Etapa 4 — Tela de resultado do lote
Página de visualização do fechamento (acessível pelo lote encerrado) reproduzindo o RIPI em formato digital: cabeçalho, desempenho previsto x real, partilha, cargas, condenações por causa e comparativo com os últimos lotes da própria granja (equivalente ao bloco “Histórico dos últimos lotes”).

### Etapa 5 — Importação do PDF (fase seguinte)
Depois do formulário pronto: upload do PDF do RIPI, extração dos campos por função no servidor e preenchimento do formulário para conferência antes de salvar. Fica como etapa separada, a ser implementada após a validação do formulário.

## Detalhes técnicos

- Migrações: `ALTER TABLE fechamento_lotes` + 4 tabelas filhas com `fechamento_id` referenciando o fechamento, RLS herdando o `integrado_id` do pai (padrão já usado no projeto) e GRANTs para `authenticated`/`service_role`.
- Cálculos centralizados em `src/lib/utils/fechamentoRipi.ts` (partilha, percentuais de condenação, divergências) com testes unitários em vitest, seguindo o padrão de `analiseMortalidade.ts`.
- Componentes novos em `src/components/lotes/fechamento/`: `AbaAbate`, `AbaCargas`, `AbaCondenacoes`, `AbaPartilha`, `PainelDivergencias`, `ResultadoLoteView`.
- Pesos sempre em kg e idade em dias, conforme o padrão do sistema; valores monetários em `numeric(14,4)` para preservar as 4 casas do preço do kg.
- Nenhum lançamento automático em contas a receber nesta fase.
