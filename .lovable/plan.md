
# Plano: Validade Pre-programada, Custo Real do Ovo e QR Code de Rastreabilidade

## 1. Validade Pre-programada (Dias de Validade Configuravel)

Atualmente a validade e calculada com valor fixo de 30 dias no codigo. A proposta e criar uma configuracao persistente no banco de dados.

### Banco de Dados
- Criar tabela `config_validade_ovos` com colunas:
  - `id` (uuid, PK)
  - `integrado_id` (uuid, FK)
  - `dias_validade_padrao` (integer, default 30) -- validade geral
  - `dias_validade_branco` (integer, nullable) -- override por tipo
  - `dias_validade_castanho` (integer, nullable)
  - `dias_validade_vermelho` (integer, nullable)
  - `dias_validade_caipira` (integer, nullable)
  - `created_at`, `updated_at`
- RLS: usuario so ve/edita seus proprios registros

### Frontend
- Na tela de Estoque de Ovos, adicionar um botao de "Configurar Validade" (icone Settings2 ja importado)
- Dialog simples com campos para dias de validade por tipo de ovo
- Ao registrar entrada manual, o sistema consulta a configuracao e calcula `data_validade = data_producao + dias_validade` automaticamente, sem precisar editar manualmente
- O usuario ainda pode alterar a data de validade se necessario

---

## 2. Custo Real do Ovo (Composicao de Custos)

O custo do ovo hoje e informado manualmente. A proposta e calcular automaticamente baseado em:

- **Racao consumida**: custo da racao entregue ao lote (via `solicitacoes_racao`)
- **Medicamentos**: custo dos tratamentos no lote (via `tratamentos_lote.custo_total`)
- **Custo das pintinhas**: valor registrado no lote (campo `custo_aves` na tabela `lotes`)
- **Custos fixos diarios**: ja existentes em `config_custo_postura` (custo_ave_dia, mao_obra, outros)

### Banco de Dados
- Adicionar colunas na tabela `estoque_ovos`:
  - `custo_racao` (numeric, default 0) -- parcela do custo de racao
  - `custo_medicamentos` (numeric, default 0) -- parcela de medicamentos
  - `custo_pintinhas` (numeric, default 0) -- rateio do custo das aves
  - `custo_fixo` (numeric, default 0) -- custos fixos diarios rateados

### Frontend
- No formulario de entrada manual, ao selecionar o lote, o sistema calcula automaticamente:
  1. Busca custo total de racao do lote (soma de `solicitacoes_racao` recebidas, cruzando com custo medio do produto)
  2. Busca custo total de medicamentos do lote (soma de `tratamentos_lote.custo_total`)
  3. Busca `custo_aves` do lote (custo das pintinhas)
  4. Busca config_custo_postura para custos fixos
  5. Rateia tudo pelo total de ovos produzidos no lote ate o momento
  6. Preenche `custo_unitario` automaticamente com a soma
- Exibir breakdown do custo na tabela (tooltip ou coluna expandida)

---

## 3. QR Code com Rastreabilidade

### Abordagem
- Usar geracao de QR Code client-side (sem dependencia externa) via biblioteca leve ou canvas nativo
- Cada QR Code contem uma URL com dados codificados: lote_interno, data_producao, data_validade, tipo_ovo, classificacao, origem (nucleo/galpao)

### Implementacao
- Instalar dependencia `qrcode` (ou `qrcode.react`) para gerar QR codes
- Modificar o `EtiquetaCaixaOvosDialog` para incluir QR Code em cada etiqueta no PDF
- O QR Code contera uma URL para uma pagina publica de rastreio: `/rastreio/{lote_interno}`
- Criar pagina publica `src/pages/RastreioOvos.tsx`:
  - Recebe o lote_interno como parametro da URL
  - Busca dados do lote no banco (sem autenticacao necessaria, dados limitados)
  - Exibe: produtor, tipo, classificacao, data de producao, data de validade, origem (nucleo)
  - Design limpo para consumidor final

### Banco de Dados
- Criar tabela `rastreio_ovos_publico` (view ou tabela materializada) com dados limitados para consulta publica sem RLS restritivo
- Ou usar RLS com policy de leitura publica (SELECT para anon role) na tabela estoque_ovos com colunas limitadas via view

---

## Resumo de Alteracoes

| Arquivo/Recurso | Operacao |
|---|---|
| Migration SQL | CRIAR tabela `config_validade_ovos` + colunas extras em `estoque_ovos` + view publica rastreio |
| `src/pages/EstoqueOvos.tsx` | MODIFICAR - config validade, calculo custo automatico |
| `src/components/ovos/ConfigValidadeOvosDialog.tsx` | CRIAR - dialog de configuracao de validade |
| `src/components/ovos/EtiquetaCaixaOvosDialog.tsx` | MODIFICAR - adicionar QR Code nas etiquetas |
| `src/pages/RastreioOvos.tsx` | CRIAR - pagina publica de rastreio |
| `src/App.tsx` | MODIFICAR - adicionar rota /rastreio/:lote |
| `package.json` | MODIFICAR - adicionar dependencia `qrcode` |

## Sequencia de Implementacao

1. Migration do banco (tabela config + colunas custo + view rastreio)
2. Dialog de configuracao de validade
3. Logica de calculo automatico de custo no formulario de entrada
4. Geracao de QR Code nas etiquetas
5. Pagina publica de rastreio
