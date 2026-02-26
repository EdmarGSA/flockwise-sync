

## Redirecionar criador direto para /meus-lotes

Atualmente, usuarios criadores sao redirecionados para `/criador`. A mudanca e simples: trocar o destino de `/criador` para `/meus-lotes` em todos os pontos de redirecionamento.

### Alteracoes em `src/App.tsx`

1. **`CriadorRedirectWrapper`** (linha 131): Trocar `Navigate to="/criador"` por `Navigate to="/meus-lotes"`

2. **`PublicRoute`** (linha 149): Trocar `Navigate to="/criador"` por `Navigate to="/meus-lotes"`

Isso faz com que o criador, ao logar ou acessar `/home`, va direto para a tela de lotes.

