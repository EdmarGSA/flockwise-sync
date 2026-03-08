import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { getLinhagemLabel } from '@/lib/utils/labels';

type DesempenhoAve = Database['public']['Tables']['desempenho_aves']['Row'];

interface DesempenhoTableProps {
  data: DesempenhoAve[];
  loading: boolean;
  onEdit?: (desempenho: DesempenhoAve) => void;
}

export function DesempenhoTable({ data, loading, onEdit }: DesempenhoTableProps) {
  const [selectedLinhagem, setSelectedLinhagem] = useState<string>('cobb_500');
  const [selectedSexo, setSelectedSexo] = useState<string>('misto');

  const getSexoLabel = (sexo: string) => {
    const labels: Record<string, string> = {
      macho: 'Macho',
      femea: 'Fêmea',
      misto: 'Misto',
    };
    return labels[sexo] || sexo;
  };

  const filteredData = data
    .filter((d) => d.linhagem === selectedLinhagem && d.sexo === selectedSexo)
    .sort((a, b) => a.dia - b.dia);

  const linhagens = ['cobb_500', 'ross_308', 'hubbard'];
  const sexos = ['macho', 'femea', 'misto'];

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <span>Tabela de Desempenho</span>
          <div className="flex items-center gap-4">
            <Select value={selectedLinhagem} onValueChange={setSelectedLinhagem}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Linhagem" />
              </SelectTrigger>
              <SelectContent>
                {linhagens.map((l) => (
                  <SelectItem key={l} value={l}>
                    {getLinhagemLabel(l)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedSexo} onValueChange={setSelectedSexo} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            {sexos.map((sexo) => (
              <TabsTrigger key={sexo} value={sexo}>
                {getSexoLabel(sexo)}
              </TabsTrigger>
            ))}
          </TabsList>

          {sexos.map((sexo) => (
            <TabsContent key={sexo} value={sexo}>
              {loading ? (
                <p className="text-muted-foreground">Carregando...</p>
              ) : filteredData.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Nenhum dado de desempenho para {getLinhagemLabel(selectedLinhagem)} - {getSexoLabel(sexo)}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center">Dia</TableHead>
                        <TableHead className="text-right">Peso (g)</TableHead>
                        <TableHead className="text-right">Ganho Diário (g)</TableHead>
                        <TableHead className="text-right">Ganho Médio Diário (g)</TableHead>
                        <TableHead className="text-right">Conv. Alimentar Acum.</TableHead>
                        <TableHead className="text-right">Consumo Diário Ração (g)</TableHead>
                        <TableHead className="text-right">Consumo Acum. Ração (g)</TableHead>
                        {onEdit && <TableHead className="w-[80px]">Ações</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-center font-medium">{row.dia}</TableCell>
                          <TableCell className="text-right">{Number(row.peso_g).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right">{Number(row.ganho_diario_g).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right">{Number(row.ganho_medio_diario_g).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right">{Number(row.conversao_alimentar_acumulada).toLocaleString('pt-BR', { minimumFractionDigits: 3 })}</TableCell>
                          <TableCell className="text-right">{Number(row.consumo_diario_racao_g).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right">{Number(row.consumo_acumulado_racao_g).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                          {onEdit && (
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => onEdit(row)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
