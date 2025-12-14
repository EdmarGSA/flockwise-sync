import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CadastroMortalidadeMedia = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [recordId, setRecordId] = useState<string | null>(null);
  
  const [values, setValues] = useState({
    mortalidade_7_dias: 0,
    mortalidade_14_dias: 0,
    mortalidade_21_dias: 0,
    mortalidade_28_dias: 0,
    mortalidade_35_dias: 0,
    mortalidade_42_dias: 0,
    mortalidade_acima_42_dias: 0,
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('mortalidade_media')
        .select('*')
        .eq('integrado_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setRecordId(data.id);
        setValues({
          mortalidade_7_dias: Number(data.mortalidade_7_dias) || 0,
          mortalidade_14_dias: Number(data.mortalidade_14_dias) || 0,
          mortalidade_21_dias: Number(data.mortalidade_21_dias) || 0,
          mortalidade_28_dias: Number(data.mortalidade_28_dias) || 0,
          mortalidade_35_dias: Number(data.mortalidade_35_dias) || 0,
          mortalidade_42_dias: Number(data.mortalidade_42_dias) || 0,
          mortalidade_acima_42_dias: Number(data.mortalidade_acima_42_dias) || 0,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados de mortalidade média');
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (field: keyof typeof values, value: string) => {
    const numValue = parseFloat(value) || 0;
    setValues(prev => ({ ...prev, [field]: numValue }));
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      if (recordId) {
        const { error } = await supabase
          .from('mortalidade_media')
          .update(values)
          .eq('id', recordId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('mortalidade_media')
          .insert({
            integrado_id: user.id,
            ...values
          });

        if (error) throw error;
      }

      toast.success('Mortalidade média salva com sucesso!');
      loadData();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar dados');
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  const weeks = [
    { key: 'mortalidade_7_dias', label: '7 Dias', week: 1 },
    { key: 'mortalidade_14_dias', label: '14 Dias', week: 2 },
    { key: 'mortalidade_21_dias', label: '21 Dias', week: 3 },
    { key: 'mortalidade_28_dias', label: '28 Dias', week: 4 },
    { key: 'mortalidade_35_dias', label: '35 Dias', week: 5 },
    { key: 'mortalidade_42_dias', label: '42 Dias', week: 6 },
    { key: 'mortalidade_acima_42_dias', label: 'Acima de 42 Dias', week: 7 },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 pt-24 pb-12">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/configuracoes')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Percent className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Mortalidade Média</h1>
              <p className="text-muted-foreground">Configure os percentuais de referência por semana</p>
            </div>
          </div>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Percentuais de Mortalidade por Período</CardTitle>
            <CardDescription>
              Defina os valores de referência de mortalidade esperada para cada período do lote
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              {weeks.map((week) => (
                <div key={week.key} className="flex items-center gap-4">
                  <Label className="w-40 text-sm font-medium">
                    Semana {week.week} ({week.label})
                  </Label>
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={values[week.key]}
                      onChange={(e) => handleChange(week.key, e.target.value)}
                      className="max-w-32"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>
              ))}

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CadastroMortalidadeMedia;
