

## Mudança de Arquitetura: Conta eWeLink Mestre

### Conceito

Em vez de cada integrado fazer OAuth com sua própria conta eWeLink, o sistema usa **uma única conta eWeLink mestre** (do administrador) onde todos os Sonoff TH são pareados. Cada integrado apenas cadastra o `device_id_ewelink` do seu sensor.

### Fluxo novo

```text
1. Admin pareia todos os Sonoff TH na conta eWeLink mestre (app eWeLink)
2. Admin faz OAuth UMA VEZ no sistema (já feito!)
3. Admin ou integrado cadastra dispositivo informando o device_id
4. No sync, o sistema usa o token mestre para ler TODOS os dispositivos
5. Cruza device_id da API com device_id cadastrado no DB por integrado
6. Grava leituras para cada dispositivo encontrado
```

### Mudanças

#### 1. `sync-sensors/index.ts` — Sync com token mestre

- Na action `sync`: em vez de buscar token por `integrado_id`, buscar **qualquer token válido** da tabela `ewelink_tokens` (o token mestre)
- Buscar TODOS dispositivos da API eWeLink (conta mestre)
- Buscar TODOS dispositivos ativos do DB (sem filtrar por integrado_id)
- Cruzar por `device_id_ewelink` e gravar leituras
- Na action `list-devices`: usar token mestre para listar dispositivos disponíveis

#### 2. `sync-sensors/index.ts` — OAuth mestre

- Na action `oauth-url`: não exigir `integrado_id` (o admin conecta a conta mestre)
- Guardar token com um `integrado_id` fixo (ex: o do admin) ou campo especial

#### 3. `DispositivosIoT.tsx` — UI simplificada

- Manter botão "Conectar eWeLink" apenas para admin (primeira vez)
- No cadastro de dispositivo: adicionar botão "Buscar dispositivos" que lista os sensores disponíveis na conta mestre, permitindo selecionar qual device_id vincular
- Remover necessidade de o integrado fazer OAuth

#### 4. `ewelink_tokens` — Token mestre

- O token armazenado serve para toda a plataforma
- O sync busca o primeiro token válido independente do integrado_id

### Detalhes técnicos

**Sync refatorado:**
```typescript
// Buscar token mestre (qualquer token válido)
const { data: tokenRecord } = await supabase
  .from("ewelink_tokens")
  .select("*")
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

// Buscar TODOS dispositivos da API eWeLink (conta mestre)
const ewelinkDevices = await getEwelinkDevices(accessToken, appId, region);

// Buscar TODOS dispositivos do DB (todos integrados)
const { data: dbDevices } = await supabase
  .from("dispositivos_iot")
  .select("*")
  .eq("ativo", true);
// Se integradoId fornecido, filtrar apenas os dele

// Cruzar por device_id_ewelink
for (const dev of dbDevices) {
  const params = deviceMap.get(dev.device_id_ewelink);
  if (!params) continue;
  // gravar leitura...
}
```

**List-devices para seleção:**
```typescript
// Retorna todos dispositivos da conta mestre
// Frontend mostra lista para o integrado escolher qual é o dele
const devices = ewelinkDevices.map(d => ({
  deviceId: d.itemData.deviceid,
  name: d.itemData.name,
  online: d.itemData.params?.online,
  temperatura: parseFloat(d.itemData.params?.currentTemperature),
  umidade: parseFloat(d.itemData.params?.currentHumidity),
}));
```

**UI de cadastro de dispositivo:**
- Botão "Buscar da eWeLink" abre dialog com lista de sensores da conta mestre
- Integrado seleciona o sensor → preenche automaticamente o `device_id_ewelink` e nome
- Alternativa: digitar manualmente o device_id

