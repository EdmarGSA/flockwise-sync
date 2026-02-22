

## Corrigir bug de modulos permitidos perdendo selecoes ao salvar

### Problema identificado

Ao salvar um membro, o sistema:
1. Apaga TODOS os registros de `user_modulos` do usuario
2. Insere apenas os modulos que foram **explicitamente alterados** na interface

Resultado: modulos que ja estavam configurados e nao foram tocados sao perdidos.

### Solucao

Alterar a logica para que apenas os modulos explicitamente alterados sejam atualizados (upsert individual), sem apagar os demais.

### Detalhes tecnicos

**Arquivo: `src/components/cadastro/MembroEditDialog.tsx`**

Substituir o bloco de "Handle module permission changes" (linhas 119-140) que faz DELETE ALL + INSERT, por uma logica que:
- Para cada modulo em `moduloChanges`, faz um upsert individual (delete + insert por modulo_id) em vez de deletar tudo
- Assim, modulos nao alterados permanecem intactos

Codigo atual (problematico):
```text
if (moduloChanges.length > 0) {
  // Delete existing user_modulos for this user  <-- APAGA TUDO
  await supabase.from("user_modulos").delete().eq("user_id", membro.id);
  // Insert new permissions  <-- SO INSERE OS ALTERADOS
  ...insert(moduloInserts);
}
```

Codigo corrigido:
```text
if (moduloChanges.length > 0) {
  for (const m of moduloChanges) {
    // Deleta apenas o modulo especifico
    await supabase.from("user_modulos")
      .delete()
      .eq("user_id", membro.id)
      .eq("modulo_id", m.modulo_id);
    
    // Re-insere com a nova configuracao
    await supabase.from("user_modulos")
      .insert({
        user_id: membro.id,
        modulo_id: m.modulo_id,
        permitido: m.permitido,
        nivel_acesso: m.nivel_acesso,
        integrado_id: integradoId || membro.integrado_id,
      });
  }
}
```

Nenhuma alteracao necessaria no `MembroModulosSection.tsx` -- ele ja reporta corretamente apenas as mudancas feitas pelo usuario.

