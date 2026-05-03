## Causa

O card continua igual porque o branch que renderiza o `DispositivoIluminacaoCard` checa `dev.funcao_automacao === 'iluminacao'`, mas no seu dispositivo "Iluminação Granja" esse campo está como `'nenhuma'` no banco. Quem identifica que é luz é o **canal** (`canais_dispositivo.tipo_equipamento = 'iluminacao'`), não o dispositivo.

```text
dispositivos_iot.funcao_automacao = 'nenhuma'   ← usado hoje (errado)
canais_dispositivo.tipo_equipamento = 'iluminacao'  ← fonte real
```

## Correção

### 1. `src/pages/DispositivosIoT.tsx`
- Adicionar estado `iluminacaoDeviceIds: Set<string>`.
- Em `fetchData`, após carregar `dispositivos`, fazer um único `select id, dispositivo_id` em `canais_dispositivo` filtrando `tipo_equipamento='iluminacao'` e `ativo=true` para os IDs carregados, e preencher o Set.
- Na render, trocar a checagem para:
  ```ts
  const isIluminacao =
    dev.funcao_automacao === 'iluminacao' || iluminacaoDeviceIds.has(dev.id);
  if (isIluminacao && dev.driver !== 'esp32_http' && dev.driver !== 'esp32_mqtt') { ... }
  ```

### 2. Auto-marcação opcional (UX)
Quando todos os canais ativos do Sonoff forem `iluminacao`, mostrar no card a badge "Iluminação" mesmo se `funcao_automacao` ainda for `'nenhuma'` (já coberto pelo card especializado).

### 3. Sem mudanças de schema
Apenas leitura adicional. Mantém compatibilidade com dispositivos cuja função foi explicitamente marcada como `'iluminacao'`.

## Arquivo afetado
- `src/pages/DispositivosIoT.tsx` (3 pontos: estado, fetch e branch de render).
