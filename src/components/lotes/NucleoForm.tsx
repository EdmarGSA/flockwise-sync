import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Search } from 'lucide-react';

const nucleoSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cep: z.string().min(8, 'CEP inválido').max(9, 'CEP inválido'),
  logradouro: z.string().min(3, 'Logradouro obrigatório'),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().min(2, 'Bairro obrigatório'),
  cidade: z.string().min(2, 'Cidade obrigatória'),
  estado: z.string().min(2, 'Estado obrigatório'),
  codigo_ibge: z.string().optional(),
  tipo_producao: z.string().min(1, 'Selecione o tipo de produção'),
  integrado_id: z.string().uuid('Selecione um integrado'),
});

type NucleoFormData = z.infer<typeof nucleoSchema>;

interface Profile {
  id: string;
  full_name: string | null;
  company_name: string | null;
}

interface GrupoAnimal {
  id: string;
  nome: string;
}

interface NucleoFormProps {
  onSuccess?: () => void;
}

export function NucleoForm({ onSuccess }: NucleoFormProps) {
  const [loading, setLoading] = useState(false);
  const [searchingCep, setSearchingCep] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [integrados, setIntegrados] = useState<Profile[]>([]);
  const [gruposAnimal, setGruposAnimal] = useState<GrupoAnimal[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const form = useForm<NucleoFormData>({
    resolver: zodResolver(nucleoSchema),
    defaultValues: {
      nome: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      codigo_ibge: '',
      tipo_producao: '',
      integrado_id: '',
    },
  });

  useEffect(() => {
    fetchIntegrados();
  }, []);

  // Buscar grupos de animal quando integrado for selecionado
  const watchIntegradoId = form.watch('integrado_id');
  useEffect(() => {
    if (watchIntegradoId) {
      fetchGruposAnimal(watchIntegradoId);
    } else {
      setGruposAnimal([]);
    }
  }, [watchIntegradoId]);

  const fetchIntegrados = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, company_name')
      .eq('role', 'integrado');
    
    if (error) {
      console.error('Erro ao buscar integrados:', error);
      return;
    }
    setIntegrados(data || []);
  };

  const fetchGruposAnimal = async (integradoId: string) => {
    const { data, error } = await supabase
      .from('grupos_animal')
      .select('id, nome')
      .eq('ativo', true)
      .eq('integrado_id', integradoId)
      .order('nome');
    
    if (error) {
      console.error('Erro ao buscar grupos de animais:', error);
      return;
    }
    setGruposAnimal(data || []);
  };

  const searchCep = async () => {
    const cep = form.getValues('cep').replace(/\D/g, '');
    if (cep.length !== 8) {
      toast.error('CEP deve ter 8 dígitos');
      return;
    }

    setSearchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      form.setValue('logradouro', data.logradouro || '');
      form.setValue('bairro', data.bairro || '');
      form.setValue('cidade', data.localidade || '');
      form.setValue('estado', data.uf || '');
      form.setValue('codigo_ibge', data.ibge || '');
      
      toast.success('Endereço preenchido automaticamente');
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast.error('Erro ao buscar CEP');
    } finally {
      setSearchingCep(false);
    }
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada pelo navegador');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        toast.success('Localização capturada com sucesso');
        setGettingLocation(false);
      },
      (error) => {
        console.error('Erro ao obter localização:', error);
        toast.error('Erro ao obter localização');
        setGettingLocation(false);
      }
    );
  };

  const onSubmit = async (data: NucleoFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('nucleos').insert({
        nome: data.nome,
        cep: data.cep,
        logradouro: data.logradouro,
        numero: data.numero || null,
        complemento: data.complemento || null,
        bairro: data.bairro,
        cidade: data.cidade,
        estado: data.estado,
        codigo_ibge: data.codigo_ibge || null,
        latitude: location?.lat || null,
        longitude: location?.lng || null,
        tipo_producao: data.tipo_producao,
        integrado_id: data.integrado_id,
      });

      if (error) throw error;

      toast.success('Núcleo cadastrado com sucesso!');
      form.reset();
      setLocation(null);
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao cadastrar núcleo:', error);
      toast.error('Erro ao cadastrar núcleo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Cadastro de Núcleo</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Núcleo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Núcleo Norte" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="cep"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="00000-000" {...field} />
                      </FormControl>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon"
                        onClick={searchCep}
                        disabled={searchingCep}
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="codigo_ibge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código IBGE</FormLabel>
                    <FormControl>
                      <Input placeholder="Código IBGE" {...field} readOnly />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={getLocation}
                  disabled={gettingLocation}
                  className="w-full"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Capturar GPS'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="logradouro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logradouro</FormLabel>
                    <FormControl>
                      <Input placeholder="Rua, Avenida, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input placeholder="Número" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="complemento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complemento</FormLabel>
                    <FormControl>
                      <Input placeholder="Complemento (opcional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bairro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro</FormLabel>
                    <FormControl>
                      <Input placeholder="Bairro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input placeholder="Cidade" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <FormControl>
                      <Input placeholder="UF" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="integrado_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Integrado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o integrado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {integrados.map((integrado) => (
                          <SelectItem key={integrado.id} value={integrado.id}>
                            {integrado.full_name || integrado.company_name || 'Sem nome'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo_producao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Produção</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!watchIntegradoId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={watchIntegradoId ? "Selecione o tipo de produção" : "Selecione o integrado primeiro"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {gruposAnimal.map((grupo) => (
                          <SelectItem key={grupo.id} value={grupo.nome}>
                            {grupo.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Salvando...' : 'Cadastrar Núcleo'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
