import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Loader2, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AnaliseIA {
  causas_provaveis: string[];
  classificacao_risco: 'baixo' | 'moderado' | 'alto' | 'critico';
  sugestoes_acao: string[];
  resumo: string;
  gpd_avaliacao?: string;
}

interface AnaliseIAMortalidadeCardProps {
  mortalidadeId: string;
  loteId: string;
  analiseExistente?: AnaliseIA | null;
  onAnaliseCompleta?: (analise: AnaliseIA) => void;
}

const RISCO_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle2 }> = {
  baixo: { label: 'Baixo', variant: 'secondary', icon: CheckCircle2 },
  moderado: { label: 'Moderado', variant: 'outline', icon: AlertTriangle },
  alto: { label: 'Alto', variant: 'destructive', icon: ShieldAlert },
  critico: { label: 'Crítico', variant: 'destructive', icon: ShieldAlert },
};

export default function AnaliseIAMortalidadeCard({
  mortalidadeId,
  loteId,
  analiseExistente,
  onAnaliseCompleta,
}: AnaliseIAMortalidadeCardProps) {
  const [loading, setLoading] = useState(false);
  const [analise, setAnalise] = useState<AnaliseIA | null>(analiseExistente || null);

  const handleAnalisar = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analise-mortalidade', {
        body: { mortalidade_id: mortalidadeId, lote_id: loteId },
      });

      if (error) throw error;

      if (data?.error) {
        if (data.error.includes('Rate limit') || data.error.includes('429')) {
          toast.error('Limite de requisições excedido. Tente novamente em alguns minutos.');
        } else if (data.error.includes('402')) {
          toast.error('Créditos insuficientes para análise IA.');
        } else {
          toast.error(data.error);
        }
        return;
      }

      setAnalise(data.analise);
      onAnaliseCompleta?.(data.analise);
      toast.success('Análise concluída!');
    } catch (err) {
      console.error('Erro na análise IA:', err);
      toast.error('Erro ao executar análise por IA');
    } finally {
      setLoading(false);
    }
  };

  if (!analise) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4 flex flex-col items-center gap-3">
          <Brain className="w-8 h-8 text-primary opacity-60" />
          <p className="text-sm text-muted-foreground text-center">
            Analise as fotos e dados do lote com IA para identificar prováveis causas da mortalidade.
          </p>
          <Button onClick={handleAnalisar} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            {loading ? 'Analisando...' : 'Analisar com IA'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const risco = RISCO_CONFIG[analise.classificacao_risco] || RISCO_CONFIG.moderado;
  const RiscoIcon = risco.icon;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <span className="font-medium text-sm">Análise IA</span>
          </div>
          <Badge variant={risco.variant} className="gap-1">
            <RiscoIcon className="w-3 h-3" />
            Risco {risco.label}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground">{analise.resumo}</p>

        {analise.gpd_avaliacao && (
          <div className="text-xs bg-muted/50 rounded p-2">
            <span className="font-medium">GPD:</span> {analise.gpd_avaliacao}
          </div>
        )}

        <div>
          <p className="text-xs font-medium mb-1">Causas Prováveis:</p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            {analise.causas_provaveis.map((causa, i) => (
              <li key={i}>{causa}</li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-medium mb-1">Sugestões de Ação:</p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            {analise.sugestoes_acao.map((sug, i) => (
              <li key={i}>{sug}</li>
            ))}
          </ul>
        </div>

        <Button variant="outline" size="sm" onClick={handleAnalisar} disabled={loading} className="gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
          Reanalisar
        </Button>
      </CardContent>
    </Card>
  );
}
