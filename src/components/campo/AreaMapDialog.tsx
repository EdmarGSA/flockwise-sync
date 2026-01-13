import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Map, Info, ExternalLink } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface Nucleo {
  id: string;
  nome: string;
  latitude: number | null;
  longitude: number | null;
}

interface AreaMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areaNome: string;
  areaCor: string;
  nucleos: Nucleo[];
}

const MAPBOX_TOKEN_KEY = 'mapbox_public_token';

export function AreaMapDialog({
  open,
  onOpenChange,
  areaNome,
  areaCor,
  nucleos,
}: AreaMapDialogProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const [mapboxToken, setMapboxToken] = useState(() => 
    localStorage.getItem(MAPBOX_TOKEN_KEY) || ''
  );
  const [tempToken, setTempToken] = useState('');
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const nucleosComCoordenadas = nucleos.filter(
    (n) => n.latitude !== null && n.longitude !== null
  );

  useEffect(() => {
    if (!open) {
      // Cleanup on close
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      setMapReady(false);
      setMapError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !mapboxToken || !mapContainer.current || nucleosComCoordenadas.length === 0) {
      return;
    }

    try {
      mapboxgl.accessToken = mapboxToken;

      // Calculate center from nucleos
      const lats = nucleosComCoordenadas.map((n) => n.latitude!);
      const lngs = nucleosComCoordenadas.map((n) => n.longitude!);
      const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
      const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [centerLng, centerLat],
        zoom: 10,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('load', () => {
        setMapReady(true);
        setMapError(null);

        // Add markers for each nucleo
        nucleosComCoordenadas.forEach((nucleo) => {
          const el = document.createElement('div');
          el.className = 'custom-marker';
          el.style.width = '32px';
          el.style.height = '32px';
          el.style.borderRadius = '50%';
          el.style.backgroundColor = areaCor || '#22c55e';
          el.style.border = '3px solid white';
          el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
          el.style.cursor = 'pointer';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';

          const inner = document.createElement('div');
          inner.style.width = '12px';
          inner.style.height = '12px';
          inner.style.borderRadius = '50%';
          inner.style.backgroundColor = 'white';
          el.appendChild(inner);

          const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div style="padding: 8px;">
              <strong>${nucleo.nome}</strong>
              <p style="margin: 4px 0 0; font-size: 12px; color: #666;">
                ${nucleo.latitude?.toFixed(6)}, ${nucleo.longitude?.toFixed(6)}
              </p>
            </div>`
          );

          const marker = new mapboxgl.Marker(el)
            .setLngLat([nucleo.longitude!, nucleo.latitude!])
            .setPopup(popup)
            .addTo(map.current!);

          markersRef.current.push(marker);
        });

        // Fit bounds if multiple nucleos
        if (nucleosComCoordenadas.length > 1) {
          const bounds = new mapboxgl.LngLatBounds();
          nucleosComCoordenadas.forEach((n) => {
            bounds.extend([n.longitude!, n.latitude!]);
          });
          map.current?.fitBounds(bounds, { padding: 60 });
        }
      });

      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setMapError('Erro ao carregar o mapa. Verifique o token.');
      });
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError('Erro ao inicializar o mapa.');
    }

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [open, mapboxToken, nucleosComCoordenadas, areaCor]);

  const handleSaveToken = () => {
    if (tempToken.trim()) {
      localStorage.setItem(MAPBOX_TOKEN_KEY, tempToken.trim());
      setMapboxToken(tempToken.trim());
      setTempToken('');
    }
  };

  const handleClearToken = () => {
    localStorage.removeItem(MAPBOX_TOKEN_KEY);
    setMapboxToken('');
    setMapReady(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            Mapa - {areaNome}
          </DialogTitle>
        </DialogHeader>

        {nucleosComCoordenadas.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Nenhum núcleo vinculado possui coordenadas GPS cadastradas.
              Edite os núcleos para adicionar localização.
            </AlertDescription>
          </Alert>
        ) : !mapboxToken ? (
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Para visualizar o mapa, insira seu token público do Mapbox.
                <a
                  href="https://account.mapbox.com/access-tokens/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 ml-1 text-primary hover:underline"
                >
                  Obter token <ExternalLink className="h-3 w-3" />
                </a>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="mapbox-token">Token Público do Mapbox</Label>
              <div className="flex gap-2">
                <Input
                  id="mapbox-token"
                  type="text"
                  placeholder="pk.eyJ1Ijo..."
                  value={tempToken}
                  onChange={(e) => setTempToken(e.target.value)}
                />
                <Button onClick={handleSaveToken} disabled={!tempToken.trim()}>
                  Salvar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                O token será salvo localmente no seu navegador.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {mapError && (
              <Alert variant="destructive">
                <AlertDescription>{mapError}</AlertDescription>
              </Alert>
            )}

            <div
              ref={mapContainer}
              className="w-full h-[400px] rounded-lg border overflow-hidden"
              style={{ minHeight: '400px' }}
            />

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full border-2 border-white shadow"
                  style={{ backgroundColor: areaCor || '#22c55e' }}
                />
                <span className="text-muted-foreground">
                  {nucleosComCoordenadas.length} núcleo(s) no mapa
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClearToken}>
                Alterar token
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
