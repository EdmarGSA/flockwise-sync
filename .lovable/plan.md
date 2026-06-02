
# Plano de comercialização — GSA Tibiri

## 1. Auditoria de custo de IA no sistema

Hoje a plataforma usa IA do **Lovable AI Gateway** em apenas **2 pontos**:

| # | Função | Modelo | Gatilho | Tokens estimados (in/out) | Custo por chamada* |
|---|--------|--------|---------|---------------------------|--------------------|
| 1 | `relatorio-lote-diario` (action=ia) | `google/gemini-2.5-pro` | Sob demanda (botão "Gerar análise IA"), com **cache por hash dos dados** | ~6.000 / ~1.500 | ~US$ 0,022 (~R$ 0,12) |
| 2 | `climate-learn` | `google/gemini-3-flash-preview` | Cron **1×/hora por galpão** ativo (narrativa térmica curta ≤280 chars) | ~500 / ~120 | ~US$ 0,0002 (~R$ 0,001) |

\*preços públicos Gemini, Nov/2025.

### Projeção mensal por cliente típico (integradora 20 galpões, 20 lotes ativos)
```text
climate-learn : 20 galpões × 24h × 30d × R$0,001  ≈  R$  14,40/mês
relatório IA  : 20 lotes × ~10 gerações/mês × R$0,12 ≈  R$  24,00/mês
                                                      ──────────────
                                            TOTAL ≈  R$  38,40/mês
```
Conclusão: **custo direto de IA é marginal (<R$ 50/mês mesmo em conta grande)**. O risco real está em:
- Disparos não-cacheados do relatório (se o usuário gera 100x/dia → R$ 12/dia)
- Futuras features de IA (briefing de mortalidade, brain de iluminação adaptativa, análise XML, etc.)

### Salvaguardas recomendadas (técnicas, antes da venda)
1. **Quota por organização** em `ai_usage_log` (tabela nova): contar tokens por `integrado_id` e bloquear ao atingir teto do plano.
2. **Rate limit** no endpoint `?action=ia` (máx. 1 geração / 10 min / lote) — o cache já existe, mas validar no servidor.
3. **Modelo escalável**: Flash para clientes Starter, Pro para Enterprise (já é a separação natural hoje).

---

## 2. Estrutura comercial — Modelo híbrido (base + por galpão)

Todos os planos focam **integradoras**, ticket-alvo R$ 500–1.500/mês no Profissional. **IA sempre como add-on separado.**

### Planos SEM IA (núcleo da oferta)

| Plano | Base mensal | Galpão adicional | Inclui | Limite |
|-------|-------------|------------------|--------|--------|
| **Starter** | R$ 290 | R$ 35/galpão | Manejo de lotes, mortalidade, pesagem manual, fechamento, estoque básico, 2 usuários | até 4 galpões |
| **Profissional** ⭐ | R$ 690 | R$ 45/galpão | Tudo do Starter + IoT (eWeLink/ESP32), automação climática (Climate Brain sem narrativa IA), iluminação programada, financeiro, veterinário, 10 usuários | até 20 galpões |
| **Integradora** | R$ 1.490 | R$ 38/galpão | Tudo do Pro + multi-núcleos, mapa de risco de campo, Cockpit Thoth, ERP sync (fornecedores), backoffice de granjas, usuários ilimitados | sem limite |
| **Enterprise / White-label** | Sob consulta | — | SSO/SAML, SLA, domínio próprio, onboarding dedicado, customizações | — |

Exemplo de ticket: integradora com 15 galpões no Pro = **R$ 690 + 15×45 = R$ 1.365/mês**.

### Add-ons opcionais (recorrentes)

| Add-on | Preço | Margem racional |
|--------|-------|-----------------|
| **IA Insights** (relatório diário IA + narrativa Climate Brain + briefing mortalidade) | **R$ 149/mês** por até 10 lotes ativos + R$ 9/lote extra | Custo real ~R$ 5–15/cliente → margem ~90% |
| **IA Insights Ilimitado** | **R$ 490/mês** | Para integradoras com >50 lotes |
| Câmeras Intelbras DVR | R$ 39/galpão/mês | Cobre infra de snapshot |
| Portal Fornecedor (mini-ERP B2B) | R$ 390/mês por fornecedor | Já existe a infra |
| Integração ERP customizada | Setup R$ 4.500 + R$ 290/mês | |

### Setup e contrato
- Setup único: **R$ 1.500 (Starter)** / **R$ 3.500 (Pro)** / **R$ 8.900 (Integradora)** — cobre cadastro de núcleos, importação Lohmann, treinamento.
- Desconto **2 meses grátis** no anual (16,7%).
- **Trial 14 dias** com ambiente demo já existente.

---

## 3. Comparativo "Com IA" × "Sem IA" (pitch comercial)

```text
                          SEM IA (núcleo)         COM IA (add-on)
─────────────────────────────────────────────────────────────────
Relatório diário do lote  Tabelas + gráficos      + Análise narrativa Gemini Pro
Climate Brain             Setpoints + offset      + Narrativa térmica horária
Mortalidade               Lista + alertas         + Briefing diagnóstico
Tomada de decisão         Operador interpreta     Insight pronto p/ gestor
Custo p/ cliente          R$ 690–1.490            +R$ 149–490
Custo Lovable             ~R$ 0                   ~R$ 5–40/cliente
Margem bruta              ~95%                    ~90%
```

**Argumento de venda:** "A plataforma toma decisões por você (automações, alertas, gráficos). A IA **explica e prioriza** essas decisões para o tomador de decisão executivo."

---

## 4. Itens técnicos a implementar para sustentar a venda

Esses itens **não são código** ainda — só estarão prontos para implementação após aprovação:

1. **Tabela `ai_usage_log`** (integrado_id, função, modelo, tokens_in, tokens_out, custo_estimado, criado_em).
2. **Tabela `planos` + `assinaturas`** (plano_id, integrado_id, base_galpoes, addon_ia, ciclo, vence_em).
3. **Hook `useIAEnabled()`** que lê `assinaturas.addon_ia` → esconde botões "Gerar IA" e desativa `chamarIA()` no `relatorio-lote-diario` quando off.
4. **Quota guard** no edge function (retorna 402 quando estoura).
5. **Página `/configuracao/plano`** com uso de IA do mês, galpões ativos, próximo ciclo.
6. **Backoffice → BackofficeGranjas**: coluna "Plano", "Add-ons", "Uso IA mês".
7. **Pagamento**: integrar **Stripe (Lovable Payments)** para cobrança recorrente em BRL com suporte a setup fee + assinatura + add-ons.

---

## 5. Cronograma sugerido (pós-aprovação)

```text
Semana 1  Tabelas planos/assinaturas/ai_usage_log + RLS
Semana 2  useIAEnabled + quota guard + página /configuracao/plano
Semana 3  Backoffice plano/uso + relatórios financeiros internos
Semana 4  Integração Stripe (BRL), trial 14d, faturas
Semana 5  Landing/pricing pública + onboarding comercial
```

---

## 6. Próximos passos antes de codar

1. Confirmar tabela de preços final (valores acima são proposta inicial).
2. Decidir se setup fee é **obrigatório** ou opcional/negociável.
3. Validar se Climate Brain narrativa (hoje grátis) entra no add-on IA ou continua incluso (recomendo **mover para add-on**, já que é o uso recorrente mais caro).
4. Aprovar Stripe (Lovable Payments) como gateway — ou indicar preferência.
