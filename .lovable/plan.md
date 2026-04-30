## Objetivo

Substituir o diálogo modal de cadastro de DVR por uma página dedicada acessível em `/cameras/novo`, mantendo todos os campos atuais e o botão **Testar conexão** antes de salvar.

## Alterações

### 1. Nova página `src/pages/CameraNovoDvr.tsx`
- Header com botão **Voltar** que navega para `/cameras` (usando `navigate("/cameras")`).
- Título "Novo DVR Intelbras" + descrição.
- Card com o `Alert` de pré-requisitos (DDNS, porta 443, usuário read-only, CGI).
- Formulário com os mesmos campos do modal atual:
  - Nome, Host (DDNS), Porta HTTPS (default 443), Porta RTSP (default 554), Usuário, Senha, Nº de canais.
- Ações no rodapé do card:
  - **Cancelar** (volta para `/cameras`).
  - **Testar conexão** (chama `intelbras-bridge/test-connection`, exibe `Alert` com resultado).
  - **Salvar** (cifra senha via `intelbras-bridge/encrypt-password`, insere em `cameras_dvr`, toast de sucesso, redireciona para `/cameras`).
- Usa `useIntegradoId` para o `integrado_id` ao inserir.
- Estilo consistente com o restante (mesmo layout `min-h-screen bg-background p-4 sm:p-6 max-w-2xl mx-auto`).

### 2. Rota em `src/App.tsx`
- Importar `CameraNovoDvr`.
- Adicionar rota protegida logo abaixo de `/cameras`:
  ```tsx
  <Route path="/cameras/novo" element={
    <ProtectedRoute>
      <ModuleProtectedRoute moduleCode="cameras">
        <CameraNovoDvr />
      </ModuleProtectedRoute>
    </ProtectedRoute>
  } />
  ```

### 3. Atualizar `src/pages/Cameras.tsx`
- Remover o `Dialog` inteiro de cadastro e os estados associados (`dialogOpen`, `form`, `testando`, `testResult`, `salvando`, `handleTestar`, `handleSalvar`).
- Substituir o `<DialogTrigger>` do header por `<Button onClick={() => navigate("/cameras/novo")}>` mantendo "Novo DVR".
- Substituir o `<Button onClick={() => setDialogOpen(true)}>` do empty state por `navigate("/cameras/novo")`.
- Manter `loadDvrs`, detalhe do DVR, captura de snapshots, exclusão — sem alteração.

## Comportamento final

- Em `/cameras`, clicar em **+ Novo DVR** navega para `/cameras/novo`.
- Em `/cameras/novo`, o usuário preenche o formulário, pode **Testar conexão** (resultado inline) e **Salvar**.
- Após salvar com sucesso, retorna automaticamente para `/cameras` com a lista atualizada.
- Botão **Voltar** no topo e **Cancelar** no rodapé permitem retornar sem salvar.