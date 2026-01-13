import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, TrendingDown, CalendarDays, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PesagemAnaliseCardProps {
  pesoMedio: number; // kg
  avesVivas: number;
  consumoTotal: number; // kg
  conversaoAlimentar: number;
  conversaoEsperada: number | null;
  diaAtual: number;
  diaReferencia: number | null;
  pesoReferencia: number | null; // kg
  dataPesagem?: string; // data da pesagem para exibição
}

export function PesagemAnaliseCard({
  pesoMedio,
  avesVivas,
  consumoTotal,
  conversaoAlimentar,
  conversaoEsperada,
  diaAtual,
  diaReferencia,
  pesoReferencia,
  dataPesagem,
}: PesagemAnaliseCardProps) {
  const pesoTotalLote = pesoMedio * avesVivas;
  
  // Calculate CA difference
  const diferencaCA = conversaoEsperada !== null 
    ? conversaoAlimentar - conversaoEsperada 
    : null;
  
  // Calculate days ahead/behind
  const diasDiferenca = diaReferencia !== null 
    ? diaReferencia - diaAtual 
    : null;

  const getCAStatusBadge = () => {
    if (diferencaCA === null) return null;
    
    const absCA = Math.abs(diferencaCA);
    
    if (absCA <= 0.03) {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 gap-1">
          <CheckCircle className="w-3 h-3" />
          CA dentro da meta
        </Badge>
      );
    } else if (diferencaCA > 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <TrendingUp className="w-3 h-3" />
          +{diferencaCA.toFixed(2)} acima (ruim)
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 gap-1">
          <TrendingDown className="w-3 h-3" />
          {diferencaCA.toFixed(2)} abaixo (bom)
        </Badge>
      );
    }
  };

  const getIdadeStatusBadge = () => {
    if (diasDiferenca === null) return null;
    
    if (Math.abs(diasDiferenca) <= 1) {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 gap-1">
          <CheckCircle className="w-3 h-3" />
          Na idade certa
        </Badge>
      );
    } else if (diasDiferenca > 0) {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 gap-1">
          <TrendingUp className="w-3 h-3" />
          {diasDiferenca} dias adiantado
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="w-3 h-3" />
          {Math.abs(diasDiferenca)} dias de atraso
        </Badge>
      );
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="w-4 h-4 text-primary" />
          Análise de Conversão Alimentar
          {dataPesagem && (
            <Badge variant="outline" className="ml-auto text-xs font-normal">
              Pesagem: {format(new Date(dataPesagem + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div className="bg-background/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Peso Médio</p>
            <p className="text-lg font-bold text-primary">{pesoMedio.toFixed(3)} kg</p>
          </div>
          <div className="bg-background/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Peso Total Lote</p>
            <p className="text-lg font-bold">{pesoTotalLote.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg</p>
          </div>
          <div className="bg-background/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Consumo Estimado</p>
            <p className="text-lg font-bold">{consumoTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg</p>
          </div>
          <div className="bg-primary/20 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Conversão Alimentar</p>
            <p className="text-2xl font-bold text-primary">{conversaoAlimentar.toFixed(2)}</p>
          </div>
        </div>

        {/* Reference comparison */}
        {(conversaoEsperada !== null || pesoReferencia !== null) && (
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Comparativo com Referência (Dia {diaAtual})</p>
            
            <div className="grid grid-cols-2 gap-4">
              {pesoReferencia !== null && (
                <div className="bg-background/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Peso Referência (Dia {diaAtual})</p>
                  <p className="font-bold">{pesoReferencia.toFixed(3)} kg</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Peso medido ({pesoMedio.toFixed(3)} kg) ≈ Dia {diaReferencia}
                  </p>
                </div>
              )}
              
              {conversaoEsperada !== null && (
                <div className="bg-background/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">CA Esperada (peso atual)</p>
                  <p className="font-bold">{conversaoEsperada.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Para peso ~{(pesoMedio * 1000).toFixed(0)}g
                  </p>
                </div>
              )}
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Status CA:</span>
                {getCAStatusBadge()}
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Status Idade:</span>
                {getIdadeStatusBadge()}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
