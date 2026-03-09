

# Ativar Integração IoT — Configurar Segredos eWeLink

## Situação Atual
- Edge functions `sync-sensors` e `sensor-webhook` já estão implementadas
- Página `/dispositivos-iot` já existe com UI de cadastro e sincronização
- Tabelas `dispositivos_iot` e `leituras_sensores` já criadas no banco
- **Faltam os 4 segredos** no backend para autenticar com a eWeLink Cloud API

## O que será feito

### 1. Configurar os 4 segredos no backend
Solicitar ao usuário a inserção de:

| Segredo | Valor | Onde encontrar |
|---------|-------|----------------|
| `EWELINK_APP_ID` | `5nYhS73SiUx8bWY2qfL45otG9tCuIC4a` | Já fornecido pelo console eWeLink |
| `EWELINK_APP_SECRET` | `****` | Console eWeLink → App → APP SECRET |
| `EWELINK_EMAIL` | Email da conta eWeLink | Conta usada no app eWeLink |
| `EWELINK_PASSWORD` | Senha da conta eWeLink | Mesma conta |

### 2. Atualizar edge function `sync-sensors`
- Corrigir a invocação no frontend (atualmente usa `method: 'GET'` com `body: null`, o que pode causar erro)
- Passar `integrado_id` como query parameter na chamada

### 3. Verificar config.toml
- Garantir que `sync-sensors` e `sensor-webhook` estejam com `verify_jwt = false` (webhook recebe chamadas externas)

## Resultado
Após configurar os segredos, o botão "Sincronizar" na página de Dispositivos IoT buscará as leituras dos Sonoff TH cadastrados na conta eWeLink e exibirá temperatura/umidade em tempo real.

