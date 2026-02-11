import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Egg, MapPin, Calendar, CheckCircle2, ShieldCheck } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RastreioData {
  lote_interno: string;
  tipo_ovo: string;
  classificacao_peso: string;
  data_producao: string;
  data_validade: string;
  nucleo_nome: string | null;
  galpao_nome: string | null;
  produtor_nome: string | null;
  produtor_cidade: string | null;
  produtor_estado: string | null;
}

const TIPO_LABELS: Record<string, string> = {
  branco: 'Branco',
  castanho: 'Castanho',
  vermelho: 'Vermelho',
  caipira: 'Caipira',
};

const CLASSIF_LABELS: Record<string, string> = {
  medio: 'Médio',
  grande: 'Grande',
  extra: 'Extra',
  jumbo: 'Jumbo',
};

export default function RastreioOvos() {
  const { lote } = useParams<{ lote: string }>();
  const [data, setData] = useState<RastreioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (lote) fetchRastreio();
  }, [lote]);

  const fetchRastreio = async () => {
    try {
      const { data: result, error: err } = await supabase
        .from('rastreio_ovos' as any)
        .select('*')
        .eq('lote_interno', lote)
        .maybeSingle();

      if (err) throw err;
      if (!result) {
        setError('Lote não encontrado');
      } else {
        setData(result as any);
      }
    } catch (e: any) {
      setError('Erro ao consultar rastreabilidade');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const diasParaVencer = data ? differenceInDays(new Date(data.data_validade), new Date()) : 0;
  const vencido = diasParaVencer < 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-green-950 dark:to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mb-3">
            <Egg className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-xl">Rastreabilidade do Produto</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Informações de origem e validade</p>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Consultando...</div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive font-medium">{error}</p>
              <p className="text-sm text-muted-foreground mt-2">Verifique o código do lote e tente novamente.</p>
            </div>
          ) : data ? (
            <div className="space-y-4">
              {/* Lote */}
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Lote</p>
                <p className="text-2xl font-bold font-mono mt-1">{data.lote_interno}</p>
              </div>

              {/* Tipo e Classificação */}
              <div className="flex gap-2 justify-center">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {TIPO_LABELS[data.tipo_ovo] || data.tipo_ovo}
                </Badge>
                <Badge variant="outline" className="text-sm px-3 py-1">
                  {CLASSIF_LABELS[data.classificacao_peso] || data.classificacao_peso}
                </Badge>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-xs">Produção</span>
                  </div>
                  <p className="font-semibold">
                    {format(new Date(data.data_producao), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
                <div className={`rounded-lg p-3 ${vencido ? 'bg-destructive/10' : 'bg-green-500/10'}`}>
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="text-xs">Validade</span>
                  </div>
                  <p className={`font-semibold ${vencido ? 'text-destructive' : 'text-green-700 dark:text-green-400'}`}>
                    {format(new Date(data.data_validade), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                  <p className={`text-xs mt-0.5 ${vencido ? 'text-destructive' : 'text-green-600'}`}>
                    {vencido ? 'Produto vencido' : `${diasParaVencer} dias restantes`}
                  </p>
                </div>
              </div>

              {/* Origem */}
              {(data.produtor_nome || data.nucleo_nome) && (
                <div className="border-t pt-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-xs uppercase tracking-wider">Origem</span>
                  </div>
                  {data.produtor_nome && (
                    <p className="font-medium">{data.produtor_nome}</p>
                  )}
                  {(data.produtor_cidade || data.produtor_estado) && (
                    <p className="text-sm text-muted-foreground">
                      {[data.produtor_cidade, data.produtor_estado].filter(Boolean).join(' - ')}
                    </p>
                  )}
                  {data.nucleo_nome && (
                    <p className="text-xs text-muted-foreground mt-1">Núcleo: {data.nucleo_nome}</p>
                  )}
                </div>
              )}

              {/* Selo */}
              <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 pt-2">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-sm font-medium">Produto rastreado</span>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
