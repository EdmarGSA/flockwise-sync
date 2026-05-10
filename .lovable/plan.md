## Análise da Tela Atual de Registro de Mortalidade

`MortalidadeDialog.tsx` (619 linhas) hoje:
- Usa apenas a **última leitura** do sensor IoT (se < 2h) para preencher temperatura/umidade — um único ponto, fácil de subestimar estresse térmico real do dia.
- **Perde tudo** ao fechar o dialog: `handleClose()` reseta items, peso, quantidade, submotivos, temperatura, umidade, hora. Se o usuário fecha sem querer ou troca de tela, refaz do zero.
- Pede `pesoKg` por item, mas **nunca mostra a média** — o usuário não tem feedback do peso médio acumulado das aves mortas no registro.
- Não exibe histórico do peso médio das mortas vs meta de peso da idade.

## Plano de Melhorias

### 1. Temperatura e Umidade Mín/Máx do Dia (sensor IoT)

Trocar o "snapshot" por uma faixa real do dia.

- Em `fetchSensorData()`, ao invés de pegar 1 leitura, buscar todas as leituras do galpão para a data selecionada (`dataRegistro`) e calcular:
  - `tempMinDia / tempMaxDia / tempAtual`
  - `umidMinDia / umidMaxDia / umidAtual`
  - horários do mín e do máx
- Reexecutar quando `dataRegistro` mudar (registros retroativos mostram mín/máx daquele dia).
- Manter inputs `temperaturaC` / `umidadePct` editáveis (registro pontual no momento da mortalidade) e adicionar um **card de contexto climático do dia** abaixo:

```text
┌─ Clima do dia (sensor galpão) ──────────────────┐
│ Temp: 21.4° (06:12) ↔ 32.7° (14:48) | Atual 28.1│
│ Umid: 58% ↔ 81%                     | Atual 67% │
│ [Usar mín] [Usar máx] [Usar atual]              │
└──────────────────────────────────────────────────┘
```

Botões aplicam o valor no input correspondente (UX rápida).

Se não houver sensor, esconder o card e manter inputs manuais como hoje.

### 2. Não Perder Dados (rascunho persistente)

Persistir o formulário em `localStorage` com chave por lote: `mortalidade_draft_<loteId>`.

- Salvar a cada alteração (debounced 400ms): items, dataRegistro, horaRegistro, temperaturaC, umidadePct, motivo, submotivos, quantidade, pesoKg.
- Ao abrir o dialog: se há rascunho, mostrar banner discreto:
  > "Rascunho recuperado de há 12 min. [Continuar] [Descartar]"
- Limpar rascunho **apenas** após `handleSave` bem-sucedido.
- `handleClose()` deixa de resetar o estado — só fecha; ao reabrir os dados continuam.
- Adicionar confirmação leve ao fechar com itens não salvos: toast "Rascunho salvo automaticamente".

### 3. Peso Médio das Aves Mortas

Calcular e exibir em tempo real conforme itens são adicionados:

- `pesoMedio = Σ(peso_kg_item × quantidade) / Σ(quantidade)`
- Exibir junto dos totais que já existem (Natural / Eliminados / Total) um quarto card:

```text
[Natural: 12] [Eliminados: 3] [Total: 15] [Peso médio: 1,847 g]
```

- Comparar com a **meta de peso da idade do lote** (já existem `metas_peso_lote` no projeto):
  - Buscar meta para `diasDesdeAlojamento`.
  - Se `pesoMedio < 70% da meta` → badge âmbar "Refugo provável".
  - Se entre 70%–95% → badge "Abaixo da meta".
  - Se ≥ 95% → badge verde "Compatível".
- Adicionar coluna "Peso médio mortas (7d)" no card de Histórico de Mortalidade já existente.

### 4. Outras Melhorias de UX no Cadastro

- **Auto-foco**: ao adicionar item, focar de volta no campo `quantidade` para registros em série.
- **Atalhos de teclado**: `Enter` no peso adiciona o item (hoje precisa clicar "Adicionar").
- **Validação visual progressiva**: marcar campo `pesoKg` em vermelho assim que vazio + tentativa de adicionar, ao invés de só toast.
- **Quantidade máxima inteligente**: bloquear adicionar item se `Σ(quantidades) > avesVivasAtuais` com mensagem clara ("Restam X aves vivas").
- **Última temperatura usada**: mostrar timestamp da leitura ("há 23 min") quando vier do IoT, para o usuário decidir se confia.
- **Indicador "Salvando rascunho…"** no canto do dialog quando o debounce escreve no localStorage.

### Detalhes técnicos

Arquivos afetados:
- `src/components/lotes/MortalidadeDialog.tsx` — todas as mudanças acima.
- Novo hook `src/hooks/useMortalidadeDraft.ts` — wrapper de `localStorage` com debounce + serialização de `Date`.
- Novo helper `src/lib/utils/calcularMinMaxDia.ts` — recebe leituras do sensor e devolve `{ min, max, horarioMin, horarioMax, atual }` para temp e umidade.
- Reutilizar `metas_peso_lote` (já lida em `MetasPesoLote.tsx`) para a comparação de peso.

Sem mudanças de schema. Sem novas tabelas. Tudo frontend + leituras já existentes.

### Fora do escopo (sugiro para outra rodada)

- Persistir rascunho no banco (multi-dispositivo) — `localStorage` resolve 95% dos casos hoje.
- Análise IA de correlação peso médio mortas × ração consumida — depende de dados do lote.
- Importação automática de pesagem de aves mortas via balança IoT.