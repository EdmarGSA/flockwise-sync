## Problema

Em `LoteDetalhe` (rota `/meus-lotes/:id`), o componente `TemperaturaUmidadeCard` busca **todos** os dispositivos IoT do galpão e renderiza um card padrão para cada um — inclusive os de **iluminação**, que não possuem sensores de temperatura/umidade. Resultado: o card "Iluminação Granja" aparece com `Temperatura --` e `Umidade --`, sem utilidade prática (conforme print enviado).

## Solução

Separar a renderização por tipo de dispositivo no `TemperaturaUmidadeCard.tsx`:

1. **Dispositivos de clima** (`funcao_automacao` = `aquecimento`, `ventilacao`, `nebulizacao`, `nenhuma` com sensor) → mantêm o layout atual de Temperatura/Umidade.
2. **Dispositivos de iluminação** (`funcao_automacao` = `iluminacao`) → renderizar um **mini card de iluminação** mais relevante, contendo:
   - Ícone `Lightbulb` + nome do dispositivo
   - Badge Online/Offline
   - **Estado atual**: Ligado/Desligado (com switch para alternar manualmente quando online)
   - **Intensidade atual** (`intensidade_atual %`) se `suporta_dimer`
   - **Programa/Faixa do dia**: horas de luz programadas hoje + janela acender/apagar (consulta à `programa_iluminacao_faixa` do programa vinculado ao lote, baseado em `idadeDias`)
   - Badge "Auto" se `automacao_ativa = true`
   - Timestamp do último evento (boot/comando) via `eventos_dispositivo_iot`
3. Se não houver leitura nem programa, mostrar mensagem amigável em vez de "—".

## Detalhes técnicos

- Arquivo principal: `src/components/lotes/TemperaturaUmidadeCard.tsx`
  - Adicionar fetch de `canais_dispositivo` (para `intensidade_atual`, `suporta_dimer`, `tipo_equipamento`) por dispositivo de iluminação
  - Adicionar fetch da faixa atual em `programa_iluminacao_faixa` via `lotes.programa_iluminacao_id` + `idadeDias`
  - Renderizar `<IluminacaoMiniCard />` (componente local) quando `funcao_automacao === 'iluminacao'`
  - Reutilizar `useDeviceControl.toggleDevice` para liga/desliga manual
- Não alterar contrato/props do componente; `LoteDetalhe.tsx` permanece igual
- Manter design tokens (sem cores hardcoded), reutilizar `Badge`, `Switch`, `Card` existentes
- Compatível com modo escuro

## Arquivos afetados

- `src/components/lotes/TemperaturaUmidadeCard.tsx` (split de renderização + novo subcomponente `IluminacaoMiniCard`)

Sem mudanças de banco nem de rotas.
