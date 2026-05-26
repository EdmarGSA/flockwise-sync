## Problema

Ao aprovar uma sugestão do Brain (ou clicar em "Executar agora") a UI mostra `Failed to send a request to the Edge Function`. A causa: a função `brain-dispatcher` existe em `supabase/functions/brain-dispatcher/index.ts` mas nunca foi deployada (chamada retorna 404 NOT_FOUND).

A mesma lacuna pode existir para a função `brain-iluminacao` criada recentemente.

## Plano

1. Deploy das edge functions pendentes:
   - `brain-dispatcher`
   - `brain-iluminacao` (verificar e deployar se necessário)
2. Validar com `curl_edge_functions` que `brain-dispatcher` responde 200 com `{ ok: true, processados: N }`.
3. Confirmar via logs que ao aprovar uma sugestão a execução ocorre sem erro.

Nenhuma mudança em código ou schema é necessária — apenas deploy.