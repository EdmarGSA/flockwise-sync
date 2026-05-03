## Diagnóstico — o que já existe e o que falta

### ✅ Já implementado no banco
- `programa_iluminacao_lote` — cabeçalho do programa (nome, tipo_producao, is_default, ativo) com RLS por `integrado_id`.
- `programa_iluminacao_faixa` — faixas por idade (dia_inicio/fim, horas_luz, blocos, ramp_up/down, intensidade_pct).
- `override_iluminacao_canal` — overrides manuais com expiração (`ate_quando`).
- FK `lotes.programa_iluminacao_id → programa_iluminacao_lote`.
- `canais_dispositivo` já aceita `tipo_equipamento='iluminacao'`, `funcao_automacao='iluminacao'`, `suporta_dimer`.
- `config_estimulo_postura` com FK para programa gerado automaticamente.

### ✅ Já implementado em código
- Página `/configuracoes/iluminacao` (`ProgramasIluminacao.tsx`) — CRUD completo de programas + faixas, gráfico de curva e edição inline.
- Edge function `auto-iluminacao` (cron 1 min) que executa o programa.
- Hook `useOverridesIluminacao` + diálogo `OverridesIluminacaoDialog`.
- `CanaisDispositivoDialog` com tipo "Iluminação" e "Função: Iluminação (programa luz)" + flag dimmer/PWM.
- `LoteIluminacaoCard` no dashboard do lote (mostra estado atual + link).
- `EstimuloPosturaDialog` para gerar programa automaticamente.

### ❌ Lacunas (o que falta no plano)

1. **Menu / descoberta** — A página `/configuracoes/iluminacao` existe mas não tem link visível em `Configurações`. O usuário não consegue chegar nela sem digitar a URL.
2. **Vínculo lote → programa** — O campo `lotes.programa_iluminacao_id` existe mas o formulário de cadastro/edição de lote **não expõe esse seletor**. Sem isso, nenhum lote roda automação por programa.
3. **Programa padrão por tipo** — A flag `is_default` existe mas não há UI para marcar/desmarcar (toggle), nem validação de "apenas 1 default por tipo_producao".
4. **Vínculo programa → canais** — Hoje a edge function `auto-iluminacao` precisa saber **quais canais de iluminação pertencem ao galpão de cada lote**. Verificar se há `nucleo_id`/`galpao_id` em `canais_dispositivo` (ou em `dispositivos_iot`) para essa correlação. Se não houver, falta esse vínculo.
5. **Visibilidade de overrides** — Os overrides existem no banco/hook, mas não há um indicador no card de iluminação do lote nem listagem central em `/configuracoes/iluminacao`.
6. **Templates prontos** — Não há programas-modelo (Cobb 500, Ross 308, Lohmann postura) pré-populados via `handle_new_user` ou botão "Importar template".

---

## Plano de implementação

### Etapa 1 — Descoberta e navegação
- Adicionar card "Programas de Iluminação" em `Configuracoes.tsx` (ícone `Lightbulb`) apontando para `/configuracoes/iluminacao`.
- Adicionar link na sidebar/IoT (`DispositivosIoT.tsx`) na seção de automação.

### Etapa 2 — Vínculo lote → programa
- No formulário de cadastro/edição de lote (`src/components/lotes/...`), adicionar `<Select>` "Programa de iluminação" listando programas ativos do mesmo `tipo_producao` do lote (filtra `frango_corte` vs `postura`). Opção "Usar programa padrão" (null).
- Mostrar resumo da curva selecionada abaixo do select.

### Etapa 3 — Programa padrão por tipo
- Adicionar toggle "Definir como padrão" no header do programa em `ProgramasIluminacao.tsx`.
- Criar trigger em `programa_iluminacao_lote` que ao marcar `is_default=true` desmarca os demais do mesmo `(integrado_id, tipo_producao)`.

### Etapa 4 — Vínculo canal → núcleo/galpão
- Verificar/garantir colunas `nucleo_id` e `galpao_id` em `canais_dispositivo` (ou herdar de `dispositivos_iot`).
- No `CanaisDispositivoDialog`, ao marcar tipo=Iluminação, exigir seleção de galpão.
- Atualizar `auto-iluminacao` para resolver: lote → galpão → canais com `funcao_automacao='iluminacao'`.

### Etapa 5 — Visibilidade de overrides
- Em `LoteIluminacaoCard`: badge "Override ativo até HH:MM" quando houver.
- Em `ProgramasIluminacao`: aba/secção lateral "Overrides ativos" listando todos os overrides vigentes da organização com botão para encerrar.

### Etapa 6 — Templates e seed
- Botão "Importar template" no diálogo "Novo programa" com presets:
  - Frango corte Cobb 500 (1-7d 23h, 8-14d 20h, 15-fim 18h)
  - Postura comercial Lohmann (estímulo gradual 17h)
  - Matriz pesada
- Seed via `handle_new_user` para criar 1 programa default por tipo na organização.

### Etapa 7 — QA e documentação
- Testar ciclo completo: criar programa → vincular ao lote → atribuir canal → verificar log do `auto-iluminacao`.
- Atualizar memória `iot-lighting-program-system` com fluxo final.

---

## Detalhes técnicos

**Arquivos a alterar:**
- `src/pages/Configuracoes.tsx` — card de acesso
- `src/components/lotes/LoteForm*.tsx` — seletor de programa
- `src/pages/ProgramasIluminacao.tsx` — toggle default + lista de overrides + templates
- `src/components/iot/CanaisDispositivoDialog.tsx` — exigir galpão para canal de iluminação
- `src/components/campo/LoteIluminacaoCard.tsx` — badge override
- `supabase/functions/auto-iluminacao/index.ts` — resolução lote→galpão→canais
- Nova migration: trigger `is_default` único + (se faltar) coluna `galpao_id` em `canais_dispositivo`

**Sem necessidade de:** novas tabelas — o schema atual já é suficiente.