## Diagnóstico confirmado

Dados no banco (lote Ross 308, 21 dias, esperado ~0.7 kg/ave):
```
peso_bruto_kg=0.0115  peso_tara_kg=0.00188  peso_liquido_kg=0.0096  qtd=15
```
Multiplicando por 1000 → 11.5 kg bruto, 1.88 kg tara, 9.6 kg líquido, ~0.64 kg/ave ✅ coerente.

Confirma a hipótese: o formulário `PesagemDialog` sempre gravou em **kg**, mas a migração g→kg dividiu esses valores por 1000, corrompendo os registros pré-existentes.

## Correções

### 1. Restaurar dados históricos (`pesagem_itens`)

Multiplicar `peso_bruto_kg` e `peso_tara_kg` por 1000 nas linhas afetadas pela migração. A migração rodou em **2026-05-17**. Aplicar apenas em registros criados antes:

```sql
UPDATE pesagem_itens
SET peso_bruto_kg = peso_bruto_kg * 1000,
    peso_tara_kg  = peso_tara_kg  * 1000
WHERE created_at < '2026-05-17 02:57:00+00';
```

`peso_liquido_kg` é coluna gerada (`bruto - tara`) e recalcula sozinha.

### 2. Corrigir display de `PesagemDetalheDialog.tsx`

Tratar `peso_liquido_kg` como **kg** em todos os pontos:
- Consolidado: Peso Total em **kg (2 casas)**; Média por ave em **g (1 casa)** = `(totalPeso/totalAves)*1000`.
- Referência: usar `pesoReferencia` direto em kg, sem `*1000` invertido.
- Tabela de itens: Peso Total em **kg (3 casas)**; Média por ave em **g (1 casa)**.
- Subtotal sessão: kg (2 casas) + média g (1 casa).

### 3. Validação

Reabrir detalhe da pesagem do lote da Marcia. Esperado para 15 aves de 21 dias:
- Peso total: ~9.6 kg
- Média por ave: ~640 g

## Arquivos

- Migration data-fix: `UPDATE pesagem_itens ...` (via tool de insert/update)
- `src/components/veterinario/PesagemDetalheDialog.tsx` (reescrita das fórmulas e labels)

## Escopo

Apenas `pesagem_itens` (tabela reportada pela usuária). Outras tabelas convertidas pela migração (`desempenho_aves`, `desempenho_postura`, etc.) eram referências catalogadas em g — a divisão por 1000 nelas está correta.