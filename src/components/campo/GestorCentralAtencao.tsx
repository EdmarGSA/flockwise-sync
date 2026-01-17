import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, AlertTriangle, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LoteAnalytics } from '@/hooks/useLoteAnalytics';

interface GestorCentralAtencaoProps {
  analytics: LoteAnalytics[];
  loading: boolean;
}

export function GestorCentralAtencao({ analytics, loading }: GestorCentralAtencaoProps) {
  const navigate = useNavigate();

  const lotesComAlerta = analytics.filter(l => l.alertas.length > 0);

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Central de Atenção
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-muted-foreground">
            Carregando...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (lotesComAlerta.length === 0) {
    return (
      <Card className="bg-card border-border border-green-500/30">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Central de Atenção
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-lg font-medium text-green-500">Tudo sob controle!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Nenhum lote com alertas no momento
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            Central de Atenção
          </CardTitle>
          <Badge variant="outline" className="text-destructive border-destructive/30">
            {lotesComAlerta.length} lotes
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-4">
            {lotesComAlerta.map((lote) => (
              <div 
                key={lote.loteId}
                className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                  lote.status === 'critico' 
                    ? 'bg-destructive/5 border-destructive/30 hover:bg-destructive/10' 
                    : 'bg-yellow-500/5 border-yellow-500/30 hover:bg-yellow-500/10'
                }`}
                onClick={() => navigate(`/lote/${lote.loteId}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {lote.status === 'critico' ? (
                        <AlertCircle className="w-4 h-4 text-destructive" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      )}
                      <span className="font-medium text-foreground">
                        {lote.nucleoNome} / {lote.galpaoNome}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {lote.linhagemLabel}
                      </Badge>
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        {lote.idadeDias}d
                      </Badge>
                    </div>
                    
                    <ul className="space-y-1.5 mt-2">
                      {lote.alertas.map((alerta, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            lote.status === 'critico' ? 'bg-destructive' : 'bg-yellow-500'
                          }`} />
                          <span className="text-muted-foreground">{alerta}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Score badge */}
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-muted-foreground">Score:</span>
                      <Badge 
                        className={`font-mono ${
                          lote.score < 50 
                            ? 'bg-destructive/20 text-destructive border-destructive/30' 
                            : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
                        }`}
                      >
                        {lote.score}/100
                      </Badge>
                    </div>
                  </div>
                  
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
