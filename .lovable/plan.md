
# Plano: Adicionar Link para Swagger UI na Interface

## Problema Identificado

A documentacao interativa Swagger UI foi criada em:
```
https://zqpjxtlfhxjtenhhzaax.supabase.co/functions/v1/sync-erp-docs
```

Porem, essa URL nao aparece em nenhum lugar da interface do Portal do Fornecedor. O desenvolvedor nao tem como descobrir que ela existe.

## Solucao Proposta

Adicionar um botao/link visivel na secao "Documentacao da API" do componente `FornecedorIntegracaoERPTab.tsx`.

## Arquivo a Modificar

| Arquivo | Operacao |
|---------|----------|
| src/components/fornecedor/FornecedorIntegracaoERPTab.tsx | MODIFICAR |

## Alteracoes no Componente

### Adicionar no Header da Secao de Documentacao

Incluir um botao "Abrir Documentacao Interativa" que abre o Swagger UI em nova aba.

```typescript
// Adicionar import
import { ExternalLink, BookOpen } from 'lucide-react';

// Na secao de Documentacao, adicionar botao no CardHeader
<Card>
  <CardHeader className="flex flex-row items-center justify-between">
    <div>
      <CardTitle className="text-lg flex items-center gap-2">
        <BookOpen className="h-5 w-5" />
        Documentacao da API
      </CardTitle>
      <CardDescription>
        Referencia e testes interativos para integracao ERP
      </CardDescription>
    </div>
    <Button 
      variant="default" 
      onClick={() => window.open(
        'https://zqpjxtlfhxjtenhhzaax.supabase.co/functions/v1/sync-erp-docs', 
        '_blank'
      )}
    >
      <ExternalLink className="h-4 w-4 mr-2" />
      Documentacao Interativa
    </Button>
  </CardHeader>
  ...
</Card>
```

### Adicionar Card Destacado para Swagger

Antes da secao de referencia rapida, adicionar um card promocional:

```typescript
<Card className="border-primary/50 bg-primary/5">
  <CardContent className="flex items-center justify-between py-4">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-primary/10 rounded-lg">
        <BookOpen className="h-6 w-6 text-primary" />
      </div>
      <div>
        <p className="font-medium">Documentacao Interativa (Swagger UI)</p>
        <p className="text-sm text-muted-foreground">
          Teste todas as acoes da API diretamente no navegador
        </p>
      </div>
    </div>
    <Button onClick={() => window.open(SWAGGER_URL, '_blank')}>
      <ExternalLink className="h-4 w-4 mr-2" />
      Abrir
    </Button>
  </CardContent>
</Card>
```

## Layout Final Esperado

A secao de documentacao tera:

1. Card destacado com link para Swagger UI (novo)
2. Referencia rapida com endpoint e headers (existente)
3. Lista de acoes disponiveis (existente)
4. Ciclo de vida do pedido (existente)

## Beneficios

| Beneficio | Descricao |
|-----------|-----------|
| Descoberta facil | Desenvolvedor encontra a URL sem precisar perguntar |
| Acesso rapido | Um clique para abrir a documentacao interativa |
| Visibilidade | Card destacado chama atencao para a ferramenta |
