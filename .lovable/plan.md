

## Problema

O componente `TemperaturaUmidadeCard` busca apenas **1 dispositivo** por galpão (usa `.limit(1).maybeSingle()`). Se um galpão tem múltiplos sensores cadastrados, só o primeiro aparece.

## Solução

Alterar o componente para buscar **todos** os dispositivos ativos vinculados ao galpão e exibir um card para cada um.

### Alterações

**`src/components/lotes/TemperaturaUmidadeCard.tsx`**
- Remover `.limit(1).maybeSingle()` e usar `.select()` para buscar array de dispositivos
- Para cada dispositivo, buscar a última leitura
- Renderizar um card por dispositivo (com nome, temperatura, umidade, status online/offline)
- Manter o comportamento de não renderizar nada se não houver dispositivos

**`src/pages/LoteDetalhe.tsx`**
- Sem alterações necessárias — o componente já recebe `galpaoId` corretamente

### Detalhes Técnicos
- State muda de `leitura` singular para `dispositivos[]` com leitura embutida
- Loop de busca de leituras em paralelo (`Promise.all`) para performance
- Cada card mostra: nome do sensor, temperatura, umidade, badge online/offline, tempo desde última leitura

