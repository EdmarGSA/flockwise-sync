# Onda 7 — Climate Brain Padrão Ouro 🏆

## O que já temos hoje (análise)


| Camada                                                   | Estado     | Tabela / Função                                                                                                                     |
| -------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Curva alvo por idade (T, UR, vel.ar, NH₃, CO₂, ITH)      | ✅          | `curva_climatica_ponto`                                                                                                             |
| Histerese global (deadband, tempos min ON/OFF)           | ✅          | `config_histerese_organizacao`                                                                                                      |
| Estágios de ventilação (min/transição/túnel/heat-stress) | ✅          | `programa_ventilacao_galpao` + `auto-ventilacao` (cron 2 min)                                                                       |
| Cortinas inteligentes por estágio + vento externo        | ✅          | `programa_cortina_inteligente` + `auto-cortina`                                                                                     |
| Aquecimento / liga-desliga térmico                       | ⚠️ Parcial | `auto-temperatura` (controle direto eWeLink, sem coordenação)                                                                       |
| Nebulização                                              | ❌ Falta    | parâmetros existem em `regras_temperatura_lote.nebulizador_*` mas **sem edge function dedicada**, sem coordenação com UR/ventilação |
| Troca de ar mínima durante aquecimento (pinteiro)        | ❌ Falta    | aquecimento e ventilação rodam isolados; não há ciclo coordenado                                                                    |
| Aprendizado por galpão (peculiaridades térmicas)         | ❌ Falta    | log existe (`log_decisao_clima`), mas nada consome para ajustar setpoints                                                           |


### Problemas concretos identificados

1. **Aquecimento sufoca**: durante brooding (≤14d), aquecedores ligam mas ventilação fica em "minima_apenas" — risco de CO₂/NH₃/UR alto sem renovação cíclica.
2. **Nebulização cega**: campos no banco, mas nenhum loop que respeite UR off, cooldown e estágio túnel.
3. **Setpoints rígidos**: a curva é a mesma para todo galpão. Galpão antigo, voltado ao sol, com isolamento ruim, recebe o mesmo alvo de um galpão novo.
4. **Sem feedback loop**: divergência sustentada entre alvo e leitura nunca alimenta correção automática.

---

## Plano Padrão Ouro

### 1. Coordenador único `climate-brain` (substitui chamadas isoladas)

Edge function chamada pelo cron a cada **1 min**. Para cada galpão com lote ativo:

```text
┌─────────────────────────────────────────────────┐
│   1. Coleta: leituras 5min + outdoor + idade    │
│   2. Calcula alvos (curva ± offset_aprendido)   │
│   3. Resolve modo dominante:                    │
│        AQUECIMENTO  → ventilação cíclica mín    │
│        CONFORTO     → ventilação por estágio    │
│        ALERTA_CALOR → nebulização + túnel       │
│        EMERGÊNCIA   → 100% + alarme             │
│   4. Aplica ações (chama drivers existentes)    │
│   5. Registra em log_decisao_clima              │
│   6. Atualiza modelo de aprendizado (passo 3)   │
└─────────────────────────────────────────────────┘
```

Reaproveita: `auto-ventilacao`, `auto-cortina`, `auto-temperatura` viraram **executores** (continuam existindo). O `climate-brain` decide *qual* aciona e com que parâmetro derivado.

### 2. Nebulização inteligente (nova função `auto-nebulizacao`)

- Liga apenas se: `T > T_alvo + deadband` **E** `UR < neb_umid_off_pct` **E** estágio ≥ transição **E** ventilação ≥ 70% capacidade.
- Ciclo on/off respeita `nebulizador_min_duracao_seg` + `nebulizador_cooldown_seg` por galpão.
- Bloqueio para pinteiro (idade < `protege_pintinho_ate_dias`).
- Cancela imediato se UR sobe acima do alvo (anti-efeito-sauna).

### 3. Troca de ar durante aquecimento (brooding cycle)

Nova lógica no `climate-brain`: quando aquecedor está ON e idade ≤ 14d, força exaustão **mínima cíclica** (X seg ON / Y seg OFF) calculada pela equação:

