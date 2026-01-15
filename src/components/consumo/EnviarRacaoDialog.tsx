import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Truck, Package, Calendar, Info, Clock, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getDateDisabledFunction, isRetroactiveDate } from '@/lib/dateValidation';

interface SolicitacaoRacao {
  id: string;
  lote_id: string;
  tipo_racao: string;
  quantidade_solicitada_kg: number;
  data_prevista_entrega: string | null;
  status: string;
  data_solicitacao: string;
}

interface ProdutoRacao {
  id: string;
  nome: string;
  estoque_atual: number;
  unidade_medida: string;
}

interface LoteInfo {
  nucleo_nome: string;
  galpao_nome: string;
  tipo_producao: string;
}

interface EnviarRacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitacao: SolicitacaoRacao;
  loteInfo: LoteInfo | null;
  onSuccess: () => void;
}

export function EnviarRacaoDialog({
  open,
  onOpenChange,
  solicitacao,
  loteInfo,
  onSuccess,
}: EnviarRacaoDialogProps) {
  const [tipoRacao, setTipoRacao] = useState(solicitacao.tipo_racao);
  const [quantidade, setQuantidade] = useState(solicitacao.quantidade_solicitada_kg.toString());
  const [observacoes, setObservacoes] = useState('');
  const [produtosRacao, setProdutosRacao] = useState<ProdutoRacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [dataEnvio, setDataEnvio] = useState<Date>(new Date());
  const [horaEnvio, setHoraEnvio] = useState(format(new Date(), 'HH:mm'));

  useEffect(() => {
    if (open) {
      setTipoRacao(solicitacao.tipo_racao);
      setQuantidade(solicitacao.quantidade_solicitada_kg.toString());
      setObservacoes('');
      setDataEnvio(new Date());
      setHoraEnvio(format(new Date(), 'HH:mm'));
      fetchProdutosRacao();
    }
  }, [open, solicitacao]);

  const combinarDataHora = (data: Date, hora: string): Date => {
    const [hours, minutes] = hora.split(':').map(Number);
    const combined = new Date(data);
    combined.setHours(hours, minutes, 0, 0);
    return combined;
  };

  const fetchProdutosRacao = async () => {
    if (!loteInfo) return;
    
    setLoadingProdutos(true);
    try {
      // First get the "Ração" group
      const { data: grupoRacao } = await supabase
        .from('grupos_produto')
        .select('id')
        .eq('nome', 'Ração')
        .maybeSingle();

      if (!grupoRacao) {
        setProdutosRacao([]);
        return;
      }

      // Get animal group for the lot's production type
      const { data: grupoAnimal } = await supabase
        .from('grupos_animal')
        .select('id')
        .eq('nome', loteInfo.tipo_producao)
        .maybeSingle();

      // Get products filtered by group and animal type
      let query = supabase
        .from('produtos')
        .select('id, nome, estoque_atual, unidade_medida')
        .eq('grupo_produto_id', grupoRacao.id)
        .eq('ativo', true);

      if (grupoAnimal) {
        query = query.eq('grupo_animal_id', grupoAnimal.id);
      }

      const { data, error } = await query.order('nome');

      if (error) throw error;
      setProdutosRacao(data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos de ração:', error);
      toast.error('Erro ao carregar produtos de ração');
    } finally {
      setLoadingProdutos(false);
    }
  };

  const handleConfirmarEnvio = async () => {
    const qtd = parseFloat(quantidade);
    if (isNaN(qtd) || qtd <= 0) {
      toast.error('Informe uma quantidade válida');
      return;
    }

    if (!tipoRacao.trim()) {
      toast.error('Selecione o tipo de ração');
      return;
    }

    setLoading(true);
    try {
      // Buscar produto de ração pelo nome para gerar Kardex
      const produtoEncontrado = produtosRacao.find(p => p.nome === tipoRacao);
      
      if (produtoEncontrado) {
        // Gerar Kardex de saída
        const { error: kardexError } = await supabase
          .from('kardex')
          .insert({
            produto_id: produtoEncontrado.id,
            integrado_id: (await supabase.from('solicitacoes_racao').select('integrado_id').eq('id', solicitacao.id).single()).data?.integrado_id,
            tipo_movimento: 'saida_racao_lote',
            quantidade: qtd,
            saldo_anterior: produtoEncontrado.estoque_atual,
            saldo_atual: produtoEncontrado.estoque_atual - qtd,
            documento_ref: `SOLIC-${solicitacao.id.slice(0, 8)}`,
            observacao: `Envio para lote ${loteInfo?.nucleo_nome}/${loteInfo?.galpao_nome}`,
          });

        if (kardexError) {
          console.error('Erro ao criar kardex:', kardexError);
        } else {
          // Atualizar estoque do produto
          await supabase
            .from('produtos')
            .update({ estoque_atual: produtoEncontrado.estoque_atual - qtd })
            .eq('id', produtoEncontrado.id);
        }
      }

      const { error } = await supabase
        .from('solicitacoes_racao')
        .update({
          tipo_racao: tipoRacao,
          quantidade_solicitada_kg: qtd,
          status: 'enviado',
          data_envio: combinarDataHora(dataEnvio, horaEnvio).toISOString(),
          observacoes_envio: observacoes.trim() || null,
        })
        .eq('id', solicitacao.id);

      if (error) throw error;

      toast.success('Envio confirmado com sucesso!');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao confirmar envio:', error);
      toast.error('Erro ao confirmar envio');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Enviar Ração
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info do Lote */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="w-4 h-4" />
              <span>Informações da Solicitação</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Lote:</span>
                <p className="font-medium">
                  {loteInfo ? `${loteInfo.nucleo_nome} - ${loteInfo.galpao_nome}` : '-'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Solicitado:</span>
                <p className="font-medium">{solicitacao.quantidade_solicitada_kg.toLocaleString('pt-BR')} kg</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Previsão de Entrega:</span>
                <p className="font-medium flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDateTime(solicitacao.data_prevista_entrega)}
                </p>
              </div>
            </div>
          </div>

          {/* Tipo de Ração */}
          <div className="space-y-2">
            <Label htmlFor="tipo_racao">Tipo de Ração</Label>
            <Select value={tipoRacao} onValueChange={setTipoRacao} disabled={loadingProdutos}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a ração" />
              </SelectTrigger>
              <SelectContent>
                {produtosRacao.map((produto) => (
                  <SelectItem key={produto.id} value={produto.nome}>
                    <div className="flex items-center justify-between gap-4 w-full">
                      <span>{produto.nome}</span>
                      <span className="text-xs text-muted-foreground">
                        (Estoque: {produto.estoque_atual.toLocaleString('pt-BR')} {produto.unidade_medida})
                      </span>
                    </div>
                  </SelectItem>
                ))}
                {/* Allow custom value if not in list */}
                {!produtosRacao.some(p => p.nome === tipoRacao) && tipoRacao && (
                  <SelectItem value={tipoRacao}>{tipoRacao}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Quantidade */}
          <div className="space-y-2">
            <Label htmlFor="quantidade">Quantidade a Enviar (kg)</Label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="quantidade"
                type="number"
                step="0.01"
                min="0"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                className="pl-10"
                placeholder="0,00"
              />
            </div>
          </div>

          {/* Data e Hora do Envio */}
          <div className="space-y-2">
            <Label>Data e Hora do Envio</Label>
            <div className="flex gap-2 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dataEnvio, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dataEnvio}
                    onSelect={(date) => date && setDataEnvio(date)}
                    disabled={getDateDisabledFunction(false)}
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <Input
                type="time"
                className="w-28"
                value={horaEnvio}
                onChange={(e) => setHoraEnvio(e.target.value)}
              />
              {isRetroactiveDate(dataEnvio) && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 whitespace-nowrap">
                  <Clock className="w-3 h-3 mr-1" />
                  Retroativo
                </Badge>
              )}
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações do Envio (opcional)</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Ração substituída por falta de estoque..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmarEnvio} disabled={loading} className="gap-1">
            <Truck className="w-4 h-4" />
            {loading ? 'Enviando...' : 'Confirmar Envio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
