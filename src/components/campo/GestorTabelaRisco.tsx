import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LoteAnalytics } from '@/hooks/useLoteAnalytics';

interface GestorTabelaRiscoProps {
  analytics: LoteAnalytics[];
  loading: boolean;
}

export function GestorTabelaRisco({ analytics, loading }: GestorTabelaRiscoProps) {
  const navigate = useNavigate();

  const getStatusBadge = (status: 'ok' | 'atencao' | 'critico') => {
    const config = {
      ok: { label: 'OK', variant: 'default' as const, className: 'bg-green-500/20 text-green-500 border-green-500/30' },
      atencao: { label: 'Atenção', variant: 'secondary' as const, className: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' },
      critico: { label: 'Crítico', variant: 'destructive' as const, className: 'bg-destructive/20 text-destructive border-destructive/30' },
    };
    const c = config[status];
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  const getScoreBadge = (score: number) => {
    if (score >= 75) {
      return <Badge className="bg-green-500/20 text-green-500 border-green-500/30 font-mono">{score}</Badge>;
    } else if (score >= 50) {
      return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 font-mono">{score}</Badge>;
    } else {
      return <Badge className="bg-destructive/20 text-destructive border-destructive/30 font-mono">{score}</Badge>;
    }
  };

  const getPesoVsMetaDisplay = (pesoVsMeta: number) => {
    if (pesoVsMeta > 2) {
      return (
        <span className="flex items-center gap-1 text-green-500">
          <TrendingUp className="w-3 h-3" />
          +{pesoVsMeta.toFixed(0)}%
        </span>
      );
    } else if (pesoVsMeta < -5) {
      return (
        <span className="flex items-center gap-1 text-destructive">
          <TrendingDown className="w-3 h-3" />
          {pesoVsMeta.toFixed(0)}%
        </span>
      );
    } else if (pesoVsMeta < -2) {
      return (
        <span className="flex items-center gap-1 text-yellow-500">
          <TrendingDown className="w-3 h-3" />
          {pesoVsMeta.toFixed(0)}%
        </span>
      );
    } else {
      return (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Minus className="w-3 h-3" />
          {pesoVsMeta >= 0 ? '+' : ''}{pesoVsMeta.toFixed(0)}%
        </span>
      );
    }
  };

  const getMortalidadeDisplay = (lote: LoteAnalytics) => {
    if (lote.mortalidadePercent >= lote.mortalidadeMetaAlerta) {
      return <span className="text-destructive font-medium">{lote.mortalidadePercent.toFixed(2)}%</span>;
    } else if (lote.mortalidadePercent > lote.mortalidadeMetaOk) {
      return <span className="text-yellow-500 font-medium">{lote.mortalidadePercent.toFixed(2)}%</span>;
    } else {
      return <span className="text-green-500">{lote.mortalidadePercent.toFixed(2)}%</span>;
    }
  };

  const getCADisplay = (lote: LoteAnalytics) => {
    if (lote.caAtual === 0) return <span className="text-muted-foreground">-</span>;
    if (lote.caAtual >= lote.caMetaAlerta) {
      return <span className="text-destructive font-medium">{lote.caAtual.toFixed(2)}</span>;
    } else if (lote.caAtual > lote.caMetaOk) {
      return <span className="text-yellow-500 font-medium">{lote.caAtual.toFixed(2)}</span>;
    } else {
      return <span className="text-green-500">{lote.caAtual.toFixed(2)}</span>;
    }
  };

  const getAtrasoDisplay = (atrasoDias: number) => {
    if (atrasoDias === 0) {
      return <span className="text-green-500">0d</span>;
    } else if (atrasoDias <= 2) {
      return <span className="text-yellow-500">+{atrasoDias.toFixed(1)}d</span>;
    } else {
      return <span className="text-destructive font-medium">+{atrasoDias.toFixed(1)}d</span>;
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Mapa de Risco dos Lotes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            Carregando...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (analytics.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Mapa de Risco dos Lotes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-muted-foreground">
            Nenhum lote alojado encontrado
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground">Mapa de Risco dos Lotes</CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" /> OK
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500" /> Atenção
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-destructive" /> Crítico
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Lote</TableHead>
                <TableHead className="text-muted-foreground">Linhagem</TableHead>
                <TableHead className="text-muted-foreground text-center">Idade</TableHead>
                <TableHead className="text-muted-foreground text-center">Mort.</TableHead>
                <TableHead className="text-muted-foreground text-center">CA</TableHead>
                <TableHead className="text-muted-foreground text-center">Peso vs Meta</TableHead>
                <TableHead className="text-muted-foreground text-center">Atraso</TableHead>
                <TableHead className="text-muted-foreground text-center">Score</TableHead>
                <TableHead className="text-muted-foreground text-center">Status</TableHead>
                <TableHead className="text-muted-foreground w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.map((lote) => (
                <TableRow 
                  key={lote.loteId} 
                  className={`border-border cursor-pointer transition-colors ${
                    lote.status === 'critico' ? 'bg-destructive/5 hover:bg-destructive/10' :
                    lote.status === 'atencao' ? 'bg-yellow-500/5 hover:bg-yellow-500/10' :
                    'hover:bg-muted/50'
                  }`}
                  onClick={() => navigate(`/lote/${lote.loteId}`)}
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{lote.nucleoNome}</span>
                      <span className="text-xs text-muted-foreground">{lote.galpaoNome}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {lote.linhagemLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-foreground">{lote.idadeDias}d</span>
                    <span className="text-xs text-muted-foreground ml-1">(S{lote.semana})</span>
                  </TableCell>
                  <TableCell className="text-center">
                    {getMortalidadeDisplay(lote)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getCADisplay(lote)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getPesoVsMetaDisplay(lote.pesoVsMeta)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getAtrasoDisplay(lote.atrasoDias)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getScoreBadge(lote.score)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(lote.status)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
