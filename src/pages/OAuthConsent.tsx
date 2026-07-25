import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck, AlertTriangle } from "lucide-react";

type AuthClient = { name?: string; client_name?: string; logo_uri?: string };
type AuthDetails = { client?: AuthClient; redirect_url?: string; redirect_to?: string };

// `supabase.auth.oauth` é beta e ainda não tem tipos publicados.
const oauth = () =>
  (supabase.auth as unknown as {
    oauth: {
      getAuthorizationDetails: (
        id: string,
      ) => Promise<{ data: AuthDetails | null; error: { message: string } | null }>;
      approveAuthorization: (
        id: string,
      ) => Promise<{ data: AuthDetails | null; error: { message: string } | null }>;
      denyAuthorization: (
        id: string,
      ) => Promise<{ data: AuthDetails | null; error: { message: string } | null }>;
    };
  }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Parâmetro authorization_id ausente na URL.");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = `/auth?next=${encodeURIComponent(next)}`;
        return;
      }
      const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("O servidor de autorização não retornou um destino de redirecionamento.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? details?.client?.client_name ?? "o aplicativo";

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        {error ? (
          <>
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center mb-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <CardTitle>Não foi possível carregar a autorização</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => window.location.assign("/home")}>
                Voltar ao sistema
              </Button>
            </CardContent>
          </>
        ) : !details ? (
          <CardContent className="py-10 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando solicitação…
          </CardContent>
        ) : (
          <>
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <CardTitle>Conectar {clientName} à sua conta</CardTitle>
              <CardDescription>
                {clientName} poderá usar as ferramentas do GSA Tibiri em seu nome — consultar lotes,
                indicadores zootécnicos, ambiência e registrar mortalidade. O acesso respeita
                exatamente as suas permissões.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button disabled={busy} onClick={() => decide(true)} className="flex-1">
                {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Autorizar
              </Button>
              <Button
                disabled={busy}
                variant="outline"
                onClick={() => decide(false)}
                className="flex-1"
              >
                Recusar
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </main>
  );
}
