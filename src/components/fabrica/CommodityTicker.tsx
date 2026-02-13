import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface TickerItem {
  nome: string;
  preco: number;
  unidade: string;
  tipo: 'cotacao' | 'ultima_compra';
  variacao?: number | null;
}

interface CommodityTickerProps {
  integradoId: string | null;
}

export default function CommodityTicker({ integradoId }: CommodityTickerProps) {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (integradoId) fetchPrices();
  }, [integradoId]);

  const fetchPrices = async () => {
    if (!integradoId) return;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/commodity-prices?integrado_id=${integradoId}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();

      const allItems: TickerItem[] = [
        ...(result.cotacoes || []),
        ...(result.ultimaCompra || []),
      ];
      setItems(allItems);
    } catch (error) {
      console.error('Error fetching commodity prices:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || items.length === 0) return null;

  // Duplicate items for seamless loop
  const tickerItems = [...items, ...items];

  return (
    <div className="w-full overflow-hidden bg-muted/50 border-b border-border/50 relative" style={{ height: '40px' }}>
      <div className="ticker-track flex items-center h-full whitespace-nowrap">
        {tickerItems.map((item, index) => (
          <div key={index} className="inline-flex items-center gap-1.5 px-4 h-full">
            <span className="text-xs font-medium text-foreground">{item.nome}</span>
            {item.tipo === 'ultima_compra' && (
              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-accent text-accent-foreground">
                Ult. Compra
              </Badge>
            )}
            <span className={`text-xs font-bold ${
              item.tipo === 'cotacao' ? 'text-primary' : 'text-foreground'
            }`}>
              {item.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-muted-foreground">{item.unidade}</span>
            {item.variacao != null && item.variacao !== 0 && (
              <span className={`inline-flex items-center text-[10px] font-medium ${
                item.variacao > 0 ? 'text-green-600' : 'text-destructive'
              }`}>
                {item.variacao > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                {item.variacao > 0 ? '+' : ''}{item.variacao.toFixed(2)}%
              </span>
            )}
            <span className="text-muted-foreground/30 mx-2">|</span>
          </div>
        ))}
      </div>

      <style>{`
        .ticker-track {
          animation: ticker-scroll 30s linear infinite;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
