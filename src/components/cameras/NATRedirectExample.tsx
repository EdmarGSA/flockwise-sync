import { ArrowRight, Network } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Props {
  protocolo: "http" | "https";
  portaExternaHttp: number;
  portaExternaHttps: number;
  portaRtsp: number;
}

/**
 * Mostra um exemplo prático de regra de redirecionamento NAT (port forwarding)
 * para o usuário configurar no roteador da granja, com base nas portas
 * que ele já preencheu no formulário do DVR.
 */
export const NATRedirectExample = ({
  protocolo,
  portaExternaHttp,
  portaExternaHttps,
  portaRtsp,
}: Props) => {
  const portaInternaHttp = 80;
  const portaInternaHttps = 443;
  const portaInternaRtsp = 554;
  const ipLanExemplo = "192.168.1.105";
  const protoAtivoLabel = protocolo.toUpperCase();
  const portaExternaAtiva = protocolo === "http" ? portaExternaHttp : portaExternaHttps;
  const portaInternaAtiva = protocolo === "http" ? portaInternaHttp : portaInternaHttps;

  const Row = ({
    label,
    externa,
    interna,
    destaque = false,
  }: {
    label: string;
    externa: number;
    interna: number;
    destaque?: boolean;
  }) => (
    <div
      className={`grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 rounded-md border px-2 py-1.5 text-xs ${
        destaque ? "border-primary/50 bg-primary/5" : "border-border"
      }`}
    >
      <span className="font-mono font-semibold">{label}</span>
      <span className="font-mono">
        WAN <strong>{externa}</strong>
      </span>
      <ArrowRight className="h-3 w-3 text-muted-foreground" />
      <span className="font-mono text-muted-foreground">
        {ipLanExemplo}:<strong className="text-foreground">{interna}</strong>
      </span>
    </div>
  );

  return (
    <Alert>
      <Network className="h-4 w-4" />
      <AlertTitle className="text-sm">
        Exemplo de regra NAT para o roteador
      </AlertTitle>
      <AlertDescription className="space-y-2 text-xs">
        <p className="text-muted-foreground">
          Substitua <code>{ipLanExemplo}</code> pelo IP local real do seu DVR.
          A porta externa (WAN) é aberta na internet; a porta interna é a do DVR
          na rede local.
        </p>
        <div className="space-y-1">
          <Row
            label={protoAtivoLabel}
            externa={portaExternaAtiva}
            interna={portaInternaAtiva}
            destaque
          />
          <Row label="RTSP" externa={portaRtsp} interna={portaInternaRtsp} />
        </div>
        <p className="text-muted-foreground">
          No painel do roteador procure por{" "}
          <strong>“Port Forwarding”</strong>, <strong>“Virtual Server”</strong>{" "}
          ou <strong>“Redirecionamento de portas”</strong> e crie as regras
          acima usando o protocolo <strong>TCP</strong>.
        </p>
      </AlertDescription>
    </Alert>
  );
};
