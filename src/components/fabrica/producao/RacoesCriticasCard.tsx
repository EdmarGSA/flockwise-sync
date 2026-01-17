import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Factory, CheckCircle } from 'lucide-react';

interface RacaoCritica {
  id: string;
  nome: string;
  demandaTotal: number;
  estoqueAtual: number;
  deficit: number;
  sugestaoProducao: number;
  unidade_medida: string;
  opExistente?: {
    id: string;
    status: string;
    numero_op: number;
  };
}

interface RacoesCriticasCardProps {
  racoesCriticas: RacaoCritica[];
  loading?: boolean;
  onGerarOP: (racao: RacaoCritica) => void;
}

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'rascunho': return 'secondary';
    case 'pendente': return 'outline';
    case 'aprovada': return 'default';
    case 'em_producao': return 'default';
    default: return 'outline';
  }
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'rascunho': 'Rascunho',
    'pendente': 'Pendente',
    'aprovada': 'Aprovada',
    'em_producao': 'Em Produção'
  };
  return labels[status] || status;
};

const getStatusClasses = (status: string): string => {
  switch (status) {
    case 'rascunho': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
    case 'pendente': return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
    case 'aprovada': return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
    case 'em_producao': return 'bg-green-500/10 text-green-600 border-green-500/30';
    default: return '';
  }
};

export default function RacoesCriticasCard({
  racoesCriticas,
  loading = false,
  onGerarOP
}: RacoesCriticasCardProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Rações Críticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          Rações Críticas
        </CardTitle>
        <CardDescription>
          Rações com estoque abaixo da demanda prevista (Estoque &lt; Demanda Total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {racoesCriticas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
            <p className="text-muted-foreground">
              Nenhuma ração em situação crítica
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              O estoque atual atende a demanda prevista
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ração</TableHead>
                <TableHead className="text-right">Demanda Total</TableHead>
                <TableHead className="text-right">Estoque Atual</TableHead>
                <TableHead className="text-right">Déficit</TableHead>
                <TableHead className="text-right">Sugestão Produção</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {racoesCriticas.map(racao => (
                <TableRow key={racao.id}>
                  <TableCell className="font-medium">{racao.nome}</TableCell>
                  <TableCell className="text-right">
                    {racao.demandaTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} {racao.unidade_medida}
                  </TableCell>
                  <TableCell className="text-right">
                    {racao.estoqueAtual.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} {racao.unidade_medida}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="destructive">
                      -{Math.abs(racao.deficit).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} {racao.unidade_medida}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary">
                    {racao.sugestaoProducao.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} {racao.unidade_medida}
                  </TableCell>
                  <TableCell className="text-right">
                    {racao.opExistente ? (
                      <Badge 
                        variant={getStatusVariant(racao.opExistente.status)}
                        className={`cursor-pointer ${getStatusClasses(racao.opExistente.status)}`}
                        onClick={() => navigate('/ordens-producao')}
                      >
                        OP #{racao.opExistente.numero_op} - {getStatusLabel(racao.opExistente.status)}
                      </Badge>
                    ) : (
                      <Button 
                        size="sm" 
                        onClick={() => onGerarOP(racao)}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Factory className="w-4 h-4 mr-1" />
                        Gerar OP
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
