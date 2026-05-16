import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, RefreshCw } from 'lucide-react';
import { useAnaliseIALote } from '@/hooks/useAnaliseIALote';

interface Props {
  loteId: string;
}

export default function AnaliseIATecnica({ loteId }: Props) {
  const { markdown, cached, geradoEm, loading, error, gerar } = useAnaliseIALote(loteId);

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Analista Técnico IA</h3>
          </div>
          <Button size="sm" onClick={gerar} disabled={loading}>
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : markdown ? 'Regerar' : 'Gerar análise'}
          </Button>
        </div>

        {geradoEm && (
          <p className="text-xs text-muted-foreground">
            Gerado em {new Date(geradoEm).toLocaleString('pt-BR')} {cached && '(cache)'}
          </p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {!markdown && !loading && (
          <p className="text-sm text-muted-foreground">
            Clique em "Gerar análise" para que a IA produza um relatório técnico baseado em todos os dados do lote.
            Custo: consome créditos da workspace.
          </p>
        )}

        {markdown && (
          <div
            className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(markdown) }}
          />
        )}
      </CardContent>
    </Card>
  );
}

// Conversor markdown mínimo (negrito, itálico, headers, listas, code)
function markdownToHtml(md: string): string {
  let h = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  h = h.replace(/^### (.*$)/gim, '<h3>$1</h3>')
       .replace(/^## (.*$)/gim, '<h2>$1</h2>')
       .replace(/^# (.*$)/gim, '<h1>$1</h1>')
       .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
       .replace(/\*(.+?)\*/g, '<em>$1</em>')
       .replace(/^\- (.*$)/gim, '<li>$1</li>')
       .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
       .replace(/`([^`]+)`/g, '<code>$1</code>');
  h = h.replace(/(<li>.*<\/li>)/gs, (m) => `<ul>${m}</ul>`);
  return h;
}
