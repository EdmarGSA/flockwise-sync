import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, Package, CheckCircle, AlertTriangle } from 'lucide-react';
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
    produtos: {
      id: string;
      nome: string;
      sku: string;
      unidade_medida: string;
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
  }[];
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
  const [mode, setMode] = useState<'oc' | 'nfe'>('oc');
  const [loading, setLoading] = useState(false);
  const [ordensCompra, setOrdensCompra] = useState<OrdemCompra[]>([]);
  const [selectedOC, setSelectedOC] = useState<string>('');
  const [nfeData, setNfeData] = useState<NFeData | null>(null);
  const [numeroNfe, setNumeroNfe] = useState('');
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [showConferencia, setShowConferencia] = useState(false);
  const [recebimentoId, setRecebimentoId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchOrdensCompra();
      resetForm();
    }
  }, [open, integradoId]);

  const resetForm = () => {
    setSelectedOC('');
    setNfeData(null);
    setNumeroNfe('');
    setXmlFile(null);
    setRecebimentoId(null);
    setShowConferencia(false);
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
            produtos(id, nome, sku, unidade_medida)
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

        // Parse NF-e XML
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

        // Parse payment condition
        let condicaoPagamento = '';
        if (cobr) {
          const dups = cobr.getElementsByTagName('dup');
          if (dups.length > 0) {
            condicaoPagamento = `${dups.length}x`;
          }
        }

        // Parse items
        const itens: NFeData['itens'] = [];
        for (let i = 0; i < det.length; i++) {
          const item = det[i];
          const prod = item.getElementsByTagName('prod')[0];
          itens.push({
            codigo: prod?.getElementsByTagName('cProd')[0]?.textContent || '',
            descricao: prod?.getElementsByTagName('xProd')[0]?.textContent || '',
            quantidade: parseFloat(prod?.getElementsByTagName('qCom')[0]?.textContent || '0'),
            valorUnitario: parseFloat(prod?.getElementsByTagName('vUnCom')[0]?.textContent || '0'),
            valorTotal: parseFloat(prod?.getElementsByTagName('vProd')[0]?.textContent || '0'),
            unidade: prod?.getElementsByTagName('uCom')[0]?.textContent || ''
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

  const handleIniciarConferencia = async () => {
    if (mode === 'oc' && !selectedOC) {
      toast.error('Selecione uma ordem de compra');
      return;
    }

    if (mode === 'nfe' && !numeroNfe && !nfeData) {
      toast.error('Informe o número da NF-e ou faça upload do XML');
      return;
    }

    setLoading(true);

    try {
      const oc = getSelectedOC();
      
      // Create recebimento record
      const recebimentoData: any = {
        integrado_id: integradoId,
        ordem_compra_id: mode === 'oc' ? selectedOC : null,
        numero_nfe: nfeData?.numero || numeroNfe || null,
        chave_nfe: nfeData?.chave || null,
        serie_nfe: nfeData?.serie || null,
        data_emissao_nfe: nfeData?.dataEmissao ? new Date(nfeData.dataEmissao).toISOString().split('T')[0] : null,
        valor_nfe: nfeData?.valorTotal || oc?.valor_total || 0,
        valor_frete_nfe: nfeData?.valorFrete || 0,
        valor_desconto_nfe: nfeData?.valorDesconto || 0,
        condicao_pagamento_nfe: nfeData?.condicaoPagamento || null,
        cnpj_fornecedor: nfeData?.cnpjFornecedor || oc?.parceiros?.cpf_cnpj || null,
        razao_social_fornecedor: nfeData?.razaoSocialFornecedor || oc?.parceiros?.razao_social_nome || null,
        status: 'em_conferencia'
      };

      const { data: recebimento, error: recError } = await supabase
        .from('recebimentos_mercadoria')
        .insert(recebimentoData)
        .select()
        .single();

      if (recError) throw recError;

      // Create recebimento_itens based on OC items or NF-e items
      const itensToInsert = [];

      if (mode === 'oc' && oc) {
        for (const item of oc.ordens_compra_itens) {
          const nfeItem = nfeData?.itens.find(
            ni => ni.codigo === item.produtos.sku || 
                  ni.descricao.toLowerCase().includes(item.produtos.nome.toLowerCase())
          );

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
            unidade_nfe: nfeItem?.unidade || null
          });
        }
      } else if (nfeData) {
        // Try to match NF-e items with products
        for (const nfeItem of nfeData.itens) {
          // Find matching product by SKU or name
          const { data: produto } = await supabase
            .from('produtos')
            .select('id')
            .eq('integrado_id', integradoId)
            .or(`sku.eq.${nfeItem.codigo},nome.ilike.%${nfeItem.descricao.substring(0, 30)}%`)
            .maybeSingle();

          if (produto) {
            itensToInsert.push({
              recebimento_id: recebimento.id,
              produto_id: produto.id,
              quantidade_oc: 0,
              quantidade_nfe: nfeItem.quantidade,
              quantidade_fisica: 0,
              preco_oc: 0,
              preco_nfe: nfeItem.valorUnitario,
              codigo_produto_nfe: nfeItem.codigo,
              descricao_produto_nfe: nfeItem.descricao,
              unidade_nfe: nfeItem.unidade
            });
          }
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Iniciar Recebimento de Mercadoria
          </DialogTitle>
          <DialogDescription>
            Selecione uma Ordem de Compra ou insira os dados da NF-e
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'oc' | 'nfe')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="oc">Selecionar OC</TabsTrigger>
            <TabsTrigger value="nfe">Informar NF-e</TabsTrigger>
          </TabsList>

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
                    {getSelectedOC()?.ordens_compra_itens.map((item) => (
                      <div key={item.id} className="flex justify-between items-center py-1 border-b border-border/50">
                        <span>{item.produtos.nome}</span>
                        <span className="text-muted-foreground">
                          {item.quantidade - (item.quantidade_recebida || 0)} {item.produtos.unidade_medida} pendente
                        </span>
                      </div>
                    ))}
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

          <TabsContent value="nfe" className="space-y-4">
            <div className="space-y-4">
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

              <div className="text-center text-muted-foreground">ou</div>

              <div className="space-y-2">
                <Label>Número da NF-e</Label>
                <Input
                  value={numeroNfe}
                  onChange={(e) => setNumeroNfe(e.target.value)}
                  placeholder="Digite o número da NF-e"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {nfeData && (
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
                <div className="col-span-2">
                  <span className="text-muted-foreground">Itens: </span>
                  <span className="font-medium">{nfeData.itens.length} produtos</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleIniciarConferencia} disabled={loading}>
            {loading ? 'Processando...' : 'Próximo: Conferência Física'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
