

# Plano: Tema Claro para o Modulo "Meus Lotes"

## Problema

O sistema inteiro usa apenas um tema escuro (fundo quase preto com texto claro). No campo, sob luz solar, isso dificulta muito a leitura no celular. O modulo "Meus Lotes" e "Detalhe do Lote" sao os mais usados no campo e precisam de um tema claro.

## Solucao

Adicionar um tema claro como padrao no `:root` do CSS, movendo o tema escuro atual para a classe `.dark`. Isso permite que o app use tema claro por padrao, mantendo compatibilidade com dark mode via toggle.

## Alteracoes

### 1. Arquivo: `src/index.css`

Redefinir as variaveis CSS:

- **`:root` (tema claro - novo padrao):**
  - Background: branco/cinza muito claro
  - Foreground: cinza escuro/preto
  - Cards: branco com bordas suaves
  - Primary: verde (manter identidade visual)
  - Muted/secondary: tons de cinza claro

- **`.dark` (tema escuro - atual):**
  - Mover os valores atuais do `:root` para `.dark`

Exemplo das novas variaveis claras:

```text
:root (CLARO)
  --background:      0 0% 100%        (branco)
  --foreground:      160 10% 15%      (cinza escuro)
  --card:            0 0% 99%         (branco levemente acinzentado)
  --primary:         145 60% 40%      (verde - mantido)
  --muted:           160 10% 95%      (cinza bem claro)
  --border:          160 10% 88%      (cinza claro)

.dark (ESCURO - valores atuais)
  --background:      160 30% 6%       (preto esverdeado)
  --foreground:      120 20% 95%      (branco)
  ... (todos os valores atuais)
```

### 2. Arquivo: `src/index.css` - Gradientes customizados

Atualizar os custom tokens (gradientes e sombras) para funcionarem em ambos os temas, criando versoes claras para `:root` e mantendo as atuais em `.dark`.

### 3. Nenhuma alteracao nos componentes

Como `MeusLotes.tsx`, `LoteDetalhe.tsx`, `LoteCard.tsx` e todos os dialogos ja usam classes semanticas do Tailwind (`bg-background`, `text-foreground`, `text-muted-foreground`, etc.), eles vao se adaptar automaticamente ao novo tema claro sem nenhuma alteracao de componente.

## Resultado

- O app inteiro fica com tema claro por padrao
- Melhor visibilidade no campo sob luz solar
- Tema escuro permanece disponivel via classe `.dark` (para uso futuro com toggle)
- Zero alteracoes em componentes React

## Arquivo a Modificar

| Arquivo | Operacao |
|---------|----------|
| `src/index.css` | MODIFICAR - Reorganizar variaveis CSS |

