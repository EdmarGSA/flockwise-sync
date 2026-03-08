

## Plano: Limpar/Popular Demo + Corrigir Filtro Pendente

### Contexto
A inconsistência #2 do checklist (filtro `integrado_id` em `desempenho_aves`) ainda **não foi aplicada**. Ambas as queries em `GestaoCampo.tsx` (linha 142) e `useLoteAnalytics.tsx` (linha 225) buscam todos os registros sem filtrar por organização.

### Ações

**1. Corrigir filtro `integrado_id` nas queries de `desempenho_aves`**
- `src/pages/GestaoCampo.tsx` linha 142: adicionar `.eq('integrado_id', integradoId)`
- `src/hooks/useLoteAnalytics.tsx` linha 225-227: adicionar `.eq('integrado_id', integradoId)` (o hook recebe `integradoId` como parâmetro de `fetchAnalytics`)

**2. Limpar e repopular dados demo**
- Chamar a edge function `create-demo-user` para garantir que o usuário demo existe e está configurado
- Executar SQL via insert tool para limpar dados existentes do demo user (`e12d9495-1a59-43aa-bdb5-9121ee0f56fb`) e recriar via as RPCs `initialize_demo_data` e `initialize_demo_lotes`

**3. Testar no preview**
- Entrar como demo e navegar pelo módulo Gestão de Campo para verificar se os dados estão consistentes

### Detalhes Técnicos

Limpeza SQL (via insert tool):
```sql
DELETE FROM lotes WHERE integrado_id = 'e12d9495-...';
DELETE FROM nucleos WHERE integrado_id = 'e12d9495-...';
DELETE FROM galpoes WHERE nucleo_id IN (SELECT id FROM nucleos WHERE integrado_id = 'e12d9495-...');
DELETE FROM silos WHERE integrado_id = 'e12d9495-...';
DELETE FROM areas WHERE integrado_id = 'e12d9495-...';
-- Depois recriar via RPCs existentes
```

As RPCs `initialize_demo_data` e `initialize_demo_lotes` já existem e criam núcleos, galpões, silos, lotes com pesagens e metas.

