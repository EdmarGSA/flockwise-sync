## Problema

O roteador já usa a porta 80 da WAN (admin do próprio roteador), então o usuário não consegue redirecionar `80 → DVR` para usar HTTP. O DVR atual responde em HTTPS:443, mas a conexão falha (provavelmente certificado/firewall) e o usuário quer poder testar HTTP em uma porta alternativa (ex.: 8080, 8081).

Hoje isso é bloqueado pelo `validateProtocoloPorta`, que **exige** porta 80 para HTTP e 443 para HTTPS. Qualquer valor diferente é rejeitado no formulário antes mesmo de tentar conectar.

```
Protocolo HTTP  → porta_http  DEVE ser 80
Protocolo HTTPS → porta_https DEVE ser 443
```

Isso impede o cenário real: porta 80 ocupada pelo roteador, ou provedor bloqueando 443, exigindo redirecionamento tipo `WAN 8080 → LAN 80 do DVR`.

## Solução

Liberar portas customizadas mantendo validação de range (1-65535) e apenas **avisando** (não bloqueando) quando a porta divergir do padrão.

### 1. `src/lib/utils/validateProtocoloPorta.ts`
- Remover a regra de igualdade obrigatória com a porta padrão.
- Manter validação de range (1-65535).
- Adicionar campo opcional `aviso?: string` no resultado para sinalizar "porta não padrão" sem invalidar.
- `ok` continua `true` para portas válidas fora do padrão; `false` apenas para porta inválida (vazia / fora do range).

### 2. `src/pages/CameraNovoDvr.tsx` e `src/pages/CameraEditarDvr.tsx`
- `validarProtocoloPorta(...)`: passar a tratar `aviso` como mensagem informativa (badge/texto secundário) em vez de erro bloqueante.
- Ao trocar protocolo, **não** sobrescrever automaticamente para 80/443 se o usuário já tinha digitado uma porta customizada — preencher o padrão apenas quando o campo correspondente ainda estiver no valor default.
- Habilitar o botão "Testar conexão" e "Salvar" mesmo com porta não padrão.
- Atualizar texto auxiliar do campo: "Use a porta externa configurada no redirecionamento NAT do roteador (não precisa ser 80/443)."

### 3. Edge function `supabase/functions/intelbras-bridge/index.ts`
- Já usa `porta_http`/`porta_https` do registro sem assumir padrão (`resolveDvrConn`). Nenhuma mudança de lógica necessária.
- Ajustar somente a mensagem de erro de timeout para não sugerir "porta 80/443" fixa — usar a porta efetivamente configurada (já faz isso via `u.port`). Confirmar e manter.

### 4. Mensagens de causa provável (UI de erro do teste de conexão)
No card vermelho de "Possíveis causas" mostrado quando o teste falha, trocar:
- "Porta 443 não está redirecionada no roteador" → "A porta externa configurada (`{porta}`) não está redirecionada no roteador para o IP do DVR"
- Adicionar dica: "Se a porta 80 do roteador já é usada pelo painel admin, escolha outra porta externa (ex.: 8080) e redirecione para a porta 80 ou 443 do DVR."

## Arquivos afetados

- `src/lib/utils/validateProtocoloPorta.ts` (regra)
- `src/pages/CameraNovoDvr.tsx` (form + mensagens)
- `src/pages/CameraEditarDvr.tsx` (form + mensagens)

Sem migração de banco — colunas `porta_http` / `porta_https` já existem e aceitam inteiros arbitrários.
