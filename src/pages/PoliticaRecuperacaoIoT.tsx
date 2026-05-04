import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ShieldCheck, Save, Loader2, Building2, Warehouse, Cpu, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';

type Escopo = 'organizacao' | 'galpao' | 'dispositivo';

interface Politica {
  id: string;
  integrado_id: string;
  escopo: Escopo;
  galpao_id: string | null;
  dispositivo_id: string | null;
  restaurar_ultimo_estado: boolean;
  aplicar_schedule_offline: boolean;
  limite_horas_offline: number;
  observacoes: string | null;
}

interface Galpao { id: string; nome: string }
interface Dispositivo { id: string; nome: string; galpao_id: string | null }

const DEFAULT: Omit<Politica, 'id' | 'integrado_id' | 'escopo' | 'galpao_id' | 'dispositivo_id'> = {
  restaurar_ultimo_estado: true,
  aplicar_schedule_offline: true,
  limite_horas_offline: 24,
  observacoes: null,
};

export default function PoliticaRecuperacaoIoT() {
  const navigate = useNavigate();
  const { integradoId } = useIntegradoId();
  const [loading, setLoading] = useState(true);
  const [politicas, setPoliticas] = useState<Politica[]>([]);
  const [galpoes, setGalpoes] = useState<Galpao[]>([]);
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);

  const fetchAll = async () => {
    if (!integradoId) return;
    setLoading(true);
    const [pol, gal, dev] = await Promise.all([
      supabase.from('politica_recuperacao_iot').select('*').eq('integrado_id', integradoId),
      supabase.from('galpoes').select('id, nome, nucleos!inner(integrado_id)').eq('nucleos.integrado_id', integradoId).eq('ativo', true),
      supabase.from('dispositivos_iot').select('id, nome, galpao_id').eq('integrado_id', integradoId).eq('ativo', true),
    ]);
    setPoliticas((pol.data ?? []) as Politica[]);
    setGalpoes((gal.data ?? []).map((g: any) => ({ id: g.id, nome: g.nome })));
    setDispositivos((dev.data ?? []) as Dispositivo[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, [integradoId]);

  const orgPolitica = useMemo(
    () => politicas.find((p) => p.escopo === 'organizacao') ?? null,
    [politicas],
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-3 sm:px-6 pt-20 sm:pt-24 pb-12">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/configuracoes')} className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Política de Recuperação IoT</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Defina como dispositivos devem se comportar após queda de energia ou internet.
              </p>
            </div>
          </div>
          {!loading && integradoId && (
            <BulkApplyDialog
              integradoId={integradoId}
              galpoes={galpoes}
              dispositivos={dispositivos}
              onSaved={fetchAll}
            />
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="organizacao" className="space-y-4">
            <TabsList>
              <TabsTrigger value="organizacao" className="gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Organização
              </TabsTrigger>
              <TabsTrigger value="galpao" className="gap-1.5">
                <Warehouse className="h-3.5 w-3.5" /> Por Galpão
              </TabsTrigger>
              <TabsTrigger value="dispositivo" className="gap-1.5">
                <Cpu className="h-3.5 w-3.5" /> Por Dispositivo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="organizacao">
              <PoliticaForm
                titulo="Política padrão da organização"
                descricao="Aplicada a todos os dispositivos sem regra específica."
                escopo="organizacao"
                integradoId={integradoId!}
                politica={orgPolitica}
                onSaved={fetchAll}
              />
            </TabsContent>

            <TabsContent value="galpao" className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Sobrescreve a política da organização para todos os dispositivos do galpão selecionado.
              </p>
              {galpoes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Nenhum galpão ativo.</p>
              ) : galpoes.map((g) => {
                const pol = politicas.find((p) => p.escopo === 'galpao' && p.galpao_id === g.id) ?? null;
                return (
                  <PoliticaForm
                    key={g.id}
                    titulo={g.nome}
                    descricao={pol ? 'Política específica' : 'Usando padrão da organização'}
                    escopo="galpao"
                    galpaoId={g.id}
                    integradoId={integradoId!}
                    politica={pol}
                    onSaved={fetchAll}
                    collapsible
                  />
                );
              })}
            </TabsContent>

            <TabsContent value="dispositivo" className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Sobrescreve qualquer política superior para o dispositivo individual.
              </p>
              {dispositivos.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Nenhum dispositivo ativo.</p>
              ) : dispositivos.map((d) => {
                const pol = politicas.find((p) => p.escopo === 'dispositivo' && p.dispositivo_id === d.id) ?? null;
                return (
                  <PoliticaForm
                    key={d.id}
                    titulo={d.nome}
                    descricao={pol ? 'Política específica' : 'Herdando do galpão/organização'}
                    escopo="dispositivo"
                    dispositivoId={d.id}
                    integradoId={integradoId!}
                    politica={pol}
                    onSaved={fetchAll}
                    collapsible
                  />
                );
              })}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

interface FormProps {
  titulo: string;
  descricao: string;
  escopo: Escopo;
  integradoId: string;
  galpaoId?: string;
  dispositivoId?: string;
  politica: Politica | null;
  onSaved: () => void;
  collapsible?: boolean;
}

function PoliticaForm({
  titulo, descricao, escopo, integradoId, galpaoId, dispositivoId, politica, onSaved, collapsible,
}: FormProps) {
  const [open, setOpen] = useState(!collapsible || !!politica);
  const [restaurar, setRestaurar] = useState(politica?.restaurar_ultimo_estado ?? DEFAULT.restaurar_ultimo_estado);
  const [schedule, setSchedule] = useState(politica?.aplicar_schedule_offline ?? DEFAULT.aplicar_schedule_offline);
  const [limite, setLimite] = useState(politica?.limite_horas_offline ?? DEFAULT.limite_horas_offline);
  const [obs, setObs] = useState(politica?.observacoes ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRestaurar(politica?.restaurar_ultimo_estado ?? DEFAULT.restaurar_ultimo_estado);
    setSchedule(politica?.aplicar_schedule_offline ?? DEFAULT.aplicar_schedule_offline);
    setLimite(politica?.limite_horas_offline ?? DEFAULT.limite_horas_offline);
    setObs(politica?.observacoes ?? '');
  }, [politica]);

  const salvar = async () => {
    setSaving(true);
    const payload: any = {
      integrado_id: integradoId,
      escopo,
      galpao_id: escopo === 'galpao' ? galpaoId : null,
      dispositivo_id: escopo === 'dispositivo' ? dispositivoId : null,
      restaurar_ultimo_estado: restaurar,
      aplicar_schedule_offline: schedule,
      limite_horas_offline: limite,
      observacoes: obs || null,
    };
    let error;
    if (politica) {
      ({ error } = await supabase.from('politica_recuperacao_iot').update(payload).eq('id', politica.id));
    } else {
      ({ error } = await supabase.from('politica_recuperacao_iot').insert(payload));
    }
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar', { description: error.message });
    } else {
      toast.success('Política salva');
      onSaved();
    }
  };

  const remover = async () => {
    if (!politica) return;
    if (!confirm('Remover esta política específica? Voltará a herdar a regra superior.')) return;
    const { error } = await supabase.from('politica_recuperacao_iot').delete().eq('id', politica.id);
    if (error) toast.error('Erro', { description: error.message });
    else { toast.success('Política removida'); onSaved(); }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div
            className={collapsible ? 'cursor-pointer flex-1' : 'flex-1'}
            onClick={() => collapsible && setOpen((v) => !v)}
          >
            <CardTitle className="text-base flex items-center gap-2">
              {titulo}
              {politica && <Badge variant="outline" className="text-[10px]">configurada</Badge>}
            </CardTitle>
            <CardDescription className="text-xs">{descricao}</CardDescription>
          </div>
          {politica && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={remover}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Restaurar último estado conhecido</Label>
              <p className="text-[11px] text-muted-foreground">
                Ao reiniciar, o dispositivo retoma o estado salvo antes da queda.
              </p>
            </div>
            <Switch checked={restaurar} onCheckedChange={setRestaurar} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Aplicar schedule offline (NVS)</Label>
              <p className="text-[11px] text-muted-foreground">
                Sem internet, segue a programação 24h gravada localmente.
              </p>
            </div>
            <Switch checked={schedule} onCheckedChange={setSchedule} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Limite de horas offline</Label>
              <Input
                type="number" min={0} max={720}
                value={limite}
                onChange={(e) => setLimite(Math.max(0, Math.min(720, Number(e.target.value) || 0)))}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Após esse tempo sem sincronizar, dispara alerta crítico. 0 = nunca.
              </p>
            </div>
            <div>
              <Label className="text-sm">Observações</Label>
              <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={salvar} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Salvar
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
