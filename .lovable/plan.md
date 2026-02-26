

## Adicionar Botão "Sair" para Criador, Veterinário e Integrado

### Problema
Usuários com papel criador, veterinário ou integrado são redirecionados para suas páginas dedicadas (`/meus-lotes`, `/veterinario`) e não têm nenhum botão de logout visível. Ficam presos no sistema.

### Solução
Adicionar um botão "Sair" no header de cada página restrita. Como essas páginas já possuem um header com ícone e título, basta adicionar um botão `LogOut` no canto direito.

### Alterações

**1. `src/pages/MeusLotes.tsx`**
- Importar `LogOut` do lucide-react e `signOut` do `useAuth`
- Adicionar botão "Sair" no header da página (ao lado do título ou no canto superior direito)
- Ao clicar: `await signOut()` → `navigate('/')`

**2. `src/pages/Veterinario.tsx`**
- Mesmo padrão: importar `LogOut`, adicionar botão "Sair" no header
- Ao clicar: `await signOut()` → `navigate('/')`

**3. `src/pages/VeterinarioLote.tsx`** (página de detalhe do lote veterinário)
- Verificar se já tem botão voltar; o logout principal fica na lista, então não precisa duplicar aqui

### Design do botão
- `variant="ghost"` com ícone `LogOut` + texto "Sair" em telas maiores
- Posicionado no canto superior direito do header existente
- Cor `text-destructive` para destacar como ação de saída

