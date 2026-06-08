# Análise avançada de peso na mortalidade semanal

Hoje, ao clicar no card da semana em **Mortalidade**, o `MortalidadeSemanaDetalheDialog` mostra apenas total, % vs meta, motivos e quebra por dia. Vamos enriquecê-lo com **peso médio das aves mortas/eliminadas** e **comparativo com o peso esperado do dia**, classificando automaticamente se o que sai do lote é **refugo** ou **ave em boa condição** — sinal clínico/manejo muito diferente.

## O que o sistema já tem (e vamos usar)

- `mortalidade_itens.peso_kg` → peso total (kg) do lote de aves daquele registro (motivo+submotivo). Dividido por `quantidade` dá o **peso médio por ave morta/eliminada**.
- `mortalidade_itens.motivo` (`natural` | `eliminado`) e `submotivo` (`locomotor` | `debilitado` | `refugo` | `outros`).
- `pesagens` + `pesagem_itens` → peso médio real do lote por data (`peso_liquido_kg / quantidade_aves`).
- `desempenho_aves` (linhagem + sexo + dia) → **peso referência** Cobb/Ross/Hubbard para o dia exato.
- `lotes.data_alojamento`, `linhagem`, `sexo`, `peso_medio_pintinhos_kg` → idade e baseline.
- `calcularIdadeNaData` já normaliza o dia da vida (consistente com os cards).

## Lógica de análise (por dia da semana e agregado)

Para cada registro de mortalidade da semana:

1. **Peso médio por ave** = `peso_kg / quantidade` (ignorar quando `peso_kg` nulo ou 0; marcar como "sem peso informado").
2. **Peso esperado do dia (`peso_ref`)**:
   - Prioridade 1: pesagem real do lote mais próxima daquele dia (janela ±3 dias) → média ponderada.
   - Prioridade 2: `desempenho_aves(linhagem, sexo, dia).peso_kg`.
   - Prioridade 3: interpolação linear entre `peso_medio_pintinhos_kg` (dia 0) e o ponto disponível mais próximo.
3. **Índice de refugo** `IR = peso_medio_morto / peso_ref`:
   - `IR ≤ 0.70` → **Refugo severo** (sinal positivo de manejo: descarte correto)
   - `0.70 < IR ≤ 0.85` → **Refugo** (ave abaixo do padrão)
   - `0.85 < IR ≤ 1.10` → **Peso normal** (alerta: estamos perdendo aves de bom peso — investigar causa sanitária/ambiental)
   - `IR > 1.10` → **Acima do padrão** (alerta crítico: perdendo as melhores aves — choque térmico, asfixia, ascite, problema agudo)
4. **Cruzar com motivo**:
   - `eliminado + submotivo=refugo + IR baixo` → coerente ✅
   - `natural + IR ≥ 0.85` → alerta: causa não-seletiva, exigir nota/diagnóstico
   - `eliminado + IR alto` → possível erro de classificação ou descarte indevido

## Mudanças de UI no `MortalidadeSemanaDetalheDialog`

Adicionar três blocos novos, mantendo os existentes:

### 1. Card "Perfil de peso da semana" (logo abaixo do total)
- Peso médio das aves mortas (kg) — somente sobre itens com peso informado.
- Peso de referência médio da semana (kg) e fonte usada (pesagem real / curva linhagem).
- `IR` médio + badge classificatória (Refugo severo / Refugo / Peso normal / Acima do padrão) com cor semântica.
- % de itens **sem peso informado** (incentiva o usuário a registrar o peso na próxima vez).

### 2. Enriquecer "Por Motivo"
Para cada linha, além de quantidade e %, mostrar:
- Peso médio dessa categoria (kg)
- Mini-badge com IR e classificação ("Refugo", "Normal", "Acima")
- Tooltip: "Esperado X kg • Real Y kg • desvio Z%"

### 3. Enriquecer "Por Dia"
Cada dia ganha uma linha extra:
- Peso médio do dia (mortas) vs peso esperado do dia (com seta ↑/↓ e %).
- Submotivo refugo aparece em verde quando IR baixo; outros submotivos em âmbar/vermelho quando IR alto.

### 4. Insight automático (rodapé do dialog)
Texto curto deterministico (sem IA, instantâneo) gerado a partir dos números:
- Ex.: *"82% das aves descartadas estavam abaixo de 70% do peso ideal — descarte seletivo coerente."*
- Ex.: *"Atenção: 60% da mortalidade natural ocorreu em aves com peso normal ou acima — investigar causa aguda (calor, ventilação, ascite)."*

## Trabalho técnico

Tudo no frontend, sem alterar schema. Apenas o componente `MortalidadeSemanaDetalheDialog.tsx`:

1. Ajustar o `select` para trazer `peso_kg` dos itens.
2. Buscar em paralelo:
   - `pesagens` + `pesagem_itens` do lote no intervalo da semana (±3 dias).
   - `desempenho_aves` filtrado por `linhagem`, `sexo` e `dia in (diaInicio..diaFim)`.
   - `lotes` (peso pintinho, linhagem, sexo) — já temos via props parcialmente; carregar o que faltar.
3. Criar utilitário `src/lib/utils/analiseMortalidade.ts` com:
   - `pesoReferenciaPorDia(dia, ctx)` → resolve com a hierarquia descrita.
   - `classificarIR(ir)` → `{ label, tone }`.
   - `gerarInsight(resumo)` → string determinística.
4. Estender estados `mortalidadePorDia` e `resumoPorMotivo` com `pesoMedio`, `pesoRef`, `ir`, `classificacao`.
5. Renderizar os três blocos novos usando tokens do design system (sem cores cruas).

## Fora do escopo (proposta futura, não inclusa)
- Tornar `peso_kg` obrigatório no `MortalidadeDialog`.
- Persistir o snapshot de análise em uma tabela `mortalidade_analise_semanal` para histórico longitudinal.
- Cruzar com temperatura/ambiência do dia para reforçar diagnóstico.

Confirma que sigo com essa implementação focada no dialog?
