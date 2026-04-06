

## Adicionar Indicador de Temperatura e Status dos Equipamentos na Listagem de Lotes

### Objetivo

Mostrar diretamente na tabela de "Meus Lotes" a temperatura atual, umidade e se os equipamentos IoT estão ligados/desligados, sem precisar entrar no detalhe do lote.

### Alterações

**1. `src/pages/MeusLotes.tsx`**

- Expandir a interface `LoteComPesagem` com campos IoT: `temperaturaAtual`, `umidadeAtual`, `dispositivosOnline`, `dispositivosTotal`, `dispositivosLigados` (switch on)
- No `fetchLotes`, após carregar os lotes alojados, fazer uma query batch em `dispositivos_iot` (filtrado por `galpao_id` dos lotes ativos, `ativo = true`) e para cada dispositivo buscar a última `leitura_sensores` — agregar por `galpao_id` para obter: temperatura mais recente, umidade, quantos estão online, quantos com switch ligado
- Adicionar nova coluna **"Ambiente"** na tabela entre "Idade" e "Status"
- Renderizar na célula:
  - Ícone de termômetro com temperatura (colorido conforme faixa: verde/amarelo/vermelho)
  - Ícone de gota com umidade
  - Badge compacto mostrando dispositivos: ex. "2/3 ⚡" (2 ligados de 3) com cor verde se todos online, amarelo se parcial, vermelho se todos offline
  - Se não houver dispositivos, mostrar "—"

**2. Sem alterações no banco** — dados já disponíveis em `dispositivos_iot` e `leituras_sensores`

### Detalhes visuais

A célula "Ambiente" será compacta:
```text
🌡 28.5°C  💧 62%
⚡ 2/3 online
```
- Temperatura colorida (verde = dentro da faixa, amarelo = margem, vermelho = fora)
- Badge de equipamentos: "2/3 ⚡" indica 2 ligados de 3 dispositivos
- Tooltip no badge mostra nomes dos dispositivos e status individual

