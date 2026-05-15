# Programas de Iluminação — salvar/atualizar confiável

## Diagnóstico

Em `src/pages/ProgramasIluminacao.tsx`, todo `Input` de cada faixa chama `atualizarFaixa` no `onChange`, que dispara `supabase.update()` a cada tecla. Problemas observados:

1. **Race condition**: digitar "18" envia UPDATE com `1` e depois com `18`. Se o segundo resolver antes do `fetchFaixas` do primeiro, o `setFaixas` sobrescreve o valor recém-digitado pelo valor antigo do banco.
2. **Sair antes do debounce de tecla**: ao mudar campo e clicar fora rápido (ou navegar), o `onChange` do número só dispara se o valor foi parseado; valores intermediários ("0", vazio) podem ser persistidos como último estado.
3. **Sem indicador**: usuário não sabe se salvou. Sem botão explícito, sem aviso de "não salvo".
4. **`horas_luz` recalculado só quando muda `blocos`**: alterar acender/apagar separadamente atualiza `blocos` mas o `fetchFaixas` posterior pode chegar antes do `update` do outro campo.

## O que mudar (apenas frontend, no arquivo `ProgramasIluminacao.tsx`)

### 1. Estado local com "draft" por faixa
- Adicionar `Map<faixaId, Faixa>` de rascunhos editados (`drafts`) e `Set<faixaId>` de faixas modificadas (`dirty`).
- `onChange` dos inputs **só atualiza o draft local**, não o banco.
- Recalcular `horas_luz` no draft em tempo real (preview), mas só persistir ao salvar.

### 2. Botão "Salvar" por linha + "Salvar todas" no header
- Coluna extra à direita com botão `Salvar` (ícone `Save`) habilitado quando a linha está dirty.
- No header da tabela, botão `Salvar tudo` que itera sobre faixas dirty.
- Ambos chamam um único `salvarFaixa(faixa)` que faz UPDATE com **todos os campos** da faixa de uma vez (atômico) e remove do `dirty` em caso de sucesso.
- Após salvar tudo, um único `fetchFaixas` final.

### 3. Indicador visual
- Linha dirty: fundo `bg-amber-50/50` ou borda esquerda âmbar + badge "não salvo".
- Toast de sucesso/erro por operação.

### 4. Proteção ao sair
- `useEffect` com `beforeunload` listener quando `dirty.size > 0` ("Há alterações não salvas").
- No botão `ArrowLeft` (voltar), `confirm()` antes de navegar se houver dirty.
- Ao trocar de aba (`Tabs onValueChange`), idem.

### 5. Switch "Padrão" e operações de criar/remover faixa/programa permanecem com persistência imediata (são ações discretas, não digitação).

## Arquivos

- **Editar**: `src/pages/ProgramasIluminacao.tsx` (único arquivo)

## Fora de escopo

- Sem mudança de schema, sem mexer em `auto-iluminacao` edge function.
- Sem alterar `CurvaFotoperiodoChart` (já consome `faixas` local — vai refletir o draft automaticamente).
