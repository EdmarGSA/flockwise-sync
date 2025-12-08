import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Home, MapPin, ArrowLeft, Plus } from 'lucide-react';
import { NucleoForm } from '@/components/lotes/NucleoForm';
import { GalpaoForm } from '@/components/lotes/GalpaoForm';
import { AreaForm } from '@/components/campo/AreaForm';
import { Bird } from 'lucide-react';

interface Nucleo {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
  tipo_producao: string;
  ativo: boolean;
  latitude: number | null;
  longitude: number | null;
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

interface Area {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  ativo: boolean;
}

export default function GestaoCampo() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [nucleos, setNucleos] = useState<Nucleo[]>([]);
  const [galpoes, setGalpoes] = useState<Galpao[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState('nucleos');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoadingData(true);
    
    const [nucleosRes, galpoesRes, areasRes] = await Promise.all([
      supabase.from('nucleos').select('id, nome, cidade, estado, tipo_producao, ativo, latitude, longitude'),
      supabase.from('galpoes').select('id, nome, comprimento, largura, altura, tipo_pressao, ativo, nucleo:nucleos(nome)'),
      supabase.from('areas').select('id, nome, descricao, cor, ativo')
    ]);

    if (nucleosRes.data) setNucleos(nucleosRes.data);
    if (galpoesRes.data) setGalpoes(galpoesRes.data as Galpao[]);
    if (areasRes.data) setAreas(areasRes.data);
    
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

  const handleFormSuccess = () => {
    fetchData();
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
                <Bird className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">
                Gestão de Campo
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pt-24">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <TabsList className="grid grid-cols-3 w-full max-w-lg">
              <TabsTrigger value="nucleos" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Núcleos
              </TabsTrigger>
              <TabsTrigger value="galpoes" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Galpões
              </TabsTrigger>
              <TabsTrigger value="areas" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Áreas
              </TabsTrigger>
            </TabsList>

            <Button onClick={() => setShowForm(!showForm)} className="gap-2">
              <Plus className="w-4 h-4" />
              {showForm ? 'Fechar Formulário' : 'Novo Cadastro'}
            </Button>
          </div>

          <TabsContent value="nucleos" className="space-y-6">
            <div className={`grid grid-cols-1 ${showForm ? 'lg:grid-cols-2' : ''} gap-6`}>
              {showForm && <NucleoForm onSuccess={handleFormSuccess} />}
              
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Núcleos Cadastrados ({nucleos.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingData ? (
                    <p className="text-muted-foreground">Carregando...</p>
                  ) : nucleos.length === 0 ? (
                    <div className="text-center py-8">
                      <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">Nenhum núcleo cadastrado.</p>
                      <Button variant="link" onClick={() => setShowForm(true)}>
                        Cadastrar primeiro núcleo
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Localização</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>GPS</TableHead>
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
                              {nucleo.latitude && nucleo.longitude ? (
                                <Badge variant="outline" className="text-primary">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  OK
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Sem GPS</Badge>
                              )}
                            </TableCell>
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
            <div className={`grid grid-cols-1 ${showForm ? 'lg:grid-cols-2' : ''} gap-6`}>
              {showForm && <GalpaoForm onSuccess={handleFormSuccess} />}
              
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Galpões Cadastrados ({galpoes.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingData ? (
                    <p className="text-muted-foreground">Carregando...</p>
                  ) : galpoes.length === 0 ? (
                    <div className="text-center py-8">
                      <Home className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">Nenhum galpão cadastrado.</p>
                      {nucleos.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Cadastre um núcleo primeiro.</p>
                      ) : (
                        <Button variant="link" onClick={() => setShowForm(true)}>
                          Cadastrar primeiro galpão
                        </Button>
                      )}
                    </div>
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

          <TabsContent value="areas" className="space-y-6">
            <div className={`grid grid-cols-1 ${showForm ? 'lg:grid-cols-2' : ''} gap-6`}>
              {showForm && <AreaForm onSuccess={handleFormSuccess} />}
              
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Áreas Cadastradas ({areas.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingData ? (
                    <p className="text-muted-foreground">Carregando...</p>
                  ) : areas.length === 0 ? (
                    <div className="text-center py-8">
                      <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">Nenhuma área cadastrada.</p>
                      <Button variant="link" onClick={() => setShowForm(true)}>
                        Cadastrar primeira área
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cor</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {areas.map((area) => (
                          <TableRow key={area.id}>
                            <TableCell>
                              <div 
                                className="w-6 h-6 rounded-full border-2 border-border" 
                                style={{ backgroundColor: area.cor }}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{area.nome}</TableCell>
                            <TableCell className="text-muted-foreground">{area.descricao || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={area.ativo ? 'default' : 'secondary'}>
                                {area.ativo ? 'Ativo' : 'Inativo'}
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
