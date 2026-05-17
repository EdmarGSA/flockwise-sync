import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Scale, Clock, Users, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PesagemItem {
  id: string;
  quantidade_aves: number;
  peso_liquido_kg: number;
}

interface PesagemSessao {
  id: string;
  created_at: string;
  itens: PesagemItem[];
}

interface PesagemDetalheDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataPesagem: string;
  loteId: string;
  dia: number;
  pesoReferencia?: number; // peso de referência em kg para o dia
}

export default function PesagemDetalheDialog({
  open,
  onOpenChange,
  dataPesagem,
  loteId,
  dia,
  pesoReferencia
}: PesagemDetalheDialogProps) {
  const [sessoes, setSessoes] = useState<PesagemSessao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && dataPesagem && loteId) {
      fetchPesagens();
    }
  }, [open, dataPesagem, loteId]);

  const fetchPesagens = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('pesagens')
      .select(`
        id,
        created_at,
        pesagem_itens (id, quantidade_aves, peso_liquido_kg)
      `)
      .eq('lote_id', loteId)
      .eq('data_pesagem', dataPesagem)
      .order('created_at', { ascending: true });

    if (data && !error) {
      const sessoesProcessadas = data.map((p: any) => ({
        id: p.id,
        created_at: p.created_at,
        itens: p.pesagem_itens.map((item: any) => ({
          id: item.id,
          quantidade_aves: item.quantidade_aves,
          peso_liquido_kg: item.peso_liquido_kg
        }))
      }));
      setSessoes(sessoesProcessadas);
    }
    
    setLoading(false);
  };

  // Totais por sessão (peso em KG)
  const calcularTotaisSessao = (itens: PesagemItem[]) => {
    const totalAves = itens.reduce((acc, item) => acc + item.quantidade_aves, 0);
    const totalPesoKg = itens.reduce((acc, item) => acc + Number(item.peso_liquido_kg || 0), 0);
    const mediaKg = totalAves > 0 ? totalPesoKg / totalAves : 0;
    return { totalAves, totalPesoKg, mediaKg };
  };

  const calcularConsolidado = () => {
    const todosItens = sessoes.flatMap(s => s.itens);
    return calcularTotaisSessao(todosItens);
  };

  const consolidado = calcularConsolidado();
  const diferencaRef = pesoReferencia ? ((consolidado.mediaKg - pesoReferencia) / pesoReferencia) * 100 : null;

  const dataFormatada = dataPesagem 
    ? format(new Date(dataPesagem + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full w-full h-[95vh] p-0 gap-0 sm:rounded-t-xl rounded-none">
        <DialogHeader className="px-4 py-3 border-b border-border shrink-0">
          <DialogTitle className="text-lg flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            Dia {dia} - {dataFormatada}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 h-[calc(95vh-60px)]">
          <div className="p-4 space-y-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando detalhes...
              </div>
            ) : sessoes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma pesagem encontrada
              </div>
            ) : (
              <>
                {/* Consolidado do Dia */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Consolidado do Dia
                      {sessoes.length > 1 && (
                        <Badge variant="secondary" className="ml-2">
                          {sessoes.length} sessões
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Aves</p>
                        <p className="text-lg font-bold">{consolidado.totalAves}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Peso Total</p>
                        <p className="text-lg font-bold">{consolidado.totalPesoKg.toFixed(2)} kg</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Média</p>
                        <p className="text-lg font-bold">{(consolidado.mediaKg * 1000).toFixed(1)} g</p>
                      </div>
                    </div>
                    {pesoReferencia && diferencaRef !== null && (
                      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Ref. linhagem: {(pesoReferencia * 1000).toFixed(0)}g</span>
                        <Badge variant={diferencaRef >= 0 ? "default" : "destructive"}>
                          {diferencaRef >= 0 ? '+' : ''}{diferencaRef.toFixed(1)}%
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Sessões individuais */}
                {sessoes.map((sessao, index) => {
                  const totais = calcularTotaisSessao(sessao.itens);
                  const horaFormatada = format(new Date(sessao.created_at), "HH:mm", { locale: ptBR });
                  
                  return (
                    <Card key={sessao.id} className="bg-card border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          Sessão {index + 1} - {horaFormatada}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Tabela de itens */}
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Aves</TableHead>
                                <TableHead>Peso Total</TableHead>
                                <TableHead className="text-right">Média</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sessao.itens.map((item, itemIndex) => {
                                const pesoKg = Number(item.peso_liquido_kg || 0);
                                const mediaItemKg = item.quantidade_aves > 0 
                                  ? pesoKg / item.quantidade_aves 
                                  : 0;
                                return (
                                  <TableRow key={item.id}>
                                    <TableCell className="font-medium">{itemIndex + 1}</TableCell>
                                    <TableCell>{item.quantidade_aves}</TableCell>
                                    <TableCell>{pesoKg.toFixed(3)} kg</TableCell>
                                    <TableCell className="text-right">{(mediaItemKg * 1000).toFixed(1)} g</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                        
                        {/* Subtotal da sessão */}
                        <div className="flex items-center justify-between px-2 py-2 bg-muted/50 rounded-md text-sm">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span>{totais.totalAves} aves</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">{totais.totalPesoKg.toFixed(2)} kg</span>
                            <Badge variant="outline">{(totais.mediaKg * 1000).toFixed(1)} g</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
