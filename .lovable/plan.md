

# Bug: Mortalidade piscando (loop infinito de re-renders)

## Causa raiz

Ambos os hooks `useMortalidadeAlertaLotes` e `useCarenciaAlertaLotes` recebem arrays criados inline como dependências do `useEffect`:

```typescript
// Veterinario.tsx
const { mortalidadeMap } = useMortalidadeAlertaLotes(
  lotes.map(l => ({ ... })),  // novo array a cada render
  integradoId
);
const { carenciaMap } = useCarenciaAlertaLotes(
  lotes.map(l => l.id),       // novo array a cada render
  integradoId
);
```

Dentro dos hooks, o `useEffect` tem `[lotes, ...]` como dependência. Como `.map()` cria uma nova referência a cada render, o efeito dispara, faz `setState`, o que re-renderiza o componente pai, que cria novas referências, e o ciclo se repete infinitamente -- causando o "piscar".

## Correção

**Arquivo: `src/hooks/useMortalidadeAlerta.tsx`**
- Serializar `loteIds` com `JSON.stringify` e usar como dependência do `useEffect` em vez do array direto.

**Arquivo: `src/hooks/useCarenciaAlerta.tsx`**
- Mesma abordagem: `JSON.stringify(loteIds)` como dependência.

Exemplo da mudança:

```typescript
// Antes
useEffect(() => {
  if (!lotes.length || !integradoId) return;
  fetchMortalidade();
}, [lotes, integradoId]);

// Depois
const lotesKey = JSON.stringify(lotes.map(l => l.id));
useEffect(() => {
  if (!lotes.length || !integradoId) return;
  fetchMortalidade();
}, [lotesKey, integradoId]);
```

| Arquivo | Acao |
|---|---|
| `src/hooks/useMortalidadeAlerta.tsx` | Estabilizar dependencia do useEffect |
| `src/hooks/useCarenciaAlerta.tsx` | Estabilizar dependencia do useEffect |

