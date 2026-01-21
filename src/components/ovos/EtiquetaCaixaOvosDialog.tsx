import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Printer, Tag } from 'lucide-react';
import jsPDF from 'jspdf';

interface EtiquetaCaixaOvosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integradoId: string;
}

interface LoteEstoque {
  id: string;
  lote_interno: string;
  tipo_ovo: string;
  classificacao_peso: string;
  data_producao: string;
  data_validade: string;
  quantidade_atual: number;
}

const TIPOS_LABEL: Record<string, string> = {
  branco: 'BRANCO',
  castanho: 'CASTANHO',
  vermelho: 'VERMELHO',
  caipira: 'CAIPIRA',
};

const CLASSIFICACAO_LABEL: Record<string, string> = {
  medio: 'MÉDIO',
  grande: 'GRANDE',
  extra: 'EXTRA',
  jumbo: 'JUMBO',
};

export default function EtiquetaCaixaOvosDialog({
  open,
  onOpenChange,
  integradoId,
}: EtiquetaCaixaOvosDialogProps) {
  const [loading, setLoading] = useState(true);
  const [lotes, setLotes] = useState<LoteEstoque[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [quantidadeEtiquetas, setQuantidadeEtiquetas] = useState<Record<string, number>>({});
  const [organizacao, setOrganizacao] = useState<any>(null);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, integradoId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: estoqueData, error } = await supabase
        .from('estoque_ovos')
        .select('id, lote_interno, tipo_ovo, classificacao_peso, data_producao, data_validade, quantidade_atual')
        .eq('integrado_id', integradoId)
        .eq('ativo', true)
        .gt('quantidade_atual', 0)
        .order('data_producao', { ascending: true });

      if (error) throw error;
      setLotes(estoqueData || []);

      // Inicializar quantidade de etiquetas (1 por lote)
      const qtdInicial: Record<string, number> = {};
      (estoqueData || []).forEach((l: LoteEstoque) => {
        qtdInicial[l.id] = 1;
      });
      setQuantidadeEtiquetas(qtdInicial);

      // Buscar organização
      const { data: org } = await supabase
        .from('organizacoes')
        .select('*')
        .eq('integrado_id', integradoId)
        .single();

      setOrganizacao(org);
    } catch (error: any) {
      toast.error('Erro ao carregar lotes: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelecionado = (id: string) => {
    const newSet = new Set(selecionados);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelecionados(newSet);
  };

  const selecionarTodos = () => {
    if (selecionados.size === lotes.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(lotes.map(l => l.id)));
    }
  };

  const gerarEtiquetas = () => {
    if (selecionados.size === 0) {
      toast.error('Selecione pelo menos um lote');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Configuração para etiquetas 3x10 (3 colunas, 10 linhas por página)
    const etiquetaLargura = 63;
    const etiquetaAltura = 29;
    const margemEsquerda = 7;
    const margemTopo = 5;
    const espacoHorizontal = 3;
    const espacoVertical = 0;

    let col = 0;
    let linha = 0;
    let totalEtiquetas = 0;

    lotes
      .filter(l => selecionados.has(l.id))
      .forEach((lote) => {
        const quantidade = quantidadeEtiquetas[lote.id] || 1;

        for (let i = 0; i < quantidade; i++) {
          if (linha >= 10) {
            doc.addPage();
            col = 0;
            linha = 0;
          }

          const x = margemEsquerda + col * (etiquetaLargura + espacoHorizontal);
          const y = margemTopo + linha * (etiquetaAltura + espacoVertical);

          // Borda da etiqueta
          doc.setDrawColor(180);
          doc.setLineWidth(0.1);
          doc.rect(x, y, etiquetaLargura, etiquetaAltura);

          // Empresa (cabeçalho)
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          const nomeEmpresa = organizacao?.nome_fantasia || organizacao?.razao_social || 'PRODUTOR';
          doc.text(nomeEmpresa.substring(0, 30), x + 2, y + 4);

          // Tipo e Classificação
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          const tipoClass = `${TIPOS_LABEL[lote.tipo_ovo] || lote.tipo_ovo} - ${CLASSIFICACAO_LABEL[lote.classificacao_peso] || lote.classificacao_peso}`;
          doc.text(tipoClass, x + 2, y + 10);

          // Lote
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text(`Lote: ${lote.lote_interno}`, x + 2, y + 15);

          // Datas
          doc.setFontSize(7);
          doc.text(`Prod: ${format(new Date(lote.data_producao), 'dd/MM/yyyy')}`, x + 2, y + 20);
          doc.text(`Val: ${format(new Date(lote.data_validade), 'dd/MM/yyyy')}`, x + 2, y + 24);

          // Código de barras simplificado (linha de texto)
          doc.setFontSize(8);
          doc.setFont('courier', 'normal');
          doc.text(lote.lote_interno, x + etiquetaLargura - 25, y + 24);

          // Quantidade na etiqueta
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(`${lote.quantidade_atual} un`, x + etiquetaLargura - 18, y + 12);

          totalEtiquetas++;
          col++;
          if (col >= 3) {
            col = 0;
            linha++;
          }
        }
      });

    doc.save(`etiquetas_ovos_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
    toast.success(`${totalEtiquetas} etiqueta(s) gerada(s) com sucesso!`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Gerar Etiquetas de Caixas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Selecione os lotes e a quantidade de etiquetas para cada um. As etiquetas serão geradas em formato A4 (3 colunas x 10 linhas).
          </p>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando lotes...</div>
          ) : lotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum lote em estoque</div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  checked={selecionados.size === lotes.length}
                  onCheckedChange={selecionarTodos}
                />
                <Label className="text-sm">Selecionar todos</Label>
                <Badge variant="secondary" className="ml-auto">
                  {selecionados.size} selecionado(s)
                </Badge>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Classificação</TableHead>
                      <TableHead>Produção</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                      <TableHead className="w-24">Etiquetas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lotes.map((lote) => (
                      <TableRow key={lote.id}>
                        <TableCell>
                          <Checkbox
                            checked={selecionados.has(lote.id)}
                            onCheckedChange={() => toggleSelecionado(lote.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{lote.lote_interno}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{TIPOS_LABEL[lote.tipo_ovo] || lote.tipo_ovo}</Badge>
                        </TableCell>
                        <TableCell>{CLASSIFICACAO_LABEL[lote.classificacao_peso] || lote.classificacao_peso}</TableCell>
                        <TableCell>{format(new Date(lote.data_producao), 'dd/MM/yy', { locale: ptBR })}</TableCell>
                        <TableCell>{format(new Date(lote.data_validade), 'dd/MM/yy', { locale: ptBR })}</TableCell>
                        <TableCell className="text-right">{lote.quantidade_atual.toLocaleString()}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            value={quantidadeEtiquetas[lote.id] || 1}
                            onChange={(e) => setQuantidadeEtiquetas(prev => ({
                              ...prev,
                              [lote.id]: parseInt(e.target.value) || 1
                            }))}
                            className="w-16 h-8 text-center"
                            disabled={!selecionados.has(lote.id)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={gerarEtiquetas} disabled={selecionados.size === 0}>
              <Printer className="w-4 h-4 mr-2" />
              Gerar PDF ({selecionados.size > 0 
                ? Array.from(selecionados).reduce((sum, id) => sum + (quantidadeEtiquetas[id] || 1), 0)
                : 0} etiquetas)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
