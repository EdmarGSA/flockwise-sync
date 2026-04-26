import { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Crosshair, Settings2, Building2, Home, Layers, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/hooks/useTheme';
import { useCanManageMapbox } from '@/hooks/useCanManageMapbox';

interface NucleoGeo {
  id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
  latitude: number | null;
  longitude: number | null;
  area_id: string | null;
}
interface AreaGeo {
  id: string;
  nome: string;
  cor: string | null;
}
interface GalpaoGeo {
  id: string;
  nome: string;
  nucleo_id: string;
  latitude: number | null;
  longitude: number | null;
}

interface MapeamentoGPSProps {
  integradoId: string;
}

type EditTarget =
  | { kind: 'nucleo'; id: string; nome: string; lat: number; lng: number }
  | { kind: 'galpao'; id: string; nome: string; lat: number; lng: number }
  | null;

export function MapeamentoGPS({ integradoId }: MapeamentoGPSProps) {
  const { config, loading: loadingConfig } = useMapboxToken();
  const { canManage } = useCanManageMapbox();
  const { theme } = useTheme();

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const [areas, setAreas] = useState<AreaGeo[]>([]);
  const [nucleos, setNucleos] = useState<NucleoGeo[]>([]);
  const [galpoes, setGalpoes] = useState<GalpaoGeo[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [showNucleos, setShowNucleos] = useState(true);
  const [showGalpoes, setShowGalpoes] = useState(true);

  const [edit, setEdit] = useState<EditTarget>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Picker (mover/escolher no mapa)
  const [pickerMode, setPickerMode] = useState<EditTarget>(null);

  const fetchData = async () => {
    setLoadingData(true);
    const [a, n, g] = await Promise.all([
      supabase.from('areas').select('id, nome, cor').eq('integrado_id', integradoId),
      supabase
        .from('nucleos')
        .select('id, nome, cidade, estado, latitude, longitude, area_id')
        .eq('integrado_id', integradoId)
        .eq('ativo', true),
      supabase
        .from('galpoes')
        .select('id, nome, nucleo_id, latitude, longitude, nucleos!inner(integrado_id)')
        .eq('nucleos.integrado_id', integradoId)
        .eq('ativo', true),
    ]);
    if (a.data) setAreas(a.data as AreaGeo[]);
    if (n.data) setNucleos(n.data as NucleoGeo[]);
    if (g.data) setGalpoes(g.data as any as GalpaoGeo[]);
    setLoadingData(false);
  };

  useEffect(() => {
    if (integradoId) fetchData();
  }, [integradoId]);

  // Inicializar mapa
  useEffect(() => {
    if (!config?.public_token || !mapContainer.current || mapRef.current) return;

    mapboxgl.accessToken = config.public_token;

    const center: [number, number] =
      config.default_lng != null && config.default_lat != null
        ? [config.default_lng, config.default_lat]
        : [-51.9253, -14.235]; // Brasil

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom: config.default_zoom || 4,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      'top-right',
    );

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [config?.public_token, theme]);

  // Atualizar marcadores
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Limpar
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = new mapboxgl.LngLatBounds();
    let hasPoints = false;

    if (showNucleos) {
      nucleos
        .filter((n) => n.latitude != null && n.longitude != null)
        .forEach((n) => {
          const area = areas.find((a) => a.id === n.area_id);
          const cor = area?.cor || 'hsl(var(--primary))';
          const el = document.createElement('div');
          el.className = 'cursor-pointer';
          el.innerHTML = `
            <div style="background:${cor};color:#fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4);font-size:14px;font-weight:700">N</div>
          `;
          const popup = new mapboxgl.Popup({ offset: 18 }).setHTML(
            `<div style="font-family:inherit"><strong>${n.nome}</strong><br/><span style="font-size:11px;color:#666">Núcleo${
              area ? ' · ' + area.nome : ''
            }${n.cidade ? '<br/>' + n.cidade + (n.estado ? '/' + n.estado : '') : ''}</span></div>`,
          );
          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([n.longitude!, n.latitude!])
            .setPopup(popup)
            .addTo(map);
          markersRef.current.push(marker);
          bounds.extend([n.longitude!, n.latitude!]);
          hasPoints = true;
        });
    }

    if (showGalpoes) {
      galpoes
        .filter((g) => g.latitude != null && g.longitude != null)
        .forEach((g) => {
          const el = document.createElement('div');
          el.className = 'cursor-pointer';
          el.innerHTML = `
            <div style="background:hsl(var(--accent-foreground));color:hsl(var(--background));border-radius:6px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4);font-size:12px;font-weight:700">G</div>
          `;
          const popup = new mapboxgl.Popup({ offset: 18 }).setHTML(
            `<div style="font-family:inherit"><strong>${g.nome}</strong><br/><span style="font-size:11px;color:#666">Galpão</span></div>`,
          );
          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([g.longitude!, g.latitude!])
            .setPopup(popup)
            .addTo(map);
          markersRef.current.push(marker);
          bounds.extend([g.longitude!, g.latitude!]);
          hasPoints = true;
        });
    }

    if (hasPoints && !pickerMode) {
      try {
        map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 800 });
      } catch {}
    }
  }, [nucleos, galpoes, areas, showNucleos, showGalpoes, pickerMode]);

  // Picker: clique no mapa atualiza coords
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!pickerMode) {
      map.getCanvas().style.cursor = '';
      return;
    }
    map.getCanvas().style.cursor = 'crosshair';
    const handler = (e: mapboxgl.MapMouseEvent) => {
      setPickerMode((p) =>
        p ? { ...p, lat: e.lngLat.lat, lng: e.lngLat.lng } : p,
      );
    };
    map.on('click', handler);
    return () => {
      map.off('click', handler);
      map.getCanvas().style.cursor = '';
    };
  }, [pickerMode]);

  const semCoords = useMemo(() => {
    return [
      ...nucleos
        .filter((n) => n.latitude == null || n.longitude == null)
        .map((n) => ({ kind: 'nucleo' as const, id: n.id, nome: n.nome })),
      ...galpoes
        .filter((g) => g.latitude == null || g.longitude == null)
        .map((g) => ({ kind: 'galpao' as const, id: g.id, nome: g.nome })),
    ];
  }, [nucleos, galpoes]);

  const handleEstouAqui = (target: EditTarget) => {
    if (!target) return;
    if (!navigator.geolocation) {
      toast.error('Geolocalização não disponível neste dispositivo');
      return;
    }
    toast.loading('Obtendo localização GPS...', { id: 'geo' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        toast.dismiss('geo');
        setEdit({ ...target, lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success(
          `GPS capturado (precisão ~${Math.round(pos.coords.accuracy)}m)`,
        );
      },
      (err) => {
        toast.dismiss('geo');
        toast.error('Não foi possível obter localização: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const startPicker = (target: EditTarget) => {
    if (!target) return;
    setEdit(null);
    setPickerMode(target);
    toast.info('Clique no mapa para escolher a localização', { id: 'picker' });
  };

  const confirmPicker = () => {
    if (!pickerMode) return;
    setEdit(pickerMode);
    setPickerMode(null);
    toast.dismiss('picker');
  };

  const cancelPicker = () => {
    setPickerMode(null);
    toast.dismiss('picker');
  };

  const saveEdit = async () => {
    if (!edit) return;
    setSavingEdit(true);
    const table = edit.kind === 'nucleo' ? 'nucleos' : 'galpoes';
    const { error } = await supabase
      .from(table)
      .update({ latitude: edit.lat, longitude: edit.lng })
      .eq('id', edit.id);

    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
    } else {
      toast.success(`${edit.kind === 'nucleo' ? 'Núcleo' : 'Galpão'} localizado no mapa`);
      setEdit(null);
      fetchData();
    }
    setSavingEdit(false);
  };

  // Sem token configurado
  if (!loadingConfig && !config?.public_token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" /> Mapeamento GPS
          </CardTitle>
        </CardHeader>
        <CardContent>
          {canManage ? (
            <Alert>
              <AlertDescription>
                Sua organização ainda não tem o token Mapbox configurado. Configure
                agora para ativar o mapeamento GPS de núcleos e galpões.
                <br />
                <Link
                  to="/configuracoes/mapbox"
                  className="inline-flex items-center gap-2 mt-3 text-primary hover:underline font-medium"
                >
                  <Settings2 className="h-4 w-4" /> Configurar token Mapbox agora
                </Link>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <AlertDescription>
                O mapeamento GPS está desativado para sua organização.
                <br />
                <span className="text-sm text-muted-foreground mt-2 block">
                  Peça ao <strong>administrador da fazenda</strong> para
                  configurar o token Mapbox em Configurações → Mapeamento.
                </span>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      {/* MAPA */}
      <Card className="overflow-hidden">
        <div className="relative">
          <div ref={mapContainer} className="w-full h-[60vh] sm:h-[70vh]" />

          {pickerMode && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-background/95 backdrop-blur border rounded-lg shadow-lg px-3 py-2 flex items-center gap-2">
              <Crosshair className="h-4 w-4 text-primary" />
              <span className="text-sm">
                Clique para posicionar <strong>{pickerMode.nome}</strong>
              </span>
              <Button size="sm" onClick={confirmPicker} disabled={!pickerMode.lat}>
                Confirmar
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelPicker}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* SIDEBAR */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4" /> Camadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="lay-n" className="flex items-center gap-2 cursor-pointer">
                <Building2 className="h-4 w-4 text-primary" /> Núcleos
              </Label>
              <Switch id="lay-n" checked={showNucleos} onCheckedChange={setShowNucleos} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="lay-g" className="flex items-center gap-2 cursor-pointer">
                <Home className="h-4 w-4 text-primary" /> Galpões
              </Label>
              <Switch id="lay-g" checked={showGalpoes} onCheckedChange={setShowGalpoes} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sem coordenadas ({semCoords.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : semCoords.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                ✅ Todos os núcleos e galpões estão localizados.
              </p>
            ) : (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {semCoords.map((s) => (
                  <div
                    key={s.kind + s.id}
                    className="flex items-center justify-between gap-2 p-2 rounded border bg-muted/30"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {s.kind === 'nucleo' ? (
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <Home className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-sm truncate">{s.nome}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setEdit({ kind: s.kind, id: s.id, nome: s.nome, lat: 0, lng: 0 })
                      }
                    >
                      Localizar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Localizados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[30vh] overflow-y-auto">
              {[...nucleos.filter((n) => n.latitude != null && n.longitude != null).map((n) => ({
                kind: 'nucleo' as const,
                id: n.id,
                nome: n.nome,
                lat: n.latitude!,
                lng: n.longitude!,
              })), ...galpoes.filter((g) => g.latitude != null && g.longitude != null).map((g) => ({
                kind: 'galpao' as const,
                id: g.id,
                nome: g.nome,
                lat: g.latitude!,
                lng: g.longitude!,
              }))].map((it) => (
                <div
                  key={it.kind + it.id}
                  className="flex items-center justify-between gap-2 p-2 rounded border"
                >
                  <button
                    className="flex items-center gap-2 min-w-0 flex-1 text-left hover:text-primary"
                    onClick={() => mapRef.current?.flyTo({ center: [it.lng, it.lat], zoom: 16 })}
                  >
                    {it.kind === 'nucleo' ? (
                      <Building2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <Home className="h-4 w-4 shrink-0" />
                    )}
                    <span className="text-sm truncate">{it.nome}</span>
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setEdit({ kind: it.kind, id: it.id, nome: it.nome, lat: it.lat, lng: it.lng })
                    }
                  >
                    Editar
                  </Button>
                </div>
              ))}
              {nucleos.every((n) => n.latitude == null) && galpoes.every((g) => g.latitude == null) && (
                <p className="text-sm text-muted-foreground">Nenhum item localizado ainda.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Link to="/configuracoes/mapbox">
          <Button variant="outline" size="sm" className="w-full gap-2">
            <Settings2 className="h-4 w-4" /> Configurar Mapbox
          </Button>
        </Link>
      </div>

      {/* DIALOG EDIÇÃO */}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {edit?.kind === 'nucleo' ? <Building2 className="h-5 w-5" /> : <Home className="h-5 w-5" />}
              Localizar: {edit?.nome}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="elat">Latitude</Label>
                <Input
                  id="elat"
                  type="number"
                  step="any"
                  value={edit?.lat || ''}
                  onChange={(e) =>
                    setEdit((p) => (p ? { ...p, lat: parseFloat(e.target.value) || 0 } : p))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="elng">Longitude</Label>
                <Input
                  id="elng"
                  type="number"
                  step="any"
                  value={edit?.lng || ''}
                  onChange={(e) =>
                    setEdit((p) => (p ? { ...p, lng: parseFloat(e.target.value) || 0 } : p))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => handleEstouAqui(edit)} className="gap-2">
                <Crosshair className="h-4 w-4" /> 📍 Estou aqui
              </Button>
              <Button variant="outline" onClick={() => startPicker(edit)} className="gap-2">
                <MapPin className="h-4 w-4" /> Escolher no mapa
              </Button>
            </div>

            {edit?.lat ? (
              <Badge variant="secondary" className="text-xs">
                {edit.lat.toFixed(6)}, {edit.lng.toFixed(6)}
              </Badge>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEdit(null)}>
              Cancelar
            </Button>
            <Button onClick={saveEdit} disabled={savingEdit || !edit?.lat || !edit?.lng} className="gap-2">
              <Save className="h-4 w-4" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
