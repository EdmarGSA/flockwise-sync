import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NucleoForm } from '@/components/lotes/NucleoForm';
import { GalpaoForm } from '@/components/lotes/GalpaoForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Home } from 'lucide-react';

interface Nucleo {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
  tipo_producao: string;
  ativo: boolean;
}

interface Galpao {
  id: string;
  nome: string;
  comprimento: number;
  largura: number;
  altura: number;
  tipo_pressao: string;
  nucleo: { nome: string } | null;
  ativo: boolean;
}

export default function GestaoLotes() {
  const { user, loading } = useAuth();
  const [nucleos, setNucleos] = useState<Nucleo[]>([]);
  const [galpoes, setGalpoes] = useState<Galpao[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoadingData(true);
    
    const [nucleosRes, galpoesRes] = await Promise.all([
      supabase.from('nucleos').select('id, nome, cidade, estado, tipo_producao, ativo'),
      supabase.from('galpoes').select('id, nome, comprimento, largura, altura, tipo_pressao, ativo, nucleo:nucleos(nome)')
    ]);

    if (nucleosRes.data) setNucleos(nucleosRes.data);
    if (galpoesRes.data) setGalpoes(galpoesRes.data as Galpao[]);
    
    setLoadingData(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const getTipoProducaoLabel = (tipo: string) => {
    return tipo === 'corte' ? 'Aves de Corte' : 'Aves de Postura';
  };

  const getTipoPressaoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      positiva: 'Pressão Positiva',
      negativa: 'Pressão Negativa',
      darkhouse: 'Dark House',
    };
    return labels[tipo] || tipo;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">Gestão de Lotes</h1>

        <Tabs defaultValue="nucleos" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="nucleos" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Núcleos
            </TabsTrigger>
            <TabsTrigger value="galpoes" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Galpões
            </TabsTrigger>
          </TabsList>

          <TabsContent value="nucleos" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <NucleoForm onSuccess={fetchData} />
              
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Núcleos Cadastrados</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingData ? (
                    <p className="text-muted-foreground">Carregando...</p>
                  ) : nucleos.length === 0 ? (
                    <p className="text-muted-foreground">Nenhum núcleo cadastrado.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Localização</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {nucleos.map((nucleo) => (
                          <TableRow key={nucleo.id}>
                            <TableCell className="font-medium">{nucleo.nome}</TableCell>
                            <TableCell>{nucleo.cidade}/{nucleo.estado}</TableCell>
                            <TableCell>{getTipoProducaoLabel(nucleo.tipo_producao)}</TableCell>
                            <TableCell>
                              <Badge variant={nucleo.ativo ? 'default' : 'secondary'}>
                                {nucleo.ativo ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="galpoes" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GalpaoForm onSuccess={fetchData} />
              
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Galpões Cadastrados</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingData ? (
                    <p className="text-muted-foreground">Carregando...</p>
                  ) : galpoes.length === 0 ? (
                    <p className="text-muted-foreground">Nenhum galpão cadastrado.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Núcleo</TableHead>
                          <TableHead>Dimensões (m)</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {galpoes.map((galpao) => (
                          <TableRow key={galpao.id}>
                            <TableCell className="font-medium">{galpao.nome}</TableCell>
                            <TableCell>{galpao.nucleo?.nome || '-'}</TableCell>
                            <TableCell>{galpao.comprimento}x{galpao.largura}x{galpao.altura}</TableCell>
                            <TableCell>{getTipoPressaoLabel(galpao.tipo_pressao)}</TableCell>
                            <TableCell>
                              <Badge variant={galpao.ativo ? 'default' : 'secondary'}>
                                {galpao.ativo ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
