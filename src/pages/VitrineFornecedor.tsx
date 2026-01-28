import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Package, Phone, Mail, ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { supabase } from '@/integrations/supabase/client';

interface Fornecedor {
  id: string;
  razao_social_nome: string;
  nome_fantasia: string | null;
  telefone: string | null;
  email: string | null;
}

interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  marca: string | null;
  unidade_venda: string;
  preco_tabela: number;
  imagem_url: string | null;
  estoque_proprio: number;
}

export default function VitrineFornecedor() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [fornecedor, setFornecedor] = useState<Fornecedor | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVitrine = async () => {
      if (!id) {
        setError('Vitrine não encontrada');
        setLoading(false);
        return;
      }

      try {
        // Buscar dados do fornecedor
        const { data: fornecedorData, error: fornecedorError } = await supabase
          .from('fornecedores_globais')
          .select('id, razao_social_nome, nome_fantasia, telefone, email')
          .eq('id', id)
          .eq('ativo', true)
          .single();

        if (fornecedorError || !fornecedorData) {
          setError('Vitrine não encontrada ou indisponível');
          setLoading(false);
          return;
        }

        setFornecedor(fornecedorData);

        // Buscar produtos ativos
        const { data: produtosData } = await supabase
          .from('produtos_catalogo_fornecedor')
          .select('id, nome, descricao, categoria, marca, unidade_venda, preco_tabela, imagem_url, estoque_proprio')
          .eq('fornecedor_global_id', id)
          .eq('ativo', true)
          .order('nome');

        setProdutos(produtosData || []);
      } catch (err) {
        console.error('Error fetching vitrine:', err);
        setError('Erro ao carregar vitrine');
      } finally {
        setLoading(false);
      }
    };

    fetchVitrine();
  }, [id]);

  const filteredProdutos = produtos.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.marca?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleWhatsApp = () => {
    if (!fornecedor?.telefone) return;
    const phone = fornecedor.telefone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá! Vi seu catálogo online e gostaria de mais informações.`);
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Package className="h-12 w-12 mx-auto text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Carregando vitrine...</p>
        </div>
      </div>
    );
  }

  if (error || !fornecedor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Package className="h-12 w-12 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-semibold">{error || 'Vitrine não encontrada'}</h1>
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao início
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">
                {fornecedor.nome_fantasia || fornecedor.razao_social_nome}
              </h1>
              <p className="text-muted-foreground">{produtos.length} produtos disponíveis</p>
            </div>
            
            <div className="flex items-center gap-2">
              {fornecedor.telefone && (
                <Button onClick={handleWhatsApp} className="gap-2">
                  <Phone className="h-4 w-4" />
                  WhatsApp
                </Button>
              )}
              {fornecedor.email && (
                <Button variant="outline" asChild>
                  <a href={`mailto:${fornecedor.email}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="container mx-auto px-4 py-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Products Grid */}
      <main className="container mx-auto px-4 pb-12">
        {filteredProdutos.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {produtos.length === 0 
                ? 'Nenhum produto disponível no momento'
                : 'Nenhum produto encontrado'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProdutos.map((produto) => (
              <Card key={produto.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <AspectRatio ratio={1} className="bg-muted">
                  {produto.imagem_url ? (
                    <img 
                      src={produto.imagem_url} 
                      alt={produto.nome}
                      className="object-cover w-full h-full"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  )}
                </AspectRatio>
                
                <CardContent className="p-3 space-y-2">
                  <h3 className="font-medium line-clamp-2 text-sm min-h-[2.5rem]">
                    {produto.nome}
                  </h3>
                  
                  {produto.marca && (
                    <p className="text-xs text-muted-foreground">{produto.marca}</p>
                  )}
                  
                  <p className="text-xl font-bold text-primary">
                    R$ {produto.preco_tabela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      /{produto.unidade_venda}
                    </span>
                  </p>
                  
                  <Badge 
                    variant={produto.estoque_proprio > 0 ? 'default' : 'secondary'}
                    className={produto.estoque_proprio > 0 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                      : ''
                    }
                  >
                    {produto.estoque_proprio > 0 ? 'Disponível' : 'Sob consulta'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-background py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Catálogo de {fornecedor.nome_fantasia || fornecedor.razao_social_nome}</p>
          <p className="mt-1">Entre em contato para mais informações e pedidos</p>
        </div>
      </footer>
    </div>
  );
}
