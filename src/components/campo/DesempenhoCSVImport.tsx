import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, FileText, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type LinhagemAves = Database['public']['Enums']['linhagem_aves'];
type SexoAve = Database['public']['Enums']['sexo_ave'];

interface DesempenhoCSVImportProps {
  onSuccess: () => void;
}

interface ParsedRow {
  linhagem: LinhagemAves;
  sexo: SexoAve;
  dia: number;
  peso_g: number;
  ganho_diario_g: number;
  ganho_medio_diario_g: number;
  conversao_alimentar_acumulada: number;
  consumo_diario_racao_g: number;
  consumo_acumulado_racao_g: number;
}

const EXPECTED_HEADERS = [
  'linhagem',
  'sexo',
  'dia',
  'peso_g',
  'ganho_diario_g',
  'ganho_medio_diario_g',
  'conversao_alimentar_acumulada',
  'consumo_diario_racao_g',
  'consumo_acumulado_racao_g'
];

const VALID_LINHAGENS: LinhagemAves[] = ['cobb_500', 'ross_308', 'hubbard'];
const VALID_SEXOS: SexoAve[] = ['macho', 'femea', 'misto'];

export function DesempenhoCSVImport({ onSuccess }: DesempenhoCSVImportProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (content: string): { rows: ParsedRow[]; errors: string[] } => {
    const lines = content.trim().split('\n');
    const errors: string[] = [];
    const rows: ParsedRow[] = [];

    if (lines.length < 2) {
      errors.push('Arquivo CSV deve ter cabeçalho e pelo menos uma linha de dados');
      return { rows, errors };
    }

    // Parse header
    const header = lines[0].split(';').map(h => h.trim().toLowerCase());
    
    // Validate headers
    const missingHeaders = EXPECTED_HEADERS.filter(h => !header.includes(h));
    if (missingHeaders.length > 0) {
      errors.push(`Colunas faltando: ${missingHeaders.join(', ')}`);
      return { rows, errors };
    }

    // Map header indices
    const headerIndices: Record<string, number> = {};
    EXPECTED_HEADERS.forEach(h => {
      headerIndices[h] = header.indexOf(h);
    });

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(';').map(v => v.trim());
      
      try {
        const linhagem = values[headerIndices['linhagem']]?.toLowerCase() as LinhagemAves;
        const sexo = values[headerIndices['sexo']]?.toLowerCase() as SexoAve;

        if (!VALID_LINHAGENS.includes(linhagem)) {
          errors.push(`Linha ${i + 1}: Linhagem inválida "${linhagem}". Use: ${VALID_LINHAGENS.join(', ')}`);
          continue;
        }

        if (!VALID_SEXOS.includes(sexo)) {
          errors.push(`Linha ${i + 1}: Sexo inválido "${sexo}". Use: ${VALID_SEXOS.join(', ')}`);
          continue;
        }

        const row: ParsedRow = {
          linhagem,
          sexo,
          dia: parseInt(values[headerIndices['dia']]) || 0,
          peso_g: parseFloat(values[headerIndices['peso_g']]) || 0,
          ganho_diario_g: parseFloat(values[headerIndices['ganho_diario_g']]) || 0,
          ganho_medio_diario_g: parseFloat(values[headerIndices['ganho_medio_diario_g']]) || 0,
          conversao_alimentar_acumulada: parseFloat(values[headerIndices['conversao_alimentar_acumulada']]) || 0,
          consumo_diario_racao_g: parseFloat(values[headerIndices['consumo_diario_racao_g']]) || 0,
          consumo_acumulado_racao_g: parseFloat(values[headerIndices['consumo_acumulado_racao_g']]) || 0,
        };

        rows.push(row);
      } catch (e) {
        errors.push(`Linha ${i + 1}: Erro ao processar dados`);
      }
    }

    return { rows, errors };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Por favor, selecione um arquivo CSV');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const { rows, errors } = parseCSV(content);
      setPreview(rows);
      setErrors(errors);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (preview.length === 0) {
      toast.error('Nenhum dado válido para importar');
      return;
    }

    setIsUploading(true);
    try {
      // Insert in batches of 100
      const batchSize = 100;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < preview.length; i += batchSize) {
        const batch = preview.slice(i, i + batchSize);
        const { error } = await supabase.from('desempenho_aves').insert(batch);

        if (error) {
          console.error('Erro ao inserir batch:', error);
          errorCount += batch.length;
        } else {
          successCount += batch.length;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} registros importados com sucesso!`);
        setPreview([]);
        setErrors([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        onSuccess();
      }

      if (errorCount > 0) {
        toast.error(`${errorCount} registros não puderam ser importados (possíveis duplicatas)`);
      }
    } catch (error: any) {
      console.error('Erro na importação:', error);
      toast.error('Erro ao importar dados');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = () => {
    setPreview([]);
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Importar CSV de Desempenho
        </CardTitle>
        <CardDescription>
          Formato esperado (separador: ponto e vírgula): linhagem;sexo;dia;peso_g;ganho_diario_g;ganho_medio_diario_g;conversao_alimentar_acumulada;consumo_diario_racao_g;consumo_acumulado_racao_g
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href="/modelo_desempenho_aves.csv" download="modelo_desempenho_aves.csv">
              <Download className="h-4 w-4 mr-2" />
              Baixar CSV Modelo
            </a>
          </Button>
          <span className="text-sm text-muted-foreground">
            (Cobb 500 e Ross 308)
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="flex-1"
          />
          {preview.length > 0 && (
            <Button variant="outline" onClick={handleClear}>
              Limpar
            </Button>
          )}
        </div>

        {errors.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-destructive mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Erros encontrados:</span>
            </div>
            <ul className="text-sm text-destructive/80 space-y-1 max-h-32 overflow-y-auto">
              {errors.slice(0, 10).map((error, i) => (
                <li key={i}>• {error}</li>
              ))}
              {errors.length > 10 && (
                <li className="text-muted-foreground">... e mais {errors.length - 10} erros</li>
              )}
            </ul>
          </div>
        )}

        {preview.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">{preview.length} registros prontos para importação</span>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Linhagem</th>
                      <th className="px-3 py-2 text-left">Sexo</th>
                      <th className="px-3 py-2 text-right">Dia</th>
                      <th className="px-3 py-2 text-right">Peso (g)</th>
                      <th className="px-3 py-2 text-right">CA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-2">{row.linhagem}</td>
                        <td className="px-3 py-2">{row.sexo}</td>
                        <td className="px-3 py-2 text-right">{row.dia}</td>
                        <td className="px-3 py-2 text-right">{row.peso_g}</td>
                        <td className="px-3 py-2 text-right">{row.conversao_alimentar_acumulada.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.length > 10 && (
                <div className="px-3 py-2 bg-muted/30 text-sm text-muted-foreground text-center">
                  Mostrando 10 de {preview.length} registros
                </div>
              )}
            </div>

            <Button 
              onClick={handleImport} 
              disabled={isUploading} 
              className="w-full"
            >
              <FileText className="h-4 w-4 mr-2" />
              {isUploading ? 'Importando...' : `Importar ${preview.length} Registros`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
