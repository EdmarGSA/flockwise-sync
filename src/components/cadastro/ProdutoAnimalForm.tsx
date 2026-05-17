import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface GrupoAnimal {
  id: string;
  nome: string;
}

interface ProdutoAnimalFormProps {
  integradoId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ProdutoAnimalForm({ integradoId, onSuccess, onCancel }: ProdutoAnimalFormProps) {
  const [loading, setLoading] = useState(false);
  const [grupos, setGrupos] = useState<GrupoAnimal[]>([]);
  const [formData, setFormData] = useState({
    grupo_animal_id: '',
    nome: '',
    descricao: '',
    unidade_venda: 'KG',
    preco_venda_base: 0,
    peso_medio_referencia_kg: 0,
    ncm: '',
    cest: ''
  });

  useEffect(() => {
    fetchGrupos();
  }, [integradoId]);

  const fetchGrupos = async () => {
    const { data, error } = await supabase
      .from('grupos_animal')
      .select('id, nome')
      .eq('integrado_id', integradoId)
      .eq('ativo', true)
      .order('nome');

    if (!error && data) {
      setGrupos(data);
    }
  };

  const generateSku = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ANM-${timestamp}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast.error('Informe o nome do produto');
      return;
    }

    if (!formData.grupo_animal_id) {
      toast.error('Selecione o grupo animal');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('produtos_animais')
        .insert({
          integrado_id: integradoId,
          sku: generateSku(),
          nome: formData.nome.trim(),
          descricao: formData.descricao.trim() || null,
          grupo_animal_id: formData.grupo_animal_id,
          unidade_venda: formData.unidade_venda,
          preco_venda_base: formData.preco_venda_base || 0,
          peso_medio_referencia_kg: formData.peso_medio_referencia_kg || null,
          ncm: formData.ncm.trim() || null,
          cest: formData.cest.trim() || null
        });

      if (error) throw error;

      toast.success('Produto animal cadastrado com sucesso');
      onSuccess();
    } catch (error) {
      console.error('Error saving produto animal:', error);
      toast.error('Erro ao salvar produto animal');
    } finally {
      setLoading(false);
    }
  };

  const unidadesVenda = [
    { value: 'KG', label: 'Quilograma (KG)' },
    { value: 'UN', label: 'Unidade (UN)' },
    { value: 'CABECA', label: 'Cabeça' },
    { value: 'DUZIA', label: 'Dúzia' },
    { value: 'CAIXA', label: 'Caixa' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Grupo Animal *</Label>
          <Select
            value={formData.grupo_animal_id}
            onValueChange={(value) => setFormData({ ...formData, grupo_animal_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o grupo" />
            </SelectTrigger>
            <SelectContent>
              {grupos.map(grupo => (
                <SelectItem key={grupo.id} value={grupo.id}>
                  {grupo.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Unidade de Venda *</Label>
          <Select
            value={formData.unidade_venda}
            onValueChange={(value) => setFormData({ ...formData, unidade_venda: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a unidade" />
            </SelectTrigger>
            <SelectContent>
              {unidadesVenda.map(un => (
                <SelectItem key={un.value} value={un.value}>
                  {un.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Nome do Produto *</Label>
        <Input
          value={formData.nome}
          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          placeholder="Ex: Frango Vivo, Ovo Branco, Suíno Terminação"
        />
      </div>

      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea
          value={formData.descricao}
          onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
          placeholder="Descrição do produto"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Preço Base (R$)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={formData.preco_venda_base || ''}
            onChange={(e) => setFormData({ ...formData, preco_venda_base: parseFloat(e.target.value) || 0 })}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label>Peso Médio Referência (kg)</Label>
          <Input
            type="number"
            min="0"
            step="0.001"
            value={formData.peso_medio_referencia_kg || ''}
            onChange={(e) => setFormData({ ...formData, peso_medio_referencia_kg: parseFloat(e.target.value) || 0 })}
            placeholder="0.000"
          />
        </div>

        <div className="space-y-2">
          <Label>NCM</Label>
          <Input
            value={formData.ncm}
            onChange={(e) => setFormData({ ...formData, ncm: e.target.value })}
            placeholder="Código NCM"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}
