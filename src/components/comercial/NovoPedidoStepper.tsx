import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Save, Send } from 'lucide-react';
import { toast } from 'sonner';
import { OvoVendaItem } from './OvosVendaSection';
import PedidoStep1Cliente from './PedidoStep1Cliente';
import PedidoStep2Itens from './PedidoStep2Itens';
import PedidoStep3Revisao from './PedidoStep3Revisao';

interface NovoPedidoStepperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integradoId: string;
  onSuccess: () => void;
}

interface PedidoItem {
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  unidade_medida: string;
  preco_tabela: number;
  preco_unitario: number;
  desconto_percentual: number;
  valor_total: number;
  margem_calculada: number;
  custo_medio: number;
  lote_producao_id?: string;
  is_ave_viva?: boolean;
  tipo_venda?: 'unidade' | 'peso';
  is_ovo?: boolean;
  produto_ovo_id?: string;
}

type FormaPagamento = 'boleto' | 'pix' | 'transferencia' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'cheque';

const STEP_LABELS = ['Cliente & Condições', 'Itens do Pedido', 'Revisão'];

export default function NovoPedidoStepper({ open, onOpenChange, integradoId, onSuccess }: NovoPedidoStepperProps) {
  const [step, setStep] = useState(0);
  const [clientes, setClientes] = useState<any[]>([]);
  const [tabelasPreco, setTabelasPreco] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [tabelaItens, setTabelaItens] = useState<any[]>([]);
  const [historicoCliente, setHistoricoCliente] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Credit
  const [creditoCliente, setCreditoCliente] = useState<any>(null);
  const [creditoFormas, setCreditoFormas] = useState<any[]>([]);
  const [limiteUtilizado, setLimiteUtilizado] = useState(0);
  const [formasPagamento, setFormasPagamento] = useState<any[]>([]);
  const [prazosPagamento, setPrazosPagamento] = useState<any[]>([]);
  const [selectedFormaId, setSelectedFormaId] = useState("");
  const [selectedPrazoId, setSelectedPrazoId] = useState("");

  // Delinquency
  const [clienteInadimplente, setClienteInadimplente] = useState(false);
  const [contasVencidas, setContasVencidas] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    cliente_id: '',
    tabela_preco_id: '',
    data_entrega_prevista: '',
    forma_pagamento: '' as FormaPagamento | '',
    prazo_pagamento_dias: 30,
    observacoes: '',
    desconto: 0,
    valor_frete: 0
  });

  const [itens, setItens] = useState<PedidoItem[]>([]);
  const [itensOvos, setItensOvos] = useState<OvoVendaItem[]>([]);
  const [novoItem, setNovoItem] = useState({ produto_id: '', quantidade: 1, preco_unitario: 0 });
  const [margemMinima, setMargemMinima] = useState(10);

  useEffect(() => {
    if (open) {
      fetchClientes();
      fetchTabelasPreco();
      fetchProdutos();
      fetchFormasPagamento();
      setStep(0);
    }
  }, [open]);

  useEffect(() => {
    if (formData.tabela_preco_id) fetchTabelaItens(formData.tabela_preco_id);
  }, [formData.tabela_preco_id]);

  useEffect(() => {
    if (formData.cliente_id) {
      fetchHistoricoCliente(formData.cliente_id);
      fetchCreditoCliente(formData.cliente_id);
    } else {
      setCreditoCliente(null);
      setCreditoFormas([]);
      setLimiteUtilizado(0);
      setSelectedFormaId("");
      setSelectedPrazoId("");
      setClienteInadimplente(false);
      setContasVencidas([]);
    }
  }, [formData.cliente_id]);

  // ---- Data fetching (same logic as NovoPedidoDialog) ----

  const fetchClientes = async () => {
    const { data } = await supabase.from('parceiros')
      .select('id, razao_social_nome, nome_fantasia')
      .eq('integrado_id', integradoId).eq('ativo', true)
      .in('tipo_cadastro', ['cliente', 'ambos']).order('razao_social_nome');
    setClientes(data || []);
  };

  const fetchTabelasPreco = async () => {
    const { data } = await supabase.from('tabelas_preco')
      .select('*').eq('integrado_id', integradoId).eq('ativo', true).order('nome');
    setTabelasPreco(data || []);
    const padrao = data?.find((t: any) => t.padrao);
    if (padrao) {
      setFormData(prev => ({ ...prev, tabela_preco_id: padrao.id }));
      setMargemMinima(padrao.margem_minima_percentual || 10);
    }
  };

  const fetchTabelaItens = async (tabelaId: string) => {
    const { data } = await supabase.from('tabelas_preco_itens')
      .select('*, produto:produtos(nome, custo_medio, unidade_medida)')
      .eq('tabela_preco_id', tabelaId);
    setTabelaItens(data || []);
    const tabela = tabelasPreco.find((t: any) => t.id === tabelaId);
    if (tabela) setMargemMinima(tabela.margem_minima_percentual || 10);
  };

  const fetchProdutos = async () => {
    const { data } = await supabase.from('produtos')
      .select('id, nome, custo_medio, preco_venda, unidade_medida, estoque_atual')
      .eq('integrado_id', integradoId).eq('ativo', true).order('nome');
    setProdutos(data || []);
  };

  const fetchHistoricoCliente = async (clienteId: string) => {
    const { data } = await supabase.from('pedido_itens')
      .select('*, pedido:pedidos!inner(cliente_id, data_emissao, status), produto:produtos(nome)')
      .eq('pedido.cliente_id', clienteId).eq('pedido.status', 'faturado')
      .order('created_at', { ascending: false }).limit(10);
    setHistoricoCliente(data || []);
  };

  const fetchFormasPagamento = async () => {
    const { data: formas } = await supabase.from('formas_pagamento')
      .select('*').eq('integrado_id', integradoId).eq('ativo', true).order('nome');
    setFormasPagamento(formas || []);
    const { data: prazos } = await supabase.from('prazos_pagamento')
      .select('*').eq('integrado_id', integradoId).eq('ativo', true).order('nome');
    setPrazosPagamento(prazos || []);
  };

  const fetchCreditoCliente = async (clienteId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const { data: vencidas } = await supabase.from('contas_receber')
      .select('id, valor, data_vencimento')
      .eq('cliente_id', clienteId).eq('integrado_id', integradoId)
      .in('status', ['previsao', 'pendente', 'parcial']).lt('data_vencimento', today);
    setClienteInadimplente(!!(vencidas && vencidas.length > 0));
    setContasVencidas(vencidas || []);

    const { data: credito } = await supabase.from('credito_cliente')
      .select('*').eq('cliente_id', clienteId).eq('ativo', true).single();
    setCreditoCliente(credito);

    if (credito) {
      const { data: formas } = await supabase.from('credito_cliente_formas')
        .select('forma_pagamento_id, prazo_pagamento_id')
        .eq('credito_cliente_id', credito.id).eq('ativo', true);
      setCreditoFormas(formas || []);

      const { data: contas } = await supabase.from('contas_receber')
        .select('valor, valor_recebido').eq('cliente_id', clienteId)
        .eq('integrado_id', integradoId).in('status', ['previsao', 'pendente', 'parcial']);
      const utilizado = (contas || []).reduce((acc: number, c: any) => acc + ((c.valor || 0) - (c.valor_recebido || 0)), 0);
      setLimiteUtilizado(utilizado);
    } else {
      setCreditoFormas([]);
      setLimiteUtilizado(0);
    }
    setSelectedFormaId("");
    setSelectedPrazoId("");
  };

  const getLimiteDisponivel = () => {
    if (!creditoCliente) return Infinity;
    return creditoCliente.limite_credito - limiteUtilizado;
  };

  const isFormaAVista = (forma: any) => {
    const c = forma.codigo.toLowerCase();
    const n = forma.nome.toLowerCase();
    return c.includes('dinheiro') || c.includes('pix') || n.includes('dinheiro') || n.includes('pix');
  };

  const getFormasDisponiveis = () => {
    if (clienteInadimplente) return formasPagamento.filter((f: any) => isFormaAVista(f));
    if (!creditoCliente || creditoFormas.length === 0) return formasPagamento;
    const ids = [...new Set(creditoFormas.map((cf: any) => cf.forma_pagamento_id))];
    return formasPagamento.filter((f: any) => ids.includes(f.id));
  };

  const getPrazosDisponiveis = () => {
    if (!selectedFormaId) return [];
    const prazosForma = prazosPagamento.filter((p: any) => p.forma_pagamento_id === selectedFormaId);
    if (clienteInadimplente) {
      return prazosForma.filter((p: any) => p.dias_parcelas.length === 0 || (p.dias_parcelas.length === 1 && p.dias_parcelas[0] === 0));
    }
    if (!creditoCliente || creditoFormas.length === 0) return prazosForma;
    const prazoIds = creditoFormas.filter((cf: any) => cf.forma_pagamento_id === selectedFormaId && cf.prazo_pagamento_id).map((cf: any) => cf.prazo_pagamento_id);
    if (prazoIds.length === 0) {
      const hasFormaNoSpecificPrazo = creditoFormas.some((cf: any) => cf.forma_pagamento_id === selectedFormaId && !cf.prazo_pagamento_id);
      if (hasFormaNoSpecificPrazo) return prazosForma;
      return [];
    }
    return prazosForma.filter((p: any) => prazoIds.includes(p.id));
  };

  // ---- Item handlers ----

  const handleAddItem = () => {
    if (!novoItem.produto_id || novoItem.quantidade <= 0) {
      toast.error('Selecione um produto e quantidade válida');
      return;
    }
    const produto = produtos.find((p: any) => p.id === novoItem.produto_id);
    if (!produto) return;
    if (itens.some(i => i.produto_id === novoItem.produto_id)) {
      toast.error('Produto já adicionado');
      return;
    }
    const tabelaItem = tabelaItens.find((ti: any) => ti.produto_id === novoItem.produto_id);
    const precoTabela = tabelaItem?.preco_unitario || produto.preco_venda || 0;
    const precoUnitario = novoItem.preco_unitario > 0 ? novoItem.preco_unitario : precoTabela;
    const custoMedio = produto.custo_medio || 0;
    const margem = custoMedio > 0 ? ((precoUnitario - custoMedio) / custoMedio) * 100 : 0;
    if (margem < margemMinima && custoMedio > 0) toast.warning(`⚠️ Margem ${margem.toFixed(1)}% abaixo do mínimo (${margemMinima}%)`);
    setItens([...itens, {
      produto_id: novoItem.produto_id, produto_nome: produto.nome,
      quantidade: novoItem.quantidade, unidade_medida: produto.unidade_medida,
      preco_tabela: precoTabela, preco_unitario: precoUnitario,
      desconto_percentual: 0, valor_total: precoUnitario * novoItem.quantidade,
      margem_calculada: margem, custo_medio: custoMedio
    }]);
    setNovoItem({ produto_id: '', quantidade: 1, preco_unitario: 0 });
  };

  const handleAddLoteItem = (loteItem: any) => {
    if (itens.some(i => i.lote_producao_id === loteItem.lote_id)) {
      toast.error('Este lote já foi adicionado');
      return;
    }
    setItens([...itens, {
      produto_id: '', produto_nome: `Aves Corte Viva - ${loteItem.lote_info}`,
      quantidade: loteItem.quantidade, unidade_medida: loteItem.tipo_venda === 'unidade' ? 'UN' : 'KG',
      preco_tabela: loteItem.preco_unitario, preco_unitario: loteItem.preco_unitario,
      desconto_percentual: 0, valor_total: loteItem.valor_total,
      margem_calculada: 0, custo_medio: 0,
      lote_producao_id: loteItem.lote_id, is_ave_viva: true, tipo_venda: loteItem.tipo_venda
    }]);
  };

  const handleAddOvoItem = (ovoItem: OvoVendaItem) => {
    if (itens.some(i => i.produto_ovo_id === ovoItem.produto_ovo_id && i.is_ovo)) {
      toast.error('Produto de ovo já adicionado');
      return;
    }
    setItens([...itens, {
      produto_id: '', produto_nome: ovoItem.produto_nome,
      quantidade: ovoItem.quantidade, unidade_medida: ovoItem.unidade_venda,
      preco_tabela: ovoItem.preco_unitario, preco_unitario: ovoItem.preco_unitario,
      desconto_percentual: 0, valor_total: ovoItem.valor_total,
      margem_calculada: ovoItem.margem_calculada,
      custo_medio: ovoItem.custo_medio_unitario * ovoItem.fator_conversao,
      is_ovo: true, produto_ovo_id: ovoItem.produto_ovo_id
    }]);
    setItensOvos([...itensOvos, ovoItem]);
  };

  const handleRemoveItem = (index: number) => {
    const removed = itens[index];
    setItens(itens.filter((_, i) => i !== index));
    if (removed.is_ovo && removed.produto_ovo_id) {
      setItensOvos(itensOvos.filter(o => o.produto_ovo_id !== removed.produto_ovo_id));
    }
  };

  const handleUpdateItemPrice = (index: number, newPrice: number) => {
    const updated = [...itens];
    const item = updated[index];
    item.preco_unitario = newPrice;
    item.valor_total = newPrice * item.quantidade;
    item.margem_calculada = item.custo_medio > 0 ? ((newPrice - item.custo_medio) / item.custo_medio) * 100 : 0;
    if (item.margem_calculada < margemMinima && item.custo_medio > 0) toast.warning(`⚠️ Margem ${item.margem_calculada.toFixed(1)}% abaixo do mínimo`);
    setItens(updated);
  };

  const calcularTotais = () => {
    const subtotal = itens.reduce((acc, item) => acc + item.valor_total, 0);
    return { subtotal, desconto: formData.desconto || 0, frete: formData.valor_frete || 0, total: subtotal - (formData.desconto || 0) + (formData.valor_frete || 0) };
  };

  // ---- Submit ----

  const handleSubmit = async (status: 'rascunho' | 'pendente_aprovacao') => {
    if (!formData.cliente_id) { toast.error('Selecione um cliente'); return; }
    if (itens.length === 0) { toast.error('Adicione pelo menos um item'); return; }
    const totalPedido = calcularTotais().total;
    const limiteDisponivel = getLimiteDisponivel();
    if (creditoCliente && totalPedido > limiteDisponivel) {
      toast.error(`Limite de crédito excedido! Disponível: R$ ${limiteDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      return;
    }
    if (creditoCliente && creditoFormas.length > 0 && !selectedFormaId) {
      toast.error('Selecione uma forma de pagamento autorizada');
      return;
    }
    if (clienteInadimplente && selectedFormaId) {
      const forma = formasPagamento.find((f: any) => f.id === selectedFormaId);
      if (forma && !isFormaAVista(forma)) {
        toast.error('Cliente inadimplente! Somente venda à vista');
        return;
      }
    }

    setSaving(true);
    try {
      const totais = calcularTotais();
      const { data: pedido, error: pedidoError } = await supabase.from('pedidos')
        .insert([{
          integrado_id: integradoId, cliente_id: formData.cliente_id,
          tabela_preco_id: formData.tabela_preco_id || null,
          vendedor_id: integradoId, status,
          data_entrega_prevista: formData.data_entrega_prevista || null,
          forma_pagamento: (formData.forma_pagamento || null) as any,
          prazo_pagamento_dias: formData.prazo_pagamento_dias,
          valor_subtotal: totais.subtotal, desconto: totais.desconto,
          valor_frete: totais.frete, valor_total: totais.total,
          observacoes: formData.observacoes
        }]).select().single();
      if (pedidoError) throw pedidoError;

      const pedidoItens = itens.filter(item => !item.is_ovo).map(item => ({
        pedido_id: pedido.id, produto_id: item.is_ave_viva ? null : item.produto_id,
        quantidade: item.quantidade, unidade_medida: item.unidade_medida,
        preco_tabela: item.preco_tabela, preco_unitario: item.preco_unitario,
        desconto_percentual: item.desconto_percentual, valor_total: item.valor_total,
        margem_calculada: item.margem_calculada, lote_producao_id: item.lote_producao_id || null
      }));
      if (pedidoItens.length > 0) {
        const { error } = await supabase.from('pedido_itens').insert(pedidoItens);
        if (error) throw error;
      }

      if (itensOvos.length > 0) {
        const pedidoItensOvos = itensOvos.map(item => ({
          pedido_id: pedido.id, produto_ovo_id: item.produto_ovo_id,
          quantidade: item.quantidade, quantidade_unidades: item.quantidade_unidades,
          preco_unitario: item.preco_unitario, valor_total: item.valor_total
        }));
        const { error } = await supabase.from('pedido_itens_ovos').insert(pedidoItensOvos);
        if (error) throw error;
      }

      toast.success(`Pedido #${pedido.numero_pedido} criado com sucesso!`);
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Erro ao criar pedido');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      cliente_id: '', tabela_preco_id: '', data_entrega_prevista: '',
      forma_pagamento: '', prazo_pagamento_dias: 30, observacoes: '',
      desconto: 0, valor_frete: 0
    });
    setItens([]);
    setItensOvos([]);
    setNovoItem({ produto_id: '', quantidade: 1, preco_unitario: 0 });
    setHistoricoCliente([]);
    setCreditoCliente(null);
    setCreditoFormas([]);
    setLimiteUtilizado(0);
    setSelectedFormaId("");
    setSelectedPrazoId("");
    setClienteInadimplente(false);
    setContasVencidas([]);
    setStep(0);
  };

  const canAdvance = () => {
    if (step === 0) return !!formData.cliente_id;
    if (step === 1) return itens.length > 0;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Pedido de Venda</DialogTitle>
        </DialogHeader>

        {/* Stepper Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            {STEP_LABELS.map((label, i) => (
              <button
                key={i}
                onClick={() => { if (i < step) setStep(i); }}
                className={`flex items-center gap-2 transition-colors ${i <= step ? 'text-primary font-medium' : 'text-muted-foreground'} ${i < step ? 'cursor-pointer hover:underline' : 'cursor-default'}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${i < step ? 'bg-primary text-primary-foreground border-primary' : i === step ? 'border-primary text-primary' : 'border-muted-foreground/30 text-muted-foreground'}`}>
                  {i + 1}
                </div>
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          <Progress value={((step + 1) / STEP_LABELS.length) * 100} className="h-1.5" />
        </div>

        {/* Step Content */}
        <div className="min-h-[300px]">
          {step === 0 && (
            <PedidoStep1Cliente
              formData={formData} setFormData={setFormData}
              clientes={clientes} tabelasPreco={tabelasPreco}
              formasPagamento={formasPagamento} prazosPagamento={prazosPagamento}
              creditoCliente={creditoCliente} creditoFormas={creditoFormas}
              limiteUtilizado={limiteUtilizado}
              clienteInadimplente={clienteInadimplente} contasVencidas={contasVencidas}
              historicoCliente={historicoCliente}
              selectedFormaId={selectedFormaId} setSelectedFormaId={setSelectedFormaId}
              selectedPrazoId={selectedPrazoId} setSelectedPrazoId={setSelectedPrazoId}
              getFormasDisponiveis={getFormasDisponiveis} getPrazosDisponiveis={getPrazosDisponiveis}
              getLimiteDisponivel={getLimiteDisponivel}
            />
          )}
          {step === 1 && (
            <PedidoStep2Itens
              integradoId={integradoId} produtos={produtos} tabelaItens={tabelaItens}
              itens={itens} setItens={setItens}
              itensOvos={itensOvos} setItensOvos={setItensOvos}
              novoItem={novoItem} setNovoItem={setNovoItem}
              margemMinima={margemMinima} formData={formData} setFormData={setFormData}
              handleAddItem={handleAddItem} handleAddLoteItem={handleAddLoteItem}
              handleAddOvoItem={handleAddOvoItem} handleRemoveItem={handleRemoveItem}
              handleUpdateItemPrice={handleUpdateItemPrice} calcularTotais={calcularTotais}
            />
          )}
          {step === 2 && (
            <PedidoStep3Revisao
              formData={formData} clientes={clientes} itens={itens}
              calcularTotais={calcularTotais}
              formasPagamento={formasPagamento} selectedFormaId={selectedFormaId}
              prazosPagamento={prazosPagamento} selectedPrazoId={selectedPrazoId}
            />
          )}
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <div className="flex-1" />
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
          )}
          {step < 2 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canAdvance()}>
              Próximo <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => handleSubmit('rascunho')} disabled={saving}>
                <Save className="w-4 h-4 mr-1" /> Rascunho
              </Button>
              <Button onClick={() => handleSubmit('pendente_aprovacao')} disabled={saving}>
                <Send className="w-4 h-4 mr-1" /> Enviar p/ Aprovação
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
