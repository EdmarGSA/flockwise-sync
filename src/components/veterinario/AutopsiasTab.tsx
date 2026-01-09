import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { toast } from 'sonner';
import { Plus, Stethoscope, Eye, Trash2, FileSignature, Camera, Mic } from 'lucide-react';
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

export default function AutopsiasTab({ loteId, diasLote }: AutopsiasTabProps) {
  const { user } = useAuth();
  const { isOnline, saveOffline, pendingCount } = useOfflineSync();
  
  const [autopsias, setAutopsias] = useState<Autopsia[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAutopsia, setSelectedAutopsia] = useState<Autopsia | null>(null);
  const [saving, setSaving] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);

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
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5" />
              Autópsias / Necropsias
            </CardTitle>
            <CardDescription>
              Registro de exames post-mortem
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionStatus showSyncButton={false} />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2" onClick={resetForm}>
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Nova Autópsia</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nova Autópsia</DialogTitle>
                  <DialogDescription>
                    Registre os achados do exame necroscópico
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Data</Label>
                      <Input
                        type="date"
                        value={formData.data_autopsia}
                        onChange={(e) => updateField('data_autopsia', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Qtd. Aves</Label>
                      <Input
                        type="number"
                        min={1}
                        value={formData.quantidade_aves}
                        onChange={(e) => updateField('quantidade_aves', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <Label>Idade (dias)</Label>
                      <Input
                        type="number"
                        value={formData.idade_dias}
                        onChange={(e) => updateField('idade_dias', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  {/* Systems Accordion */}
                  <div>
                    <Label className="mb-2 block">Achados por Sistema</Label>
                    <Accordion type="multiple" className="w-full">
                      {SISTEMAS.map((sistema) => (
                        <AccordionItem key={sistema.key} value={sistema.key}>
                          <AccordionTrigger className="text-sm">
                            <span className="flex items-center gap-2">
                              <span>{sistema.icon}</span>
                              <span>{sistema.label}</span>
                              {formData[sistema.key as keyof typeof formData] && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  Preenchido
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

                  {/* Diagnosis */}
                  <div className="space-y-4">
                    <div>
                      <Label className="flex items-center gap-2">
                        Diagnóstico Presuntivo
                        <Mic className="w-3 h-3 text-muted-foreground" />
                      </Label>
                      <VoiceInputButton
                        onTranscriptChange={(text) => updateField('diagnostico_presuntivo', text)}
                        currentText={formData.diagnostico_presuntivo}
                        className="mb-2"
                      />
                      <Textarea
                        placeholder="Diagnóstico baseado nos achados..."
                        value={formData.diagnostico_presuntivo}
                        onChange={(e) => updateField('diagnostico_presuntivo', e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div>
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
                        rows={2}
                      />
                    </div>

                    <div>
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
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Media Upload */}
                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <Camera className="w-4 h-4" />
                      Fotos e Vídeos de Lesões
                    </Label>
                    <MediaUpload
                      items={mediaItems}
                      onChange={setMediaItems}
                    />
                  </div>

                  {/* Digital Signature */}
                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <FileSignature className="w-4 h-4" />
                      Assinatura Digital
                    </Label>
                    <DigitalSignature
                      onSignatureComplete={(url) => updateField('assinatura_url', url)}
                      existingUrl={formData.assinatura_url}
                    />
                  </div>

                  {/* Submit */}
                  <div className="flex gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleSubmit}
                      disabled={saving}
                      className="flex-1"
                    >
                      {saving ? 'Salvando...' : 'Salvar Autópsia'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {autopsias.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Stethoscope className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Nenhuma autópsia registrada</p>
            <p className="text-sm">Clique em "Nova Autópsia" para registrar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {autopsias.map((autopsia) => (
              <div
                key={autopsia.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {format(new Date(autopsia.data_autopsia), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    <Badge variant="outline">
                      {autopsia.quantidade_aves} ave{autopsia.quantidade_aves > 1 ? 's' : ''}
                    </Badge>
                    {autopsia.idade_dias && (
                      <Badge variant="secondary">
                        {autopsia.idade_dias} dias
                      </Badge>
                    )}
                    <Badge 
                      variant={autopsia.status === 'assinado' ? 'default' : 'outline'}
                      className={autopsia.status === 'assinado' ? 'bg-green-600' : ''}
                    >
                      {autopsia.status === 'assinado' ? 'Assinado' : 'Rascunho'}
                    </Badge>
                  </div>
                  {autopsia.diagnostico_presuntivo && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {autopsia.diagnostico_presuntivo}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleView(autopsia)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedAutopsia(autopsia);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  <Label className="flex items-center gap-2 text-green-600">
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
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