```
vazao_necessaria_m3h = aves_vivas × peso_kg × vazao_min_m3h_por_kg(curva)
duty_cycle = clamp(vazao_necessaria / capacidade_total_cfm, 0.05, 0.30)
```

Garante renovação para CO₂/NH₃ sem matar a temperatura. Parâmetros novos em `programa_ventilacao_galpao`:

- `troca_ar_brooding_ativa` bool default true
- `troca_ar_brooding_max_pct` int default 25

### 4. IA embarcada por galpão (aprendizado contínuo)

**Nova tabela `aprendizado_galpao**` (uma linha por galpão):

```
galpao_id PK
offset_temp_aprendido_c        numeric default 0   -- ajuste no setpoint
offset_ur_aprendido_pct        numeric default 0
inercia_estimada_min           numeric default 30  -- tempo p/ T responder a ações
fator_isolamento               numeric default 1.0 -- 1.0 = padrão; >1 esquenta mais
fator_perda_calor_noturna      numeric default 1.0
amostras_treinadas             int default 0
ultimo_treino_em               timestamptz
modelo_versao                  int default 1
metricas_jsonb                 jsonb               -- MAE, drift, etc.
```

**Job `climate-learn` (cron 1×/hora)**: para cada galpão com ≥48h de log:

- Lê `log_decisao_clima` + `leituras_sensores` últimas 72h.
- Calcula divergência média entre `setpoint_alvo` e `temp_lida` por janela de 30 min após cada ação.
- Estima `inercia_estimada_min` por correlação cruzada (tempo entre ação e 63% da resposta — método first-order).
- Atualiza `offset_temp_aprendido_c` por média móvel exponencial (α=0,1) — limitado a ±2°C de segurança.
- Detecta padrão diurno (galpão esquenta mais à tarde) e ajusta `fator_isolamento`.
- Tudo é **determinístico/estatístico** (não precisa LLM). Opcional: usar Lovable AI (Gemini Flash) **apenas para gerar narrativa** ("Galpão 3 esquenta 2°C mais que padrão entre 13–16h, recomendado antecipar túnel em 30 min") exibida no painel.

### 5. Telas novas (mínimo viável)

- `**/climate-brain/:galpaoId**`: timeline 24h com setpoint vs leitura, ações tomadas, eventos, e card do "perfil aprendido" (offset, inércia, isolamento).
- Botão **"Reset aprendizado"** (zera offsets).
- Card no Dashboard: "Galpões com perfil divergente >1.5°C" (acionável).

### 6. Cron e config

```sql
select cron.schedule('climate-brain-1min','* * * * *', ...);
select cron.schedule('climate-learn-hourly','0 * * * *', ...);
-- Pausar crons antigos isolados de auto-ventilacao/auto-cortina (climate-brain os invoca)
```

---

## Detalhes técnicos

**Arquivos a criar/editar**

- `supabase/migrations/...sql` — tabelas `aprendizado_galpao`, colunas novas em `programa_ventilacao_galpao`, alteração do log para incluir `modo_dominante` e `offset_aprendido_aplicado`.
- `supabase/functions/climate-brain/index.ts` — coordenador.
- `supabase/functions/auto-nebulizacao/index.ts` — driver de nebulização (chamado pelo brain).
- `supabase/functions/climate-learn/index.ts` — job de aprendizado.
- `src/pages/ClimateBrainGalpao.tsx` — visualização + ações.
- `src/pages/ConfiguracaoVentilacao.tsx` — adiciona toggle "troca de ar brooding".
- `src/pages/Configuracoes.tsx` + `src/App.tsx` — links/rotas.
- (Opcional) `src/hooks/useAprendizadoGalpao.ts`.

**Compatibilidade**: nenhum dado existente é alterado; offsets default = 0 → comportamento idêntico ao atual até treinar.

**Segurança**: limites duros (offset ±2°C, ventilação ≥30% em pinteiro, nebulização nunca quebra UR>85%).

---

## Pergunta antes de implementar

Quer que eu inclua já a **narrativa via Lovable AI** ("o galpão 3 está se comportando assim porque...") ou mantemos só estatístico nesta onda e adicionamos depois? pode sim