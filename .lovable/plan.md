

# Plano: Catálogo Visual Estilo Marketplace

## Resumo

Transformar o catálogo de produtos do Portal do Fornecedor de uma tabela simples para uma interface visual estilo marketplace (Mercado Livre), com:
- Cards visuais com foto do produto
- Preço em destaque
- Informações do produto
- Modo "vitrine" para compartilhar com clientes

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────────┐
│                      CATÁLOGO VISUAL                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ARMAZENAMENTO                                                      │
│  └── Bucket: catalogo-fornecedor (Lovable Cloud Storage)            │
│  └── Caminho: {fornecedor_id}/{produto_id}.jpg                      │
│                                                                     │
│  BANCO DE DADOS                                                     │
│  └── Nova coluna: imagem_url (TEXT) em produtos_catalogo_fornecedor │
│                                                                     │
│  INTERFACE - 3 MODOS DE VISUALIZAÇÃO                                │
│  ├── Grid de Cards (padrão) - Visual estilo marketplace            │
│  ├── Tabela (existente) - Para gestão rápida                        │
│  └── Vitrine (novo) - Modo leitura para compartilhar                │
│                                                                     │
│  COMPARTILHAMENTO                                                   │
│  └── Gerar link público da vitrine                                  │
│  └── Exportar PDF do catálogo                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Fase 1: Infraestrutura de Imagens

### 1.1 Criar bucket de armazenamento

```sql
-- Criar bucket público para imagens do catálogo
INSERT INTO storage.buckets (id, name, public)
VALUES ('catalogo-fornecedor', 'catalogo-fornecedor', true);

-- Política: fornecedor pode gerenciar suas próprias imagens
CREATE POLICY "Fornecedor gerencia imagens próprias"
ON storage.objects FOR ALL
USING (
  bucket_id = 'catalogo-fornecedor' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = (
    SELECT fornecedor_global_id::text FROM profiles WHERE id = auth.uid()
  )
);

-- Política: leitura pública (para vitrine)
CREATE POLICY "Leitura pública catálogo"
ON storage.objects FOR SELECT
USING (bucket_id = 'catalogo-fornecedor');
```

### 1.2 Adicionar coluna de imagem na tabela

```sql
ALTER TABLE public.produtos_catalogo_fornecedor
  ADD COLUMN IF NOT EXISTS imagem_url TEXT;
```

---

## Fase 2: Formulário com Upload de Imagem

### Arquivo: `src/components/fornecedor/ProdutoCatalogoForm.tsx`

Adicionar seção de upload de imagem:

| Componente | Descrição |
|------------|-----------|
| Preview da imagem | Mostra imagem atual ou placeholder |
| Input file | Aceita JPG, PNG, WebP (max 2MB) |
| Botão remover | Permite excluir imagem existente |
| Validação | Tamanho e tipo de arquivo |

Lógica de upload:
1. Usuário seleciona arquivo
2. Validar tamanho (max 2MB) e tipo
3. Upload para bucket: `catalogo-fornecedor/{fornecedor_id}/{produto_id}.jpg`
4. Salvar URL pública na coluna `imagem_url`

---

## Fase 3: Nova Interface Visual do Catálogo

### Arquivo: `src/components/fornecedor/FornecedorCatalogoTab.tsx`

### 3.1 Seletor de Modo de Visualização

```text
┌──────────────────────────────────────────────────────────────┐
│  [Grid ■] [Tabela ≡] [Vitrine 👁]           🔍 Buscar...    │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Modo Grid (Cards Visuais)

```text
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    [IMAGEM]     │  │    [IMAGEM]     │  │    [IMAGEM]     │
│                 │  │                 │  │                 │
│  Ração Inicial  │  │  Milho Grão     │  │  Núcleo Postura │
│  Marca ABC      │  │  Safra 24/25    │  │  Premium        │
│                 │  │                 │  │                 │
│  R$ 185,00 /SC  │  │  R$ 72,50 /SC   │  │  R$ 320,00 /SC  │
│                 │  │                 │  │                 │
│  ✓ 45 em estoque│  │  ⚠ 8 (baixo)   │  │  ✗ Sem estoque  │
│                 │  │                 │  │                 │
│  [✏️] [🗑️]      │  │  [✏️] [🗑️]      │  │  [✏️] [🗑️]      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

Características do card:
- Imagem com aspect ratio 1:1 (quadrada)
- Placeholder se sem imagem (ícone de pacote)
- Nome do produto em destaque
- Marca/categoria em texto secundário
- Preço grande e visível
- Badge de status do estoque (cores)
- Botões de ação no hover

### 3.3 Modo Tabela (Existente)

Manter a tabela atual como opção para quem prefere gestão rápida em lista.

### 3.4 Modo Vitrine (Novo)

Versão simplificada para compartilhar:
- Remove botões de editar/excluir
- Remove informações de custo
- Remove estoque (opcional: mostrar "Disponível" ou "Sob consulta")
- Layout otimizado para impressão/PDF

---

## Fase 4: Compartilhamento com Clientes

### 4.1 Gerar Link da Vitrine

Criar rota pública: `/vitrine/{fornecedor_id}`

| Elemento | Descrição |
|----------|-----------|
| URL amigável | Sem necessidade de login |
| Logo do fornecedor | Se tiver cadastrado |
| Grid de produtos | Apenas ativos com estoque |
| Contato | WhatsApp/Email do fornecedor |

### 4.2 Exportar PDF (Opcional - Fase Futura)

Usar jsPDF (já instalado) para gerar catálogo impresso.

---

## Arquivos a Criar

| # | Arquivo | Descrição |
|---|---------|-----------|
| 1 | `supabase/migrations/XXXX_catalogo_imagens.sql` | Bucket + coluna imagem_url |
| 2 | `src/components/fornecedor/ProdutoCard.tsx` | Card visual do produto |
| 3 | `src/components/fornecedor/ImageUpload.tsx` | Componente de upload |
| 4 | `src/pages/VitrineFornecedor.tsx` | Página pública da vitrine |

## Arquivos a Modificar

| # | Arquivo | Descrição |
|---|---------|-----------|
| 1 | `src/components/fornecedor/FornecedorCatalogoTab.tsx` | Adicionar grid view + toggle |
| 2 | `src/components/fornecedor/ProdutoCatalogoForm.tsx` | Upload de imagem |
| 3 | `src/App.tsx` | Adicionar rota /vitrine/:id |
| 4 | `src/hooks/useFornecedorData.tsx` | Incluir imagem_url na query |

---

## Detalhes Técnicos

### Componente ProdutoCard

```tsx
interface ProdutoCardProps {
  produto: ProdutoCatalogo;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean; // false no modo vitrine
}

function ProdutoCard({ produto, onEdit, onDelete, showActions = true }: ProdutoCardProps) {
  return (
    <Card className="group overflow-hidden">
      {/* Imagem */}
      <AspectRatio ratio={1}>
        {produto.imagem_url ? (
          <img 
            src={produto.imagem_url} 
            alt={produto.nome}
            className="object-cover w-full h-full"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
      </AspectRatio>
      
      {/* Conteúdo */}
      <CardContent className="p-4">
        <h3 className="font-semibold truncate">{produto.nome}</h3>
        {produto.marca && (
          <p className="text-sm text-muted-foreground">{produto.marca}</p>
        )}
        
        {/* Preço */}
        <p className="text-2xl font-bold text-primary mt-2">
          R$ {produto.preco_tabela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          <span className="text-sm font-normal text-muted-foreground">
            /{produto.unidade_venda}
          </span>
        </p>
        
        {/* Badge de Estoque */}
        {produto.estoque_proprio <= 0 ? (
          <Badge variant="destructive">Sem Estoque</Badge>
        ) : produto.estoque_proprio <= produto.estoque_minimo ? (
          <Badge className="bg-amber-100 text-amber-800">Estoque Baixo</Badge>
        ) : (
          <Badge className="bg-green-100 text-green-800">
            {produto.estoque_proprio} disponíveis
          </Badge>
        )}
      </CardContent>
      
      {/* Ações (visíveis no hover) */}
      {showActions && (
        <CardFooter className="opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-1" /> Editar
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-1" /> Excluir
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
```

### Upload de Imagem

```tsx
async function handleImageUpload(file: File, produtoId: string) {
  // Validar
  if (file.size > 2 * 1024 * 1024) {
    toast.error('Imagem deve ter no máximo 2MB');
    return null;
  }
  
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    toast.error('Formato inválido. Use JPG, PNG ou WebP');
    return null;
  }
  
  // Upload
  const path = `${fornecedorGlobalId}/${produtoId}.jpg`;
  const { error } = await supabase.storage
    .from('catalogo-fornecedor')
    .upload(path, file, { upsert: true });
  
  if (error) throw error;
  
  // Retornar URL pública
  const { data: { publicUrl } } = supabase.storage
    .from('catalogo-fornecedor')
    .getPublicUrl(path);
  
  return publicUrl;
}
```

### Toggle de Visualização

```tsx
const [viewMode, setViewMode] = useState<'grid' | 'table' | 'vitrine'>('grid');

<ToggleGroup type="single" value={viewMode} onValueChange={setViewMode}>
  <ToggleGroupItem value="grid" aria-label="Grid">
    <LayoutGrid className="h-4 w-4" />
  </ToggleGroupItem>
  <ToggleGroupItem value="table" aria-label="Tabela">
    <List className="h-4 w-4" />
  </ToggleGroupItem>
  <ToggleGroupItem value="vitrine" aria-label="Vitrine">
    <Eye className="h-4 w-4" />
  </ToggleGroupItem>
</ToggleGroup>
```

---

## Performance - Por que NÃO ficará pesado

| Técnica | Benefício |
|---------|-----------|
| **CDN do Storage** | Imagens servidas de edge, não do banco |
| **Lazy Loading** | `loading="lazy"` carrega imagens sob demanda |
| **Aspect Ratio fixo** | Evita layout shift durante carregamento |
| **Limite de 2MB** | Imagens otimizadas |
| **Placeholder** | UI responsiva mesmo sem imagem |

---

## Fluxo de Uso

### Fornecedor cadastrando produto:
1. Abre formulário "Novo Produto"
2. Preenche dados e clica em "Adicionar Foto"
3. Seleciona imagem do dispositivo
4. Sistema faz upload e mostra preview
5. Salva produto com imagem

### Fornecedor compartilhando catálogo:
1. Acessa aba "Catálogo"
2. Clica em "Modo Vitrine" ou "Compartilhar"
3. Sistema gera link: `https://app.../vitrine/abc123`
4. Fornecedor envia link para cliente via WhatsApp

### Cliente visualizando:
1. Acessa link recebido
2. Vê grid de produtos com fotos e preços
3. Pode entrar em contato pelo WhatsApp do fornecedor

---

## Resultado Esperado

| Funcionalidade | Descrição |
|----------------|-----------|
| Upload de foto | Uma imagem por produto (2MB max) |
| Visualização Grid | Cards visuais estilo marketplace |
| Visualização Tabela | Mantém opção existente |
| Modo Vitrine | Versão limpa para clientes |
| Link compartilhável | URL pública da vitrine |
| Performance | Lazy loading + CDN = rápido |

