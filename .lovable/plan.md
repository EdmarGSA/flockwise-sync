

## Plano: Análise de Mortalidade sem IA — Briefing Local com Dados Cruzados

### Problema

Chamar a IA (LLM) a cada registro de mortalidade é caro e insustentável quando há dezenas de lotes lançando dados diariamente. Cada chamada consome créditos do AI Gateway.

### Solução

**Substituir a chamada de IA por lógica determinística no próprio Edge Function.** O sistema já possui todos os dados necessários no banco — basta cruzá-los e gerar um briefing com regras fixas, sem LLM.

O briefing será gerado 100% com código (sem custo de IA), comparando:

```text
┌─────────────────────────────────────────────┐
│  DADOS CRUZADOS (já existem no banco)       │
├─────────────────────────────────────────────┤
│ 1. Peso real (última pesagem)               │
│    vs peso esperado (desempenho_aves)        │
│ 2. GPD real vs GPD referência               │
│ 3. Mortalidade acumulada vs mortalidade_media│
│ 4. Temperatura/Umidade (IoT ou manual)      │
│ 5. Tendência mortalidade (subindo/estável)   │
│ 6. Idade do lote e fase                     │
└─────────────────────────────────────────────┘
         ↓
   Regras determinísticas
         ↓
┌─────────────────────────────────────────────┐
│  BRIEFING GERADO                            │
│ • Classificação de risco (baixo/mod/alto)   │
│ • Causas prováveis (baseado em regras)      │
│ • Sugestões de ação (lookup table)          │
│ • Resumo comparativo                        │
└─────────────────────────────────────────────┘
```

### Regras de Classificação (exemplos)

| Indicador | OK | Atenção | Crítico |
|-----------|-----|---------|---------|
| Mortalidade vs referência | ≤ 100% | 100-150% | > 150% |
| Peso vs esperado | ≥ 95% | 80-95% | < 80% |
| Temperatura | 20-30°C (ajustado por idade) | fora 5°C | fora 10°C |
| Tendência mortalidade | estável/caindo | subindo leve | subindo forte |

### Arquivos Afetados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/analise-mortalidade/index.ts` | Reescrever: remover chamada ao AI Gateway, implementar lógica determinística que cruza dados e gera o briefing estruturado |
| `src/components/lotes/MortalidadeDialog.tsx` | Remover fotos (componente, validação, upload), disparar análise automaticamente após salvar |
| `src/components/lotes/AnaliseIAMortalidadeCard.tsx` | Auto-disparar ao montar, remover botão manual "Analisar com IA", ajustar labels (tirar "IA" do título) |

### Detalhes Técnicos

**Edge Function `analise-mortalidade` — nova lógica sem LLM:**

1. Busca `desempenho_aves` filtrando por `linhagem`, `sexo`, dia mais próximo da idade do lote → peso esperado
2. Busca `mortalidade_media` para o `integrado_id` com mesma linhagem/sexo → mortalidade esperada
3. Busca `leituras_sensores` via `dispositivos_iot` do galpão → temperatura/umidade reais
4. Busca últimas 5 pesagens → calcula GPD real
5. Busca mortalidades recentes → calcula tendência (crescente/estável/decrescente)
6. Aplica regras determinísticas → classifica risco, lista causas prováveis, gera sugestões
7. Salva resultado no campo `analise_ia` (jsonb) como antes — mesma interface, zero custo de IA

**Causas prováveis — tabela de lookup:**
- Peso baixo + mortalidade alta → "Provável problema nutricional ou sanitário"
- Temperatura alta + mortalidade alta → "Estresse térmico por calor"
- Temperatura baixa + aves jovens → "Hipotermia — verificar aquecimento"
- Mortalidade subindo + eliminados > naturais → "Padrão de descarte elevado — revisar critérios"

**MortalidadeDialog — simplificação:**
- Remove `MortalidadeFotoUpload`, `uploadMortalidadeFotos`, validação `fotosAtendidas()`
- Após `handleSave` com sucesso, exibe `AnaliseIAMortalidadeCard` que auto-dispara

### Benefícios

- **Custo zero** — nenhuma chamada de IA, apenas queries SQL + lógica
- **Velocidade** — resposta em < 500ms (vs 5-15s com LLM)
- **Escala infinita** — 100 lotes/dia sem impacto no custo
- **Mesma interface** — o card de análise mantém o mesmo visual e estrutura de dados
- **Determinístico** — resultados consistentes e auditáveis

