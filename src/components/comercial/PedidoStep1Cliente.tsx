import { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CreditCard, AlertCircle, History, Search } from 'lucide-react';

interface PedidoStep1ClienteProps {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  clientes: any[];
  tabelasPreco: any[];
  formasPagamento: any[];
  prazosPagamento: any[];
  creditoCliente: any;
  creditoFormas: any[];
  limiteUtilizado: number;
  clienteInadimplente: boolean;
  contasVencidas: any[];
  historicoCliente: any[];
  selectedFormaId: string;
  setSelectedFormaId: (v: string) => void;
  selectedPrazoId: string;
  setSelectedPrazoId: (v: string) => void;
  getFormasDisponiveis: () => any[];
  getPrazosDisponiveis: () => any[];
  getLimiteDisponivel: () => number;
}

export default function PedidoStep1Cliente({
  formData, setFormData, clientes, tabelasPreco,
  formasPagamento, prazosPagamento,
  creditoCliente, creditoFormas, limiteUtilizado,
  clienteInadimplente, contasVencidas, historicoCliente,
  selectedFormaId, setSelectedFormaId,
  selectedPrazoId, setSelectedPrazoId,
  getFormasDisponiveis, getPrazosDisponiveis, getLimiteDisponivel
}: PedidoStep1ClienteProps) {
  const [clienteSearch, setClienteSearch] = useState('');

  const filteredClientes = useMemo(() => {
    if (!clienteSearch) return clientes;
    const term = clienteSearch.toLowerCase();
    return clientes.filter(c =>
      (c.nome_fantasia || '').toLowerCase().includes(term) ||
      (c.razao_social_nome || '').toLowerCase().includes(term)
    );
  }, [clientes, clienteSearch]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Cliente *</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={clienteSearch}
              onChange={(e) => setClienteSearch(e.target.value)}
              className="pl-10 mb-2"
            />
          </div>
          <Select
            value={formData.cliente_id}
            onValueChange={(v) => setFormData((prev: any) => ({ ...prev, cliente_id: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              {filteredClientes.map(cliente => (
                <SelectItem key={cliente.id} value={cliente.id}>
                  {cliente.nome_fantasia || cliente.razao_social_nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tabela de Preços</Label>
          <Select
            value={formData.tabela_preco_id}
            onValueChange={(v) => setFormData((prev: any) => ({ ...prev, tabela_preco_id: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a tabela" />
            </SelectTrigger>
            <SelectContent>
              {tabelasPreco.map(tabela => (
                <SelectItem key={tabela.id} value={tabela.id}>
                  {tabela.nome} {tabela.padrao && '(Padrão)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Delinquency Alert */}
      {clienteInadimplente && (
        <Card className="border-2 border-destructive bg-destructive/10">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <span className="font-bold text-destructive">CLIENTE INADIMPLENTE</span>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              {contasVencidas.length} conta(s) em atraso — Total: R$ {contasVencidas.reduce((a, c) => a + (c.valor || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-2 text-sm font-medium text-destructive mt-2">
              <AlertCircle className="w-4 h-4" />
              SOMENTE VENDA À VISTA
            </div>
          </CardContent>
        </Card>
      )}

      {/* Credit Card */}
      {creditoCliente && (
        <Card className={`border-2 ${getLimiteDisponivel() < 0 ? 'border-destructive bg-destructive/10' : getLimiteDisponivel() < creditoCliente.limite_credito * 0.2 ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20' : 'border-green-500 bg-green-50/50 dark:bg-green-950/20'}`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5" />
              <span className="font-medium">Crédito do Cliente</span>
              {getLimiteDisponivel() < 0 && <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Limite excedido</Badge>}
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Limite</p>
                <p className="font-medium">R$ {creditoCliente.limite_credito.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Utilizado</p>
                <p className="font-medium">R$ {limiteUtilizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Disponível</p>
                <p className={`font-bold ${getLimiteDisponivel() < 0 ? 'text-destructive' : 'text-green-600'}`}>
                  R$ {getLimiteDisponivel().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment and Delivery */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Forma de Pagamento</Label>
          <Select
            value={selectedFormaId}
            onValueChange={(v) => {
              setSelectedFormaId(v);
              setSelectedPrazoId("");
              const forma = formasPagamento.find((f: any) => f.id === v);
              if (forma) {
                setFormData((prev: any) => ({ ...prev, forma_pagamento: forma.codigo }));
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {getFormasDisponiveis().map((forma: any) => (
                <SelectItem key={forma.id} value={forma.id}>{forma.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Prazo</Label>
          <Select
            value={selectedPrazoId}
            onValueChange={(v) => {
              setSelectedPrazoId(v);
              const prazo = prazosPagamento.find((p: any) => p.id === v);
              if (prazo && prazo.dias_parcelas.length > 0) {
                setFormData((prev: any) => ({ ...prev, prazo_pagamento_dias: prazo.dias_parcelas[prazo.dias_parcelas.length - 1] }));
              }
            }}
            disabled={!selectedFormaId}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedFormaId ? "Selecione" : "Selecione forma primeiro"} />
            </SelectTrigger>
            <SelectContent>
              {getPrazosDisponiveis().map((prazo: any) => (
                <SelectItem key={prazo.id} value={prazo.id}>{prazo.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Data Entrega Prevista</Label>
          <Input
            type="date"
            value={formData.data_entrega_prevista}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, data_entrega_prevista: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Observações</Label>
          <Input
            value={formData.observacoes}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, observacoes: e.target.value }))}
            placeholder="Observações..."
          />
        </div>
      </div>

      {/* Client History */}
      {historicoCliente.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <History className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Últimas compras</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              {historicoCliente.slice(0, 3).map((hist: any, idx: number) => (
                <div key={idx}>
                  {hist.produto?.nome}: {hist.quantidade} {hist.unidade_medida} x R$ {hist.preco_unitario?.toFixed(2)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
