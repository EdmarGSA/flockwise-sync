## Objetivo

Hoje, na aba **Dispositivos** (`/configuracoes/dispositivos-iot`), todo card mostra as mesmas informações: **Temperatura**, **Umidade**, "Última leitura" e um switch genérico Ligado/Desligado. Isso faz sentido para sensores e para dispositivos de **Ventilação/Aquecimento**, mas não para **Iluminação** — onde o que importa é o programa de fotoperíodo, idade do lote, intensidade e próximo evento (acender/apagar).

A meta é renderizar um card especializado quando o dispositivo (ou o canal, no caso de ESP32) tiver função/equipamento **Iluminação**.

## Mudanças propostas

### 1. Card de dispositivo Sonoff de Iluminação (`src/pages/DispositivosIoT.tsx`)

Detectar `dev.funcao_automacao === 'iluminacao'` (e/ou Sonoff cujo único canal seja `tipo_equipamento = 'iluminacao'`) e substituir o bloco de Temperatura/Umidade por um painel próprio:

- **Cabeçalho**: badge "Iluminação" com ícone `Lightbulb` (substitui badge "Aquecimento/Ventilação").
- **Bloco principal** (em vez de Temp/Umidade):
  - Programa vinculado ao lote do galpão (nome do programa + fonte: "Lote" ou "Padrão da Org").
  - Idade do lote em dias e faixa atual (`dia_inicio–dia_fim`).
  - Horas de luz programadas para hoje (`horas_luz` da faixa).
  - Intensidade alvo agora (%) — usa `calcularEstadoIluminacao` (já existe em `src/lib/utils/calcularEstadoIluminacao.ts`).
  - Próximo evento: "Apaga em 2h13" / "Acende em 45min" (campos `proximo_evento_min/tipo`).
  - Indicador de override ativo (lê `useOverridesIluminacao` para o canal/dispositivo) com motivo e "até quando".
- **Rodapé**:
  - Botão **Forçar iluminação** (abre `OverridesIluminacaoDialog`).
  - Atalho **Ver curva** (abre dialog com `CurvaFotoperiodoChart` já existente).
  - Switch Ligado/Desligado mantido, mas com label "Manual" e aviso quando há automação ativa.
- **Sem leitura de temperatura/umidade**: ocultar o "Última leitura: há 2 minutos" se não houver telemetria ambiental — em vez disso mostrar "Último comando: há X" (já existe em `ultimo_comando_em`).

### 2. Card ESP32 com canais mistos

Para dispositivos ESP32 (multicanal), manter a lista atual em `CanaisDispositivoList.tsx`, mas, **por canal de iluminação**, enriquecer:
- Mostrar ícone `Lightbulb` colorido conforme estado.
- Linha extra (somente para `tipo_equipamento='iluminacao'`): "Programa: {nome} · faixa {a}-{b}d · alvo {%}" e "próx: apaga 18:00".
- Manter botão "Forçar iluminação" já existente.

Quando **todos** os canais ativos do ESP32 forem de iluminação, exibir no topo do card o mesmo resumo do programa (idade do lote, horas de luz hoje, próximo evento) — uma única vez, em vez de repetir por canal.

### 3. Helper compartilhado

Criar `src/hooks/useResumoIluminacaoGalpao.ts`:
- Input: `galpaoId`, `integradoId`.
- Resolve: lote ativo → programa (lote ou default org) → faixa pela idade → estado calculado via `calcularEstadoIluminacao`.
- Retorna `{ programaNome, fonte, idadeDias, faixa, estadoCalc, overrideAtivo }`.
- Cache via React Query (chave `['resumo-iluminacao', galpaoId]`, `staleTime` 60s) para reaproveitar entre vários cards/canais do mesmo galpão.

### 4. Pequenos ajustes visuais

- Cor do ícone de status (Wifi) e do `Power` em verde âmbar quando estiver em rampa de luz (intensidade entre 1 e 99%).
- Badge "Auto" para iluminação passa a mostrar o programa em tooltip.
- Remover do card de iluminação a referência a "Temperatura/Umidade" mesmo quando vier `leitura` (Sonoff de luz não tem sensor — evita o "--" confuso visto na imagem enviada).

## Arquivos afetados

- `src/pages/DispositivosIoT.tsx` — render condicional do card por função.
- `src/components/iot/CanaisDispositivoList.tsx` — enriquecer canais de iluminação + resumo no topo quando aplicável.
- `src/hooks/useResumoIluminacaoGalpao.ts` — novo.
- (Opcional) extrair `src/components/iot/DispositivoIluminacaoCard.tsx` para isolar o card especializado e manter `DispositivosIoT.tsx` mais limpo.

## Não muda

- Schema do banco, edge function `auto-iluminacao`, lógica de override e programas — apenas leitura/apresentação.
- Comportamento dos cards de Ventilação/Aquecimento permanece igual.
