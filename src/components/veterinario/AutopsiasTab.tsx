import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { toast } from 'sonner';
import { Plus, Stethoscope, Eye, Trash2, FileSignature, Camera, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import VoiceInputButton from './VoiceInputButton';
import MediaUpload, { uploadPendingMedia } from './MediaUpload';
import DigitalSignature from './DigitalSignature';
import ConnectionStatus from './ConnectionStatus';

interface Autopsia {
  id: string;
  data_autopsia: string;
  quantidade_aves: number;
  idade_dias: number | null;
  sistema_respiratorio: string | null;
  sistema_digestivo: string | null;
  sistema_locomotor: string | null;
  sistema_tegumentar: string | null;
  sistema_nervoso: string | null;
  sistema_cardiovascular: string | null;
  sistema_reprodutor: string | null;
  diagnostico_presuntivo: string | null;
  causa_morte: string | null;
  recomendacoes: string | null;
  transcricao_voz: string | null;
  assinatura_url: string | null;
  assinado_em: string | null;
  status: string;
  created_at: string;
}

interface MediaItem {
  id: string;
  url: string;
  tipo: 'foto' | 'video';
  descricao?: string;
  sistemaAfetado?: string;
  isNew?: boolean;
  file?: File;
}

interface AutopsiasTabProps {
  loteId: string;
  diasLote: number | null;
}

const SISTEMAS = [
  { key: 'sistema_respiratorio', label: 'Respiratório', icon: '🫁' },
  { key: 'sistema_digestivo', label: 'Digestivo', icon: '🔬' },
  { key: 'sistema_locomotor', label: 'Locomotor', icon: '🦴' },
  { key: 'sistema_tegumentar', label: 'Tegumentar', icon: '🪶' },
  { key: 'sistema_nervoso', label: 'Nervoso', icon: '🧠' },
  { key: 'sistema_cardiovascular', label: 'Cardiovascular', icon: '❤️' },
  { key: 'sistema_reprodutor', label: 'Reprodutor', icon: '🥚' },
];

const WIZARD_STEPS = [
  { id: 1, title: 'Dados', description: 'Informações básicas' },
  { id: 2, title: 'Sistemas', description: 'Achados anatômicos' },
  { id: 3, title: 'Diagnóstico', description: 'Conclusões' },
  { id: 4, title: 'Mídia', description: 'Fotos e assinatura' },
];

export default function AutopsiasTab({ loteId, diasLote }: AutopsiasTabProps) {
  const { user } = useAuth();
  const { isOnline, saveOffline } = useOfflineSync();
  
  const [autopsias, setAutopsias] = useState<Autopsia[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAutopsia, setSelectedAutopsia] = useState<Autopsia | null>(null);
  const [saving, setSaving] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [currentStep, setCurrentStep] = useState(1);

  // Form state
  const [formData, setFormData] = useState({
    data_autopsia: format(new Date(), 'yyyy-MM-dd'),
    quantidade_aves: 1,
    idade_dias: diasLote || 0,
    sistema_respiratorio: '',
    sistema_digestivo: '',
    sistema_locomotor: '',
    sistema_tegumentar: '',
    sistema_nervoso: '',
    sistema_cardiovascular: '',
    sistema_reprodutor: '',
    diagnostico_presuntivo: '',
    causa_morte: '',
    recomendacoes: '',
    transcricao_voz: '',
    assinatura_url: '',
  });

  useEffect(() => {
    if (user) {
      fetchAutopsias();
    }
  }, [user, loteId]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, idade_dias: diasLote || 0 }));
  }, [diasLote]);

  const fetchAutopsias = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('autopsias')
      .select('*')
      .eq('lote_id', loteId)
      .order('data_autopsia', { ascending: false });

    if (error) {
      console.error('Erro ao buscar autopsias:', error);
      toast.error('Erro ao carregar autópsias');
    } else {
      setAutopsias(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      data_autopsia: format(new Date(), 'yyyy-MM-dd'),
      quantidade_aves: 1,
      idade_dias: diasLote || 0,
      sistema_respiratorio: '',
      sistema_digestivo: '',
      sistema_locomotor: '',
      sistema_tegumentar: '',
      sistema_nervoso: '',
      sistema_cardiovascular: '',
      sistema_reprodutor: '',
      diagnostico_presuntivo: '',
      causa_morte: '',
      recomendacoes: '',
      transcricao_voz: '',
      assinatura_url: '',
    });
    setMediaItems([]);
    setCurrentStep(1);
  };

  const handleSubmit = async () => {
    if (!user) return;

    setSaving(true);

    try {
      // Get integrado_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('integrado_id')
        .eq('id', user.id)
        .single();

      const integradoId = profile?.integrado_id || user.id;

      const autopsiaData = {
        ...formData,
        lote_id: loteId,
        integrado_id: integradoId,
        criado_por: user.id,
        status: formData.assinatura_url ? 'assinado' : 'rascunho',
        assinado_em: formData.assinatura_url ? new Date().toISOString() : null,
      };

      if (isOnline) {
        const { data: newAutopsia, error } = await supabase
          .from('autopsias')
          .insert(autopsiaData)
          .select()
          .single();

        if (error) throw error;

        // Upload media if any
        if (mediaItems.length > 0 && newAutopsia) {
          const uploadedMedia = await uploadPendingMedia(mediaItems, newAutopsia.id);
          
          // Save media references
          for (const media of uploadedMedia) {
            await supabase.from('autopsias_midias').insert({
              autopsia_id: newAutopsia.id,
              tipo: media.tipo,
              url: media.url,
              descricao: media.descricao,
              sistema_afetado: media.sistemaAfetado,
            });
          }
        }

        toast.success('Autópsia registrada com sucesso');
      } else {
        // Save offline
        await saveOffline('autopsias', autopsiaData);
        toast.success('Salvo offline. Será sincronizado quando conectar.');
      }

      setDialogOpen(false);
      resetForm();
      fetchAutopsias();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error(error.message || 'Erro ao salvar autópsia');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAutopsia) return;

    try {
      const { error } = await supabase
        .from('autopsias')
        .delete()
        .eq('id', selectedAutopsia.id);

      if (error) throw error;

      toast.success('Autópsia excluída');
      setDeleteDialogOpen(false);
      setSelectedAutopsia(null);
      fetchAutopsias();
    } catch (error: any) {
      toast.error('Erro ao excluir');
    }
  };

  const handleView = (autopsia: Autopsia) => {
    setSelectedAutopsia(autopsia);
    setViewDialogOpen(true);
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.quantidade_aves > 0;
      case 2:
        return true; // Systems are optional
      case 3:
        return true; // Diagnosis is optional but recommended
      case 4:
        return true; // Media and signature are optional
      default:
        return true;
    }
  };

  const renderWizardStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data da Autópsia</Label>
              <Input
                type="date"
                className="h-12"
                value={formData.data_autopsia}
                onChange={(e) => updateField('data_autopsia', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantidade de Aves</Label>
                <Input
                  type="number"
                  className="h-12"
                  min={1}
                  value={formData.quantidade_aves}
                  onChange={(e) => updateField('quantidade_aves', parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label>Idade (dias)</Label>
                <Input
                  type="number"
                  className="h-12"
                  value={formData.idade_dias}
                  onChange={(e) => updateField('idade_dias', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-2">
            <Label className="mb-2 block">Achados por Sistema</Label>
            <Accordion type="multiple" className="w-full">
              {SISTEMAS.map((sistema) => (
                <AccordionItem key={sistema.key} value={sistema.key}>
                  <AccordionTrigger className="text-sm py-3">
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{sistema.icon}</span>
                      <span>{sistema.label}</span>
                      {formData[sistema.key as keyof typeof formData] && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          ✓
                        </Badge>
                      )}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      <VoiceInputButton
                        onTranscriptChange={(text) => updateField(sistema.key, text)}
                        currentText={formData[sistema.key as keyof typeof formData] as string}
                      />
                      <Textarea
                        placeholder={`Descreva os achados no sistema ${sistema.label.toLowerCase()}...`}
                        value={formData[sistema.key as keyof typeof formData] as string}
                        onChange={(e) => updateField(sistema.key, e.target.value)}
                        rows={3}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Diagnóstico Presuntivo</Label>
              <VoiceInputButton
                onTranscriptChange={(text) => updateField('diagnostico_presuntivo', text)}
                currentText={formData.diagnostico_presuntivo}
                className="mb-2"
              />
              <Textarea
                placeholder="Diagnóstico baseado nos achados..."
                value={formData.diagnostico_presuntivo}
                onChange={(e) => updateField('diagnostico_presuntivo', e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Causa Provável da Morte</Label>
              <VoiceInputButton
                onTranscriptChange={(text) => updateField('causa_morte', text)}
                currentText={formData.causa_morte}
                className="mb-2"
              />
              <Textarea
                placeholder="Causa mortis..."
                value={formData.causa_morte}
                onChange={(e) => updateField('causa_morte', e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Recomendações</Label>
              <VoiceInputButton
                onTranscriptChange={(text) => updateField('recomendacoes', text)}
                currentText={formData.recomendacoes}
                className="mb-2"
              />
              <Textarea
                placeholder="Recomendações para o manejo..."
                value={formData.recomendacoes}
                onChange={(e) => updateField('recomendacoes', e.target.value)}
                rows={3}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Camera className="w-4 h-4" />
                Fotos e Vídeos de Lesões
              </Label>
              <MediaUpload
                items={mediaItems}
                onChange={setMediaItems}
              />
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-3">
                <FileSignature className="w-4 h-4" />
                Assinatura Digital
              </Label>
              <DigitalSignature
                onSignatureComplete={(url) => updateField('assinatura_url', url)}
                existingUrl={formData.assinatura_url}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="pt-6 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Stethoscope className="w-5 h-5" />
              Autópsias
            </h2>
            <p className="text-sm text-muted-foreground">
              Exames post-mortem
            </p>
          </div>
          <ConnectionStatus showSyncButton={false} />
        </div>

        {/* Autopsias Cards */}
        {autopsias.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Stethoscope className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">Nenhuma autópsia registrada</p>
              <p className="text-sm mt-1">Toque no botão + para registrar</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {autopsias.map((autopsia) => (
              <Card 
                key={autopsia.id} 
                className="bg-card border-border transition-all active:scale-[0.98] cursor-pointer"
                onClick={() => handleView(autopsia)}
              >
                <CardContent className="p-4">
                  {/* Header: Status + Date */}
                  <div className="flex items-center justify-between mb-3">
                    <Badge 
                      variant={autopsia.status === 'assinado' ? 'default' : 'outline'}
                      className={autopsia.status === 'assinado' ? 'bg-emerald-600' : ''}
                    >
                      {autopsia.status === 'assinado' ? (
                        <><FileSignature className="w-3 h-3 mr-1" /> Assinado</>
                      ) : (
                        'Rascunho'
                      )}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(autopsia.data_autopsia), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">
                      {autopsia.quantidade_aves} ave{autopsia.quantidade_aves > 1 ? 's' : ''}
                    </Badge>
                    {autopsia.idade_dias && (
                      <Badge variant="outline">
                        {autopsia.idade_dias} dias
                      </Badge>
                    )}
                  </div>

                  {/* Diagnostic preview */}
                  {autopsia.diagnostico_presuntivo && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {autopsia.diagnostico_presuntivo}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-10 gap-2"
                      onClick={(e) => { e.stopPropagation(); handleView(autopsia); }}
                    >
                      <Eye className="w-4 h-4" />
                      Ver Detalhes
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 w-10 p-0 text-muted-foreground hover:text-destructive hover:border-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAutopsia(autopsia);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* FAB - Floating Action Button */}
      <Button
        onClick={() => { resetForm(); setDialogOpen(true); }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-50 p-0"
        size="icon"
      >
        <Plus className="w-6 h-6" />
      </Button>

      {/* New Autopsia Dialog - Wizard */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Nova Autópsia</DialogTitle>
            <DialogDescription>
              {WIZARD_STEPS[currentStep - 1]?.description}
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="px-4 py-2">
            <div className="flex items-center justify-between mb-2">
              {WIZARD_STEPS.map((step, index) => (
                <div 
                  key={step.id} 
                  className={`flex items-center ${index < WIZARD_STEPS.length - 1 ? 'flex-1' : ''}`}
                >
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      step.id < currentStep 
                        ? 'bg-primary text-primary-foreground' 
                        : step.id === currentStep 
                          ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' 
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step.id < currentStep ? <Check className="w-4 h-4" /> : step.id}
                  </div>
                  {index < WIZARD_STEPS.length - 1 && (
                    <div 
                      className={`h-1 flex-1 mx-2 rounded ${
                        step.id < currentStep ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <Progress value={(currentStep / WIZARD_STEPS.length) * 100} className="h-1" />
          </div>

          {/* Step Content */}
          <div className="p-4 min-h-[300px]">
            {renderWizardStep()}
          </div>

          {/* Navigation Buttons */}
          <div className="p-4 pt-0 flex items-center gap-2 border-t border-border mt-4">
            {currentStep > 1 && (
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="flex-1 h-12 gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </Button>
            )}
            {currentStep < WIZARD_STEPS.length ? (
              <Button 
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!canProceed()}
                className="flex-1 h-12 gap-2"
              >
                Próximo
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 h-12 gap-2"
              >
                {saving ? 'Salvando...' : 'Salvar Autópsia'}
                <Check className="w-4 h-4" />
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Autópsia</DialogTitle>
          </DialogHeader>
          {selectedAutopsia && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Data:</span>
                  <p className="font-medium">
                    {format(new Date(selectedAutopsia.data_autopsia), "dd/MM/yyyy")}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Aves:</span>
                  <p className="font-medium">{selectedAutopsia.quantidade_aves}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Idade:</span>
                  <p className="font-medium">{selectedAutopsia.idade_dias || '-'} dias</p>
                </div>
              </div>

              {SISTEMAS.map((sistema) => {
                const value = selectedAutopsia[sistema.key as keyof Autopsia];
                if (!value) return null;
                return (
                  <div key={sistema.key} className="border-t pt-4">
                    <Label className="flex items-center gap-2">
                      {sistema.icon} {sistema.label}
                    </Label>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{value as string}</p>
                  </div>
                );
              })}

              {selectedAutopsia.diagnostico_presuntivo && (
                <div className="border-t pt-4">
                  <Label>Diagnóstico Presuntivo</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">
                    {selectedAutopsia.diagnostico_presuntivo}
                  </p>
                </div>
              )}

              {selectedAutopsia.causa_morte && (
                <div>
                  <Label>Causa da Morte</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">
                    {selectedAutopsia.causa_morte}
                  </p>
                </div>
              )}

              {selectedAutopsia.recomendacoes && (
                <div>
                  <Label>Recomendações</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">
                    {selectedAutopsia.recomendacoes}
                  </p>
                </div>
              )}

              {selectedAutopsia.assinatura_url && (
                <div className="border-t pt-4">
                  <Label className="flex items-center gap-2 text-emerald-600">
                    <FileSignature className="w-4 h-4" />
                    Assinatura Digital
                  </Label>
                  <div className="mt-2 bg-white p-2 rounded-lg inline-block">
                    <img 
                      src={selectedAutopsia.assinatura_url} 
                      alt="Assinatura" 
                      className="max-h-16"
                    />
                  </div>
                  {selectedAutopsia.assinado_em && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Assinado em {format(new Date(selectedAutopsia.assinado_em), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Autópsia?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A autópsia e todas as mídias associadas serão excluídas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="h-12 bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
