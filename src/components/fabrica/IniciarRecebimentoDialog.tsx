import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, CheckCircle, Package, ArrowRight, Trash2, Plus, FileText, Pencil } from 'lucide-react';
import ConferenciaFisicaDialog from './ConferenciaFisicaDialog';

interface OrdemCompra {
  id: string;
  numero_oc: number;
  valor_total: number;
  parceiros: {
    razao_social_nome: string;
    cpf_cnpj: string;
  };
  ordens_compra_itens: {
    id: string;
    produto_id: string;
    quantidade: number;
    preco_unitario: number;
    quantidade_recebida: number;
    unidade_compra: string | null;
    fator_conversao: number | null;
    produtos: {
      id: string;
      nome: string;
      sku: string;
      unidade_medida: string;
      unidade_compra: string | null;
      fator_conversao: number | null;
    };
  }[];
}

interface NFeData {
  numero: string;
  serie: string;
  chave: string;
  dataEmissao: string;
  cnpjFornecedor: string;
  razaoSocialFornecedor: string;
  valorTotal: number;
  valorFrete: number;
  valorDesconto: number;
  condicaoPagamento: string;
  itens: {
    codigo: string;
    descricao: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
    unidade: string;
    gtin: string;
  }[];
}

interface ProdutoFornecedor {
  id: string;
  produto_id: string;
  codigo_produto_fornecedor: string | null;
  unidade_compra_fornecedor: string | null;
  fator_conversao_fornecedor: number | null;
  gtin_esperado: string | null;
  descricao_produto_fornecedor: string | null;
  produtos: {
    id: string;
    nome: string;
    sku: string;
    unidade_medida: string;
    codigo_barras_ean: string | null;
  };
}

interface Parceiro {
  id: string;
  razao_social_nome: string;
  cpf_cnpj: string;
}

interface Produto {
  id: string;
  nome: string;
  sku: string;
  unidade_medida: string;
  unidade_compra: string | null;
  fator_conversao: number | null;
  custo_unitario: number;
}

interface ItemManual {
  id: string;
  produto_id: string;
  produto_nome: string;
  produto_sku: string;
  quantidade_nfe: number;
  valor_unitario: number;
  unidade_medida: string;
  unidade_compra: string | null;
  fator_conversao: number | null;
}

interface IniciarRecebimentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integradoId: string;
  onSuccess: () => void;
}

