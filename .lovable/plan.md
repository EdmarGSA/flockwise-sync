

## Tela do Criador - Painel Operacional Mobile

Criar uma tela dedicada para o papel "Criador", otimizada para uso em campo no celular, com acesso direto aos 4 fluxos operacionais: mortalidade, pesagem, solicitar racao e receber racao.

---

### Conceito da Tela

A tela mostra apenas os lotes vinculados ao criador logado (filtro por `criador_id = auth.uid()`). Cada lote aparece como um card compacto com informacoes essenciais e **4 botoes de acao grandes** (touch-friendly, minimo 56px) dispostos em grid 2x2 abaixo de cada card.

Layout vertical, sem tabs, sem menus complexos. O criador abre a tela e ja ve seus lotes com as acoes disponiveis.

---

### Estrutura Visual de Cada Lote

```text
+------------------------------------------+
| [Badge Status]    Nucleo / Galpao        |
| 24.500 aves vivas  |  Dia 28 (S4)       |
| Racao pendente: Sim | Pesar: Sim         |
+------------------------------------------+
| [Skull]         | [Scale]                |
| Mortalidade     | Pesagem                |
+------------------------------------------+
| [Package+Up]    | [Package+Down]         |
| Solicitar Racao | Receber Racao          |
+------------------------------------------+
```

Os botoes com pendencia (precisa pesar, racao enviada aguardando recebimento) ganham destaque visual (borda colorida, icone pulsante).

---

### Detalhes Tecnicos

**Arquivo a criar:**
- `src/pages/CriadorPainel.tsx` - Tela principal do criador

**Arquivos a modificar:**
- `src/App.tsx` - Adicionar rota `/criador` protegida pelo modulo `lotes` com level `edit`
- `src/pages/Home.tsx` - (opcional) Adicionar link para criadores no menu

**Logica de dados:**
1. Buscar lotes com `criador_id = user.id` e status IN ('alojado', 'saiu_para_entrega')
2. Para cada lote, buscar: ultima pesagem, mortalidade acumulada, recebimento, solicitacoes de racao pendentes/enviadas
3. Calcular: aves vivas, dias desde alojamento, precisa pesar (a cada 7 dias)

**Componentes reutilizados (sem alteracao):**
- `MortalidadeDialog` - Inserir mortalidade
- `PesagemDialog` - Inserir pesagem
- `RacaoLoteDialog` - Solicitar e receber racao (ja tem tabs para Solicitar, Pendentes e Recebidas)

**Fluxo de acoes:**
- Botao "Mortalidade" abre `MortalidadeDialog` com dados do lote
- Botao "Pesagem" abre `PesagemDialog` com dados do lote
- Botao "Solicitar Racao" abre `RacaoLoteDialog` na tab "Solicitar"
- Botao "Receber Racao" abre `RacaoLoteDialog` na tab "Recebidas" (para confirmar recebimento)

**Rota:**
- `/criador` protegida por `ProtectedRoute` + `ModuleProtectedRoute` com `moduleCode="lotes"` e `requiredLevel="edit"`

**Redirecionamento:**
- Criadores logados que acessam `/home` verao um botao/card de acesso rapido ao painel
- A tela usa o mesmo padrao mobile-first dos outros modulos (cards empilhados, botoes grandes)

