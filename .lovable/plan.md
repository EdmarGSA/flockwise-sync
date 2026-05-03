## Sprint 1 – Automação de Iluminação

Foco em entregar o que falta de mais crítico para o usuário operar com segurança o programa de fotoperíodo já existente.

### 1. UI de Overrides manuais (`override_iluminacao_canal`)

Hoje a tabela existe mas não há tela para criar/encerrar overrides. Vou adicionar:

- **Novo componente** `src/components/iot/OverridesIluminacaoDialog.tsx`
  - Lista overrides ativos do galpão (canais com `tipo_atuador = 'iluminacao'`).
  - Botão "Forçar canal" → form com:
    - Canal (select dos canais de iluminação do dispositivo).
    - Estado forçado: `ligado` / `desligado`.
    - Intensidade % (0–100), só habilitado para canais PWM/dimmer.
    - Duração: 30min / 1h / 2h / 4h / até manhã / personalizado → calcula `ate_quando`.
    - Motivo (texto livre, opcional).
  - Ação "Encerrar agora" para overrides ativos (DELETE pelo id).
- **Botão de atalho** em `CanaisDispositivoList.tsx` para canais de iluminação: ícone `Hand` que abre o dialog já filtrado naquele canal.
- Hook `useOverridesIluminacao(canalId?)` com `react-query` (list/insert/delete) respeitando RLS por `integrado_id`.

### 2. Integração no Dashboard do Lote

Em `src/components/campo/LoteDashboardDialog.tsx` adicionar um card "Iluminação":

- Mostra programa vinculado ao lote (`programa_iluminacao_lote` via `lote.programa_iluminacao_id` se existir, senão o `is_default` do `tipo_producao`).
- Faixa atual (com base na idade do lote em dias) + horas de luz, janela acender/apagar e intensidade.
- Indicador de overrides ativos nos canais do galpão.
- Botões: "Ver programa" (link para `/iluminacao`) e "Forçar canal" (abre `OverridesIluminacaoDialog`).

### 3. Limpeza do conflito com `auto-temperatura`

O `case "iluminacao"` em `supabase/functions/auto-temperatura/index.ts` já retorna `null`, mas ainda é avaliado por canal. Vou:

- Filtrar canais com `tipo_atuador = 'iluminacao'` logo na query de canais da função (não trazer do banco).
- Remover o `case "iluminacao"` da função `decideTargetState` para deixar explícito que iluminação é responsabilidade exclusiva de `auto-iluminacao`.
- Adicionar comentário no topo do arquivo com o contrato entre as duas funções.

### 4. Pequenos ajustes de suporte

- Em `auto-iluminacao/index.ts`: ao calcular o estado alvo, consultar `override_iluminacao_canal` (com `ate_quando > now()`) e, se houver, aplicar `estado_forcado` + `intensidade_pct` ignorando o programa. Logar `motivo: 'override'` no `historico_estado_canal`.
- Garantir que o índice `(canal_id, ate_quando)` exista para a consulta acima (migration leve se faltar).

### Arquivos a criar / editar

```text
criar:  src/components/iot/OverridesIluminacaoDialog.tsx
criar:  src/hooks/useOverridesIluminacao.ts
editar: src/components/iot/CanaisDispositivoList.tsx        (botão atalho)
editar: src/components/campo/LoteDashboardDialog.tsx        (card Iluminação)
editar: supabase/functions/auto-temperatura/index.ts        (remover case)
editar: supabase/functions/auto-iluminacao/index.ts         (aplicar override)
migration (se necessário): índice em override_iluminacao_canal
```

### Fora do escopo desta Sprint

- Gráfico de curva de fotoperíodo (Sprint 2).
- Configuração de PWM no `CanaisDispositivoDialog` (Sprint 2).
- Fallback offline em ESP32 / timers eWeLink (Sprint 3).
- População de `historico_estado_canal` para auditoria detalhada (Sprint 3).
- Estimulação automatizada de postura (Fase 5).

Após sua aprovação eu implemento na sequência: override → dashboard → limpeza temperatura → override no edge function.
