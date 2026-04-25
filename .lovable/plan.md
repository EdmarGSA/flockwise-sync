## Contexto: o que já existe

A infraestrutura **por organização** já está implementada na migração anterior. Cada `integrado_id` (organização) pode ter **um único token** público Mapbox isolado.

- Tabela `public.mapbox_config` com `UNIQUE(integrado_id)` — garante 1 token por org.
- RLS ativa: SELECT/INSERT/UPDATE/DELETE restritos a `integrado_id = get_my_integrado_id()` ou superadmin.
- Hook `useMapboxToken` lê via `integrado_id` do perfil logado.
- Tela `/configuracoes/mapbox` faz upsert por `integrado_id`.
- Componente `MapeamentoGPS` consome `config.public_token`.

**Atualmente: 0 tokens cadastrados na base.** Nenhuma organização ainda configurou.

## Lacunas identificadas

1. **Descoberta**: usuário precisa abrir Configurações → Mapbox para saber que existe. A aba "Mapa GPS" em /gestao-campo mostra apenas erro genérico se não houver token.
2. **Permissão**: hoje qualquer usuário da org com RLS pode salvar/apagar o token. Deveria ser restrito a `admin`/`integrado` (dono da org).
3. **Validação**: o token é aceito apenas com prefixo `pk.`. Não há teste real contra a API Mapbox para verificar se é válido e se tem escopo correto.
4. **Visibilidade do token**: campo exibido em texto puro. Token público é seguro, mas UX de "show/hide" + "copiar" + "mascarar" melhora confiança.
5. **Auditoria**: sem `created_by` / `updated_by` para rastrear quem alterou.
6. **Multi-org / superadmin**: superadmin pode ler/escrever via RLS, mas não há UI para listar tokens de todas as orgs no Backoffice.
7. **Onboarding**: novo integrado não tem nenhum hint de que precisa configurar Mapbox para usar mapas.

## Plano

### 1. Banco: auditoria e proteção por papel

Migração para adicionar campos de auditoria e endurecer RLS:

- Adicionar colunas `created_by uuid`, `updated_by uuid` em `mapbox_config`.
- Trigger `BEFORE INSERT/UPDATE` que preenche `created_by`/`updated_by` com `auth.uid()`.
- Substituir policies `INSERT/UPDATE/DELETE` para exigir, além do match de organização, `has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'integrado') OR is_superadmin()`. Policy de SELECT permanece aberta a todos da org (hook precisa ler).

### 2. UI Configurações: experiência de gestão

Em `src/pages/ConfiguracaoMapbox.tsx`:

- Mostrar token mascarado por padrão (`pk.eyJ1•••••••xyz`) com botões 👁 mostrar / 📋 copiar.
- Botão **"Testar token"** que faz `fetch('https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=...')`. Se 200 → toast verde "Token válido". Se 401 → toast vermelho explicando.
- Exibir **quem cadastrou e quando** (a partir de `created_by`/`updated_by` + join leve com `profiles.full_name`).
- Bloquear botões Salvar/Remover quando o usuário não for admin/integrado/superadmin (mensagem: "Apenas administradores podem alterar o token desta organização").
- Mini-mapa de preview (200px) usando o token e coords default ao salvar com sucesso, para validação visual.

### 3. UX Gestão de Campo: prompt contextual

Em `src/components/campo/MapeamentoGPS.tsx`:

- Quando `config` é `null` e usuário é admin: card amigável com CTA **"Configurar token Mapbox agora"** que leva direto a `/configuracoes/mapbox`.
- Quando `config` é `null` e usuário **não** é admin: card explicando "Peça ao administrador da fazenda para configurar o token Mapbox".

### 4. Backoffice (superadmin): visão multi-org

Nova aba/seção em `src/pages/backoffice/BackofficeFerramentas.tsx` (ou `BackofficeGranjas.tsx`):

- Lista de organizações com status do token: ✅ Configurado / ❌ Sem token / ⚠️ Token inválido (testado on-demand).
- Coluna com prefixo do token, data de atualização e responsável.
- Permite superadmin disparar reset/remoção em casos de suporte.

### 5. Onboarding (opcional, leve)

- Banner discreto no topo de `/gestao-campo` (apenas para admins) quando a aba "Mapa GPS" existe mas não há token: "Mapeamento GPS desativado. Configure seu token Mapbox em Configurações." Dispensável com X (salvo em `localStorage`).

## Detalhes técnicos

### Migração SQL (resumo)

```sql
ALTER TABLE public.mapbox_config
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

CREATE OR REPLACE FUNCTION public.set_mapbox_config_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN NEW.created_by := COALESCE(NEW.created_by, auth.uid()); END IF;
  NEW.updated_by := auth.uid();
  RETURN NEW;
END $$;

CREATE TRIGGER trg_mapbox_config_audit
BEFORE INSERT OR UPDATE ON public.mapbox_config
FOR EACH ROW EXECUTE FUNCTION public.set_mapbox_config_audit();

-- Endurecer policies: exigir papel admin/integrado/superadmin para escrita
DROP POLICY mapbox_config_insert_own_org ON public.mapbox_config;
CREATE POLICY mapbox_config_insert_own_org ON public.mapbox_config
FOR INSERT TO authenticated
WITH CHECK (
  (integrado_id = get_my_integrado_id())
  AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'integrado') OR is_superadmin())
);
-- (idem para UPDATE e DELETE)
```

### Teste de token (client-side)

```ts
const r = await fetch(
  `https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=${encodeURIComponent(token)}`
);
if (r.status === 200) toast.success('Token válido');
else if (r.status === 401) toast.error('Token inválido ou sem permissão');
else toast.error(`Erro ${r.status} ao validar`);
```

### Arquivos afetados

- **Nova migração** `supabase/migrations/<timestamp>_mapbox_audit_and_role.sql`
- **Editar** `src/pages/ConfiguracaoMapbox.tsx` (mascarar, testar, auditoria, gating por papel)
- **Editar** `src/components/campo/MapeamentoGPS.tsx` (CTA quando sem token)
- **Editar** `src/pages/backoffice/BackofficeFerramentas.tsx` (lista multi-org para superadmin)
- **Reusar** hooks existentes: `useMapboxToken`, `useAuth`, `has_role` via consulta a `user_roles`

## Fora de escopo (decisões a confirmar depois)

- **Token global de fallback** (single token compartilhado entre todas as orgs como plano free do app): não recomendado — explode quota de 50k/mês rapidamente e impossibilita atribuir custo. Mantemos 1 token por org.
- **Edge function proxy** para esconder o token do client: desnecessário para tokens **públicos** `pk.*` (são desenhados para uso no browser). Só faria sentido se fôssemos usar token secreto `sk.*`.
- **Restrição de URL no Mapbox** (allowlist de domínios no painel Mapbox): orientação a ser dada na tela ao usuário, mas é configuração externa.
