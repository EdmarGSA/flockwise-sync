## Problema

O card "Iluminação Granja" continua mostrando Temperatura/Umidade vazios. A causa: o componente `TemperaturaUmidadeCard` só classifica um dispositivo como iluminação quando `dispositivos_iot.funcao_automacao === 'iluminacao'`. Para esse dispositivo, o campo no banco está como `'nenhuma'`, mas o canal correspondente em `canais_dispositivo` tem `funcao_automacao = 'iluminacao'` e `tipo_equipamento = 'iluminacao'`.

Resultado: o componente o trata como dispositivo climático e renderiza o card padrão com `--`.

## Solução

Em `src/components/lotes/TemperaturaUmidadeCard.tsx`:

1. No batch `canais_dispositivo`, também selecionar `funcao_automacao` e `tipo_equipamento`.
2. Calcular um flag derivado `isIluminacao` por dispositivo:
   - `device.funcao_automacao === 'iluminacao'` **OU**
   - qualquer canal do dispositivo com `funcao_automacao === 'iluminacao'` ou `tipo_equipamento === 'iluminacao'`.
3. Usar esse flag para:
   - pular o fetch de `leituras_sensores`,
   - definir `funcao_automacao` efetivo no objeto resultante como `'iluminacao'` (para que o split `climaticos` vs `iluminacao` funcione),
   - propagar `intensidade_atual` / `suporta_dimer` do canal de iluminação.

Sem mudanças de banco. Apenas ajuste de classificação no componente.

## Arquivos afetados

- `src/components/lotes/TemperaturaUmidadeCard.tsx`
