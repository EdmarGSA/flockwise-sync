# Adicionar card "Câmeras" na Home

## Problema
O módulo `cameras` está cadastrado no backend e as rotas `/cameras`, `/cameras/novo` e `/cameras/:id` funcionam, mas o card não aparece na Home porque não foi incluído no array `modules` em `src/pages/Home.tsx`.

## Mudança

**Arquivo:** `src/pages/Home.tsx`

1. Importar o ícone `Camera` de `lucide-react` (junto com os outros já importados).

2. Adicionar uma nova entrada ao array `modules`, logo após o item "Cockpit Thoth":

```ts
{
  id: 'cameras',
  title: 'Câmeras',
  description: 'DVRs Intelbras e snapshots dos galpões',
  icon: Camera,
  path: '/cameras',
  color: 'from-cyan-500 to-cyan-700',
  systemAvailable: true,
}
```

O `id: 'cameras'` faz o cruzamento automático com o módulo já cadastrado no backend (`modulos.codigo = 'cameras'`), então o controle de permissão por papel (admin/integrado/criador/veterinario) já funciona via `useModuleAccess`.

## Resultado esperado
- Card "Câmeras" aparece na grade de módulos da Home para usuários com permissão.
- Clique navega para `/cameras` (lista de DVRs), com botão "+ Novo DVR" → `/cameras/novo`, e botão "Editar" no detalhe do DVR → `/cameras/:id`.