export default function IniciarRecebimentoDialog({ 
  open, 
  onOpenChange, 
  integradoId, 
  onSuccess 
}: IniciarRecebimentoDialogProps) {
  const [mode, setMode] = useState<'oc' | 'xml' | 'manual'>('oc');
  const [loading, setLoading] = useState(false);
  const [ordensCompra, setOrdensCompra] = useState<OrdemCompra[]>([]);
  const [selectedOC, setSelectedOC] = useState<string>('');
  const [nfeData, setNfeData] = useState<NFeData | null>(null);
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [showConferencia, setShowConferencia] = useState(false);
  const [recebimentoId, setRecebimentoId] = useState<string | null>(null);

  // Manual mode state
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [selectedParceiro, setSelectedParceiro] = useState<string>('');
  const [numeroNfe, setNumeroNfe] = useState('');
  const [serieNfe, setSerieNfe] = useState('');
  const [dataEmissaoNfe, setDataEmissaoNfe] = useState('');
  const [valorTotalNfe, setValorTotalNfe] = useState('');
  const [itensManual, setItensManual] = useState<ItemManual[]>([]);
  
  // Add item form
  const [selectedProduto, setSelectedProduto] = useState<string>('');
  const [qtdItem, setQtdItem] = useState('');
  const [valorItem, setValorItem] = useState('');
  const [produtoSearch, setProdutoSearch] = useState('');

  useEffect(() => {
    if (open) {
      fetchOrdensCompra();
      fetchParceiros();
      fetchProdutos();
      resetForm();
    }
  }, [open, integradoId]);

  const resetForm = () => {
    setSelectedOC('');
    setNfeData(null);
    setXmlFile(null);
    setRecebimentoId(null);
    setShowConferencia(false);
    setSelectedParceiro('');
    setNumeroNfe('');
    setSerieNfe('');
    setDataEmissaoNfe('');
    setValorTotalNfe('');
    setItensManual([]);
    setSelectedProduto('');
    setQtdItem('');
    setValorItem('');
    setProdutoSearch('');
  };

  const fetchOrdensCompra = async () => {
    try {
      const { data, error } = await supabase
        .from('ordens_compra')
        .select(`
          id,
          numero_oc,
          valor_total,
          parceiros(razao_social_nome, cpf_cnpj),
          ordens_compra_itens(
            id,
            produto_id,
            quantidade,
            preco_unitario,
            quantidade_recebida,
            unidade_compra,
            fator_conversao,
            produtos(id, nome, sku, unidade_medida, unidade_compra, fator_conversao)
          )
        `)
        .eq('integrado_id', integradoId)
        .in('status', ['aprovada', 'parcial_recebida'])
        .order('numero_oc', { ascending: false });

      if (error) throw error;
      setOrdensCompra(data || []);
    } catch (error) {
      console.error('Erro ao buscar OCs:', error);
      toast.error('Erro ao carregar ordens de compra');
    }
  };

  const fetchParceiros = async () => {
    try {
      const { data, error } = await supabase
        .from('parceiros')
        .select('id, razao_social_nome, cpf_cnpj')
        .eq('integrado_id', integradoId)
        .in('tipo_cadastro', ['fornecedor', 'ambos'])
        .eq('ativo', true)
        .order('razao_social_nome');

      if (error) throw error;
      setParceiros(data || []);
    } catch (error) {
      console.error('Erro ao buscar parceiros:', error);
    }
  };

  const fetchProdutos = async () => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, sku, unidade_medida, unidade_compra, fator_conversao, custo_unitario')
        .eq('integrado_id', integradoId)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setProdutos(data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    }
  };

  const handleXmlUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xml')) {
      toast.error('Por favor, selecione um arquivo XML válido');
      return;
    }

    setXmlFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const xmlText = e.target?.result as string;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

        const nfeProc = xmlDoc.getElementsByTagName('nfeProc')[0] || xmlDoc.getElementsByTagName('NFe')[0];
        if (!nfeProc) {
          toast.error('Arquivo XML não é uma NF-e válida');
          return;
        }

        const infNFe = xmlDoc.getElementsByTagName('infNFe')[0];
        const ide = xmlDoc.getElementsByTagName('ide')[0];
        const emit = xmlDoc.getElementsByTagName('emit')[0];
        const total = xmlDoc.getElementsByTagName('total')[0];
        const ICMSTot = total?.getElementsByTagName('ICMSTot')[0];
        const cobr = xmlDoc.getElementsByTagName('cobr')[0];
        const det = xmlDoc.getElementsByTagName('det');

        const chaveNFe = infNFe?.getAttribute('Id')?.replace('NFe', '') || '';
        const nNF = ide?.getElementsByTagName('nNF')[0]?.textContent || '';
        const serie = ide?.getElementsByTagName('serie')[0]?.textContent || '';
        const dhEmi = ide?.getElementsByTagName('dhEmi')[0]?.textContent || '';
        const cnpjEmit = emit?.getElementsByTagName('CNPJ')[0]?.textContent || '';
        const xNome = emit?.getElementsByTagName('xNome')[0]?.textContent || '';
        const vNF = ICMSTot?.getElementsByTagName('vNF')[0]?.textContent || '0';
        const vFrete = ICMSTot?.getElementsByTagName('vFrete')[0]?.textContent || '0';
        const vDesc = ICMSTot?.getElementsByTagName('vDesc')[0]?.textContent || '0';

        let condicaoPagamento = '';
        if (cobr) {
          const dups = cobr.getElementsByTagName('dup');
          if (dups.length > 0) {
            condicaoPagamento = `${dups.length}x`;
          }
        }

        const itens: NFeData['itens'] = [];
        for (let i = 0; i < det.length; i++) {
          const item = det[i];
          const prod = item.getElementsByTagName('prod')[0];
          const cEAN = prod?.getElementsByTagName('cEAN')[0]?.textContent || '';
          itens.push({
            codigo: prod?.getElementsByTagName('cProd')[0]?.textContent || '',
            descricao: prod?.getElementsByTagName('xProd')[0]?.textContent || '',
            quantidade: parseFloat(prod?.getElementsByTagName('qCom')[0]?.textContent || '0'),
            valorUnitario: parseFloat(prod?.getElementsByTagName('vUnCom')[0]?.textContent || '0'),
            valorTotal: parseFloat(prod?.getElementsByTagName('vProd')[0]?.textContent || '0'),
            unidade: prod?.getElementsByTagName('uCom')[0]?.textContent || '',
            gtin: cEAN !== 'SEM GTIN' ? cEAN : ''
          });
        }

        setNfeData({
          numero: nNF,
          serie: serie,
          chave: chaveNFe,
          dataEmissao: dhEmi,
          cnpjFornecedor: cnpjEmit,
          razaoSocialFornecedor: xNome,
          valorTotal: parseFloat(vNF),
          valorFrete: parseFloat(vFrete),
          valorDesconto: parseFloat(vDesc),
          condicaoPagamento,
          itens
        });

        setNumeroNfe(nNF);
        toast.success('XML processado com sucesso!');
      } catch (error) {
        console.error('Erro ao processar XML:', error);
        toast.error('Erro ao processar arquivo XML');
      }
    };
    reader.readAsText(file);
  };

  const getSelectedOC = (): OrdemCompra | undefined => {
    return ordensCompra.find(oc => oc.id === selectedOC);
  };

  const handleAddItemManual = () => {
    if (!selectedProduto || !qtdItem || !valorItem) {
      toast.error('Preencha todos os campos do item');
      return;
    }

    const produto = produtos.find(p => p.id === selectedProduto);
    if (!produto) return;

    const novoItem: ItemManual = {
      id: crypto.randomUUID(),
      produto_id: produto.id,
      produto_nome: produto.nome,
      produto_sku: produto.sku,
      quantidade_nfe: parseFloat(qtdItem),
      valor_unitario: parseFloat(valorItem),
      unidade_medida: produto.unidade_medida,
      unidade_compra: produto.unidade_compra,
      fator_conversao: produto.fator_conversao
    };

    setItensManual([...itensManual, novoItem]);
    setSelectedProduto('');
    setQtdItem('');
    setValorItem('');
    setProdutoSearch('');
    toast.success('Item adicionado');
  };

  const handleRemoveItemManual = (itemId: string) => {
    setItensManual(itensManual.filter(i => i.id !== itemId));
  };

  const getSubtotalManual = () => {
    return itensManual.reduce((acc, item) => acc + (item.quantidade_nfe * item.valor_unitario), 0);
  };

  const handleSelectProduto = (produtoId: string) => {
    setSelectedProduto(produtoId);
    const produto = produtos.find(p => p.id === produtoId);
    if (produto && produto.custo_unitario > 0) {
      setValorItem(produto.custo_unitario.toFixed(2));
    }
  };

  const filteredProdutos = produtos.filter(p => 
    p.nome.toLowerCase().includes(produtoSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(produtoSearch.toLowerCase())
  );

  const handleIniciarConferencia = async () => {
    // Validation based on mode
    if (mode === 'oc' && !selectedOC) {
      toast.error('Selecione uma ordem de compra');
      return;
    }

    if (mode === 'xml' && !nfeData) {
      toast.error('Faça upload do XML da NF-e');
      return;
    }

    if (mode === 'manual') {
      if (!selectedParceiro) {
        toast.error('Selecione o fornecedor');
        return;
      }
      if (!numeroNfe) {
        toast.error('Informe o número da NF-e');
        return;
      }
      if (itensManual.length === 0) {
        toast.error('Adicione pelo menos um item');
        return;
      }
    }

    setLoading(true);

    try {
      const oc = getSelectedOC();
      const parceiro = parceiros.find(p => p.id === selectedParceiro);
      
      // Build recebimento data based on mode
      const recebimentoData: any = {
        integrado_id: integradoId,
        ordem_compra_id: mode === 'oc' ? selectedOC : null,
        status: 'em_conferencia'
      };

      if (mode === 'oc') {
        recebimentoData.numero_nfe = nfeData?.numero || null;
        recebimentoData.chave_nfe = nfeData?.chave || null;
        recebimentoData.serie_nfe = nfeData?.serie || null;
        recebimentoData.data_emissao_nfe = nfeData?.dataEmissao ? new Date(nfeData.dataEmissao).toISOString().split('T')[0] : null;
        recebimentoData.valor_nfe = nfeData?.valorTotal || oc?.valor_total || 0;
        recebimentoData.valor_frete_nfe = nfeData?.valorFrete || 0;
        recebimentoData.valor_desconto_nfe = nfeData?.valorDesconto || 0;
        recebimentoData.condicao_pagamento_nfe = nfeData?.condicaoPagamento || null;
        recebimentoData.cnpj_fornecedor = nfeData?.cnpjFornecedor || oc?.parceiros?.cpf_cnpj || null;
        recebimentoData.razao_social_fornecedor = nfeData?.razaoSocialFornecedor || oc?.parceiros?.razao_social_nome || null;
      } else if (mode === 'xml') {
        recebimentoData.numero_nfe = nfeData?.numero || null;
        recebimentoData.chave_nfe = nfeData?.chave || null;
        recebimentoData.serie_nfe = nfeData?.serie || null;
        recebimentoData.data_emissao_nfe = nfeData?.dataEmissao ? new Date(nfeData.dataEmissao).toISOString().split('T')[0] : null;
        recebimentoData.valor_nfe = nfeData?.valorTotal || 0;
        recebimentoData.valor_frete_nfe = nfeData?.valorFrete || 0;
        recebimentoData.valor_desconto_nfe = nfeData?.valorDesconto || 0;
        recebimentoData.condicao_pagamento_nfe = nfeData?.condicaoPagamento || null;
        recebimentoData.cnpj_fornecedor = nfeData?.cnpjFornecedor || null;
        recebimentoData.razao_social_fornecedor = nfeData?.razaoSocialFornecedor || null;
      } else if (mode === 'manual') {
        recebimentoData.numero_nfe = numeroNfe;
        recebimentoData.serie_nfe = serieNfe || null;
        recebimentoData.data_emissao_nfe = dataEmissaoNfe || null;
        recebimentoData.valor_nfe = parseFloat(valorTotalNfe) || getSubtotalManual();
        recebimentoData.cnpj_fornecedor = parceiro?.cpf_cnpj || null;
        recebimentoData.razao_social_fornecedor = parceiro?.razao_social_nome || null;
      }

      const { data: recebimento, error: recError } = await supabase
        .from('recebimentos_mercadoria')
        .insert(recebimentoData)
        .select()
        .single();

      if (recError) throw recError;

      // Create recebimento_itens
      const itensToInsert = [];

      if (mode === 'oc' && oc) {
        for (const item of oc.ordens_compra_itens) {
          const nfeItem = nfeData?.itens.find(
            ni => ni.codigo === item.produtos.sku || 
                  ni.descricao.toLowerCase().includes(item.produtos.nome.toLowerCase())
          );

          const unidadeCompra = item.unidade_compra || item.produtos.unidade_compra || item.produtos.unidade_medida;
          const fatorConversao = item.fator_conversao || item.produtos.fator_conversao || 1;

          itensToInsert.push({
            recebimento_id: recebimento.id,
            ordem_compra_item_id: item.id,
            produto_id: item.produto_id,
            quantidade_oc: item.quantidade - (item.quantidade_recebida || 0),
            quantidade_nfe: nfeItem?.quantidade || 0,
            quantidade_fisica: 0,
            preco_oc: item.preco_unitario,
            preco_nfe: nfeItem?.valorUnitario || 0,
            codigo_produto_nfe: nfeItem?.codigo || null,
            descricao_produto_nfe: nfeItem?.descricao || null,
            unidade_nfe: nfeItem?.unidade || null,
            unidade_compra: unidadeCompra,
            fator_conversao: fatorConversao,
            quantidade_estoque: 0
          });
        }
      } else if (mode === 'xml' && nfeData) {
        // First, try to find the supplier by CNPJ
        const { data: parceiroData } = await supabase
          .from('parceiros')
          .select('id')
          .eq('integrado_id', integradoId)
          .eq('cpf_cnpj', nfeData.cnpjFornecedor.replace(/\D/g, ''))
          .maybeSingle();

        for (const nfeItem of nfeData.itens) {
          let matchedProduto: any = null;
          let produtoFornecedor: ProdutoFornecedor | null = null;

          // 1st Priority: Match by CNPJ + Supplier Product Code (cProd)
          if (parceiroData) {
            const { data: pfData } = await supabase
              .from('produto_fornecedor')
              .select(`
                id,
                produto_id,
                codigo_produto_fornecedor,
                unidade_compra_fornecedor,
                fator_conversao_fornecedor,
                gtin_esperado,
                descricao_produto_fornecedor,
                produtos (id, nome, sku, unidade_medida, codigo_barras_ean)
              `)
              .eq('parceiro_id', parceiroData.id)
              .eq('codigo_produto_fornecedor', nfeItem.codigo)
              .eq('ativo', true)
              .maybeSingle();

            if (pfData) {
              produtoFornecedor = pfData as unknown as ProdutoFornecedor;
              matchedProduto = pfData.produtos;
            }
          }

          // 2nd Priority: Match by GTIN (EAN)
          if (!matchedProduto && nfeItem.gtin) {
            const { data: produtoByGtin } = await supabase
              .from('produtos')
              .select('id, nome, sku, unidade_medida, unidade_compra, fator_conversao, codigo_barras_ean')
              .eq('integrado_id', integradoId)
              .eq('codigo_barras_ean', nfeItem.gtin)
              .eq('ativo', true)
              .maybeSingle();

            if (produtoByGtin) {
              matchedProduto = produtoByGtin;
            }
          }

          // 3rd Priority: Match by SKU or Name (fallback)
          if (!matchedProduto) {
            const { data: produtoFallback } = await supabase
              .from('produtos')
              .select('id, nome, sku, unidade_medida, unidade_compra, fator_conversao, codigo_barras_ean')
              .eq('integrado_id', integradoId)
              .eq('ativo', true)
              .or(`sku.eq.${nfeItem.codigo},nome.ilike.%${nfeItem.descricao.substring(0, 30)}%`)
              .maybeSingle();

            if (produtoFallback) {
              matchedProduto = produtoFallback;
            }
          }

          if (matchedProduto) {
            // Use supplier-specific conversion factor if available
            const unidadeCompra = produtoFornecedor?.unidade_compra_fornecedor || matchedProduto.unidade_compra || matchedProduto.unidade_medida;
            const fatorConversao = produtoFornecedor?.fator_conversao_fornecedor || matchedProduto.fator_conversao || 1;

            itensToInsert.push({
              recebimento_id: recebimento.id,
              produto_id: matchedProduto.id,
              quantidade_oc: 0,
              quantidade_nfe: nfeItem.quantidade,
              quantidade_fisica: 0,
              preco_oc: 0,
              preco_nfe: nfeItem.valorUnitario,
              codigo_produto_nfe: nfeItem.codigo,
              descricao_produto_nfe: nfeItem.descricao,
              unidade_nfe: nfeItem.unidade,
              unidade_compra: unidadeCompra,
              fator_conversao: fatorConversao,
              quantidade_estoque: 0,
              gtin_nfe: nfeItem.gtin || null,
              gtin_esperado: produtoFornecedor?.gtin_esperado || matchedProduto.codigo_barras_ean || null
            });
          } else {
            // Product not matched - insert with null product_id for manual linking later
            itensToInsert.push({
              recebimento_id: recebimento.id,
              produto_id: null,
              quantidade_oc: 0,
              quantidade_nfe: nfeItem.quantidade,
              quantidade_fisica: 0,
              preco_oc: 0,
              preco_nfe: nfeItem.valorUnitario,
              codigo_produto_nfe: nfeItem.codigo,
              descricao_produto_nfe: nfeItem.descricao,
              unidade_nfe: nfeItem.unidade,
              unidade_compra: nfeItem.unidade,
              fator_conversao: 1,
              quantidade_estoque: 0,
              gtin_nfe: nfeItem.gtin || null,
              gtin_esperado: null
            });
          }
        }
      } else if (mode === 'manual') {
        for (const item of itensManual) {
          const unidadeCompra = item.unidade_compra || item.unidade_medida;
          const fatorConversao = item.fator_conversao || 1;

          itensToInsert.push({
            recebimento_id: recebimento.id,
            produto_id: item.produto_id,
            quantidade_oc: 0,
            quantidade_nfe: item.quantidade_nfe,
            quantidade_fisica: 0,
            preco_oc: 0,
            preco_nfe: item.valor_unitario,
            codigo_produto_nfe: item.produto_sku,
            descricao_produto_nfe: item.produto_nome,
            unidade_nfe: item.unidade_medida,
            unidade_compra: unidadeCompra,
            fator_conversao: fatorConversao,
            quantidade_estoque: 0
          });
        }
      }

      if (itensToInsert.length > 0) {
        const { error: itensError } = await supabase
          .from('recebimento_itens')
          .insert(itensToInsert);

        if (itensError) throw itensError;
      }

      setRecebimentoId(recebimento.id);
      setShowConferencia(true);
      toast.success('Recebimento iniciado! Prossiga com a conferência física.');
    } catch (error) {
      console.error('Erro ao iniciar recebimento:', error);
      toast.error('Erro ao iniciar recebimento');
    } finally {
      setLoading(false);
    }
  };

  const handleConferenciaSuccess = () => {
    setShowConferencia(false);
    onOpenChange(false);
    onSuccess();
  };

  if (showConferencia && recebimentoId) {
    return (
      <ConferenciaFisicaDialog
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            setShowConferencia(false);
            onOpenChange(false);
          }
        }}
        recebimentoId={recebimentoId}
        integradoId={integradoId}
        onSuccess={handleConferenciaSuccess}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Iniciar Recebimento de Mercadoria
          </DialogTitle>
          <DialogDescription>
            Selecione uma Ordem de Compra, faça upload do XML ou lance manualmente
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'oc' | 'xml' | 'manual')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="oc" className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              Com OC
            </TabsTrigger>
            <TabsTrigger value="xml" className="flex items-center gap-1">
              <Upload className="w-4 h-4" />
              Com XML
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-1">
              <Pencil className="w-4 h-4" />
              Manual
            </TabsTrigger>
          </TabsList>

          {/* OC Mode */}
          <TabsContent value="oc" className="space-y-4">
            <div className="space-y-2">
              <Label>Ordem de Compra Aprovada</Label>
              <Select value={selectedOC} onValueChange={setSelectedOC}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma OC..." />
                </SelectTrigger>
                <SelectContent>
                  {ordensCompra.map((oc) => (
                    <SelectItem key={oc.id} value={oc.id}>
                      OC #{oc.numero_oc} - {oc.parceiros?.razao_social_nome} - {' '}
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(oc.valor_total)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedOC && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Itens da OC</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {getSelectedOC()?.ordens_compra_itens.map((item) => {
                      const unidadeCompra = item.unidade_compra || item.produtos.unidade_compra || item.produtos.unidade_medida;
                      const fatorConversao = item.fator_conversao || item.produtos.fator_conversao || 1;
                      const qtdPendente = item.quantidade - (item.quantidade_recebida || 0);
                      const qtdEstoque = qtdPendente * fatorConversao;
                      
                      return (
                        <div key={item.id} className="flex justify-between items-center py-1 border-b border-border/50">
                          <span>{item.produtos.nome}</span>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span>{qtdPendente} {unidadeCompra}</span>
                            {fatorConversao > 1 && (
                              <>
                                <ArrowRight className="w-3 h-3" />
                                <span className="text-green-600">{qtdEstoque} {item.produtos.unidade_medida}</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label>Upload XML NF-e (Opcional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".xml"
                  onChange={handleXmlUpload}
                  className="cursor-pointer"
                />
                <Upload className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                O upload do XML permite validação automática dos dados
              </p>
            </div>
          </TabsContent>

          {/* XML Mode */}
          <TabsContent value="xml" className="space-y-4">
            <div className="space-y-2">
              <Label>Upload XML NF-e</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".xml"
                  onChange={handleXmlUpload}
                  className="cursor-pointer"
                />
                <Upload className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>

            {nfeData && (
              <Card className="border-green-500/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    Dados Extraídos do XML
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">NF-e: </span>
                      <span className="font-medium">{nfeData.numero} (Série {nfeData.serie})</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Emissão: </span>
                      <span className="font-medium">
                        {new Date(nfeData.dataEmissao).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Fornecedor: </span>
                      <span className="font-medium">{nfeData.razaoSocialFornecedor}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">CNPJ: </span>
                      <span className="font-medium">{nfeData.cnpjFornecedor}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Valor Total: </span>
                      <span className="font-medium">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(nfeData.valorTotal)}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <span className="text-muted-foreground">Itens: </span>
                    <span className="font-medium">{nfeData.itens.length} produto(s)</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Manual Mode */}
          <TabsContent value="manual" className="space-y-4">
            {/* Supplier Selection */}
            <div className="space-y-2">
              <Label>Fornecedor *</Label>
              <Select value={selectedParceiro} onValueChange={setSelectedParceiro}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o fornecedor..." />
                </SelectTrigger>
                <SelectContent>
                  {parceiros.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.razao_social_nome} - {p.cpf_cnpj}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* NF-e Data */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Dados da NF-e</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Número *</Label>
                    <Input 
                      value={numeroNfe} 
                      onChange={(e) => setNumeroNfe(e.target.value)} 
                      placeholder="12345"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Série</Label>
                    <Input 
                      value={serieNfe} 
                      onChange={(e) => setSerieNfe(e.target.value)} 
                      placeholder="1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Data Emissão</Label>
                    <Input 
                      type="date" 
                      value={dataEmissaoNfe} 
                      onChange={(e) => setDataEmissaoNfe(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Valor Total</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={valorTotalNfe} 
                      onChange={(e) => setValorTotalNfe(e.target.value)} 
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Add Item */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Adicionar Item
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Produto *</Label>
                  <Input 
                    placeholder="Buscar produto por nome ou SKU..."
                    value={produtoSearch}
                    onChange={(e) => setProdutoSearch(e.target.value)}
                  />
                  {produtoSearch && filteredProdutos.length > 0 && (
                    <div className="border rounded-md max-h-40 overflow-y-auto bg-background">
                      {filteredProdutos.slice(0, 10).map(p => (
                        <div 
                          key={p.id} 
                          className="p-2 hover:bg-muted cursor-pointer text-sm flex justify-between"
                          onClick={() => {
                            handleSelectProduto(p.id);
                            setProdutoSearch(`${p.nome} (${p.sku})`);
                          }}
                        >
                          <span>{p.nome}</span>
                          <span className="text-muted-foreground">{p.sku}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Quantidade NF-e *</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={qtdItem} 
                      onChange={(e) => setQtdItem(e.target.value)} 
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Valor Unitário *</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={valorItem} 
                      onChange={(e) => setValorItem(e.target.value)} 
                      placeholder="0,00"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddItemManual} className="w-full">
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items Table */}
            {itensManual.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Itens Adicionados ({itensManual.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-center">Qtd</TableHead>
                        <TableHead className="text-right">Valor Unit.</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itensManual.map(item => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.produto_nome}</div>
                              <div className="text-xs text-muted-foreground">{item.produto_sku}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {item.quantidade_nfe} {item.unidade_compra || item.unidade_medida}
                          </TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor_unitario)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.quantidade_nfe * item.valor_unitario)}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleRemoveItemManual(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={3} className="text-right font-medium">
                          Subtotal:
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getSubtotalManual())}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* XML Data Display (for OC mode) */}
        {mode === 'oc' && nfeData && (
          <Card className="mt-4 border-green-500/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                Dados Extraídos do XML
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">NF-e: </span>
                  <span className="font-medium">{nfeData.numero} (Série {nfeData.serie})</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Emissão: </span>
                  <span className="font-medium">
                    {new Date(nfeData.dataEmissao).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Fornecedor: </span>
                  <span className="font-medium">{nfeData.razaoSocialFornecedor}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">CNPJ: </span>
                  <span className="font-medium">{nfeData.cnpjFornecedor}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Valor Total: </span>
                  <span className="font-medium">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(nfeData.valorTotal)}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-border">
                <span className="text-muted-foreground">Itens: </span>
                <span className="font-medium">{nfeData.itens.length} produto(s)</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleIniciarConferencia} disabled={loading}>
            {loading ? 'Iniciando...' : 'Iniciar Conferência Física'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
