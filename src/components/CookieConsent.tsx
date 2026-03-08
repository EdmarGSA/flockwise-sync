import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CookiePreferences {
  essenciais: boolean;
  analiticos: boolean;
  publicidade: boolean;
  personalizacao: boolean;
}

const COOKIE_CONSENT_KEY = 'gsa_cookie_consent';
const COOKIE_PREFS_KEY = 'gsa_cookie_preferences';

export const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essenciais: true,
    analiticos: false,
    publicidade: false,
    personalizacao: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const saveConsent = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    localStorage.setItem(COOKIE_PREFS_KEY, JSON.stringify(prefs));
    setVisible(false);
  };

  const handleAcceptAll = () => {
    saveConsent({
      essenciais: true,
      analiticos: true,
      publicidade: true,
      personalizacao: true,
    });
  };

  const handleReject = () => {
    saveConsent({
      essenciais: true,
      analiticos: false,
      publicidade: false,
      personalizacao: false,
    });
  };

  const handleSaveCustom = () => {
    saveConsent(preferences);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6 animate-in slide-in-from-bottom-5 duration-500">
      <Card className="mx-auto max-w-lg shadow-lg border-border/60 bg-card">
        <CardContent className="p-5 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm text-foreground">Controle sua privacidade</h3>
            </div>
            <span className="text-xs text-muted-foreground font-medium">LGPD</span>
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            Nosso site usa cookies para melhorar a navegação.
          </p>

          {/* Cookie info box */}
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Usamos cookies para compartilhar dados de análise, publicidade, dados de usuários e 
              personalização de anúncios, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
            </p>
          </div>

          {/* Customize section */}
          {showCustomize && (
            <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3 animate-in fade-in-0 duration-200">
              <div className="flex items-center justify-between">
                <Label htmlFor="essenciais" className="text-xs font-medium text-foreground">
                  Essenciais
                </Label>
                <Switch id="essenciais" checked disabled className="scale-75" />
              </div>
              <p className="text-[11px] text-muted-foreground -mt-2">
                Necessários para o funcionamento do sistema. Não podem ser desativados.
              </p>

              <div className="flex items-center justify-between">
                <Label htmlFor="analiticos" className="text-xs font-medium text-foreground">
                  Analíticos
                </Label>
                <Switch
                  id="analiticos"
                  checked={preferences.analiticos}
                  onCheckedChange={(v) => setPreferences(p => ({ ...p, analiticos: v }))}
                  className="scale-75"
                />
              </div>
              <p className="text-[11px] text-muted-foreground -mt-2">
                Ajudam a entender como os usuários interagem com o sistema.
              </p>

              <div className="flex items-center justify-between">
                <Label htmlFor="publicidade" className="text-xs font-medium text-foreground">
                  Publicidade
                </Label>
                <Switch
                  id="publicidade"
                  checked={preferences.publicidade}
                  onCheckedChange={(v) => setPreferences(p => ({ ...p, publicidade: v }))}
                  className="scale-75"
                />
              </div>
              <p className="text-[11px] text-muted-foreground -mt-2">
                Permitem exibir conteúdo relevante de parceiros.
              </p>

              <div className="flex items-center justify-between">
                <Label htmlFor="personalizacao" className="text-xs font-medium text-foreground">
                  Personalização
                </Label>
                <Switch
                  id="personalizacao"
                  checked={preferences.personalizacao}
                  onCheckedChange={(v) => setPreferences(p => ({ ...p, personalizacao: v }))}
                  className="scale-75"
                />
              </div>
              <p className="text-[11px] text-muted-foreground -mt-2">
                Adaptam a experiência do usuário com base em preferências anteriores.
              </p>
            </div>
          )}

          {/* Links */}
          <div className="flex items-center gap-1 text-xs">
            <Link to="/politica-privacidade" className="text-primary hover:underline font-medium">
              Política de Privacidade
            </Link>
            <span className="text-muted-foreground">-</span>
            <Link to="/termos-uso" className="text-primary hover:underline font-medium">
              Termos de uso
            </Link>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCustomize(!showCustomize)}
              className="text-xs h-8 px-3 gap-1"
            >
              Customizar
              {showCustomize ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReject}
              className="text-xs h-8 px-4"
            >
              Rejeitar
            </Button>
            {showCustomize ? (
              <Button
                size="sm"
                onClick={handleSaveCustom}
                className="text-xs h-8 px-4 ml-auto"
              >
                Salvar preferências
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleAcceptAll}
                className="text-xs h-8 px-6 ml-auto"
              >
                Aceitar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
