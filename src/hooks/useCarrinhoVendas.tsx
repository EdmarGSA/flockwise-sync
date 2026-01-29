import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ProdutoCatalogo, ClienteFornecedor } from './useFornecedorData';
import { toast } from 'sonner';

export interface CarrinhoItem {
  produto: ProdutoCatalogo;
  quantidade: number;
  precoUnitario: number;
  precoPromocional?: number;
}

interface CarrinhoContextType {
  itens: CarrinhoItem[];
  clienteSelecionado: ClienteFornecedor | null;
  addItem: (produto: ProdutoCatalogo, quantidade: number, precoPromocional?: number) => void;
  removeItem: (produtoId: string) => void;
  updateQuantidade: (produtoId: string, quantidade: number) => void;
  setCliente: (cliente: ClienteFornecedor | null) => void;
  limpar: () => void;
  subtotal: number;
  total: number;
  totalItens: number;
  validarCredito: () => { valido: boolean; mensagem?: string };
}

const CarrinhoContext = createContext<CarrinhoContextType | undefined>(undefined);

const STORAGE_KEY = 'carrinho_vendas_fornecedor';
const CLIENTE_STORAGE_KEY = 'carrinho_cliente_fornecedor';

export const CarrinhoVendasProvider = ({ children }: { children: ReactNode }) => {
  const [itens, setItens] = useState<CarrinhoItem[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteFornecedor | null>(null);

  // Carregar do localStorage
  useEffect(() => {
    try {
      const savedItens = localStorage.getItem(STORAGE_KEY);
      const savedCliente = localStorage.getItem(CLIENTE_STORAGE_KEY);
      
      if (savedItens) {
        setItens(JSON.parse(savedItens));
      }
      if (savedCliente) {
        setClienteSelecionado(JSON.parse(savedCliente));
      }
    } catch (e) {
      console.error('Erro ao carregar carrinho do localStorage:', e);
    }
  }, []);

  // Salvar no localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(itens));
  }, [itens]);

  useEffect(() => {
    if (clienteSelecionado) {
      localStorage.setItem(CLIENTE_STORAGE_KEY, JSON.stringify(clienteSelecionado));
    } else {
      localStorage.removeItem(CLIENTE_STORAGE_KEY);
    }
  }, [clienteSelecionado]);

  const addItem = useCallback((produto: ProdutoCatalogo, quantidade: number, precoPromocional?: number) => {
    // Validar estoque
    if (quantidade > produto.estoque_proprio) {
      toast.error(`Estoque insuficiente. Disponível: ${produto.estoque_proprio}`);
      return;
    }

    setItens(prev => {
      const existing = prev.find(i => i.produto.id === produto.id);
      
      if (existing) {
        const novaQtd = existing.quantidade + quantidade;
        if (novaQtd > produto.estoque_proprio) {
          toast.error(`Estoque insuficiente. Disponível: ${produto.estoque_proprio}`);
          return prev;
        }
        
        return prev.map(i => 
          i.produto.id === produto.id 
            ? { ...i, quantidade: novaQtd }
            : i
        );
      }
      
      return [...prev, {
        produto,
        quantidade,
        precoUnitario: produto.preco_tabela,
        precoPromocional
      }];
    });

    toast.success(`${produto.nome} adicionado ao carrinho`);
  }, []);

  const removeItem = useCallback((produtoId: string) => {
    setItens(prev => prev.filter(i => i.produto.id !== produtoId));
  }, []);

  const updateQuantidade = useCallback((produtoId: string, quantidade: number) => {
    setItens(prev => {
      const item = prev.find(i => i.produto.id === produtoId);
      if (!item) return prev;
      
      if (quantidade > item.produto.estoque_proprio) {
        toast.error(`Estoque insuficiente. Disponível: ${item.produto.estoque_proprio}`);
        return prev;
      }
      
      if (quantidade <= 0) {
        return prev.filter(i => i.produto.id !== produtoId);
      }
      
      return prev.map(i =>
        i.produto.id === produtoId
          ? { ...i, quantidade }
          : i
      );
    });
  }, []);

  const setCliente = useCallback((cliente: ClienteFornecedor | null) => {
    setClienteSelecionado(cliente);
  }, []);

  const limpar = useCallback(() => {
    setItens([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const subtotal = itens.reduce((acc, item) => {
    const preco = item.precoPromocional || item.precoUnitario;
    return acc + (preco * item.quantidade);
  }, 0);

  const total = subtotal; // Pode adicionar descontos futuramente

  const totalItens = itens.reduce((acc, item) => acc + item.quantidade, 0);

  const validarCredito = useCallback(() => {
    if (!clienteSelecionado) {
      return { valido: false, mensagem: 'Selecione um cliente' };
    }
    
    const saldo = clienteSelecionado.saldo_credito || 0;
    if (total > saldo) {
      return { 
        valido: false, 
        mensagem: `Saldo insuficiente. Disponível: R$ ${saldo.toFixed(2)}` 
      };
    }
    
    return { valido: true };
  }, [clienteSelecionado, total]);

  return (
    <CarrinhoContext.Provider value={{
      itens,
      clienteSelecionado,
      addItem,
      removeItem,
      updateQuantidade,
      setCliente,
      limpar,
      subtotal,
      total,
      totalItens,
      validarCredito
    }}>
      {children}
    </CarrinhoContext.Provider>
  );
};

export const useCarrinhoVendas = () => {
  const context = useContext(CarrinhoContext);
  if (!context) {
    throw new Error('useCarrinhoVendas deve ser usado dentro de CarrinhoVendasProvider');
  }
  return context;
};
