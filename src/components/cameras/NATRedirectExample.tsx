import { useState } from "react";
import { ArrowRight, Network } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  protocolo: "http" | "https";
  portaExternaHttp: number;
  portaExternaHttps: number;
  portaRtsp: number;
}

const IP_LAN_REGEX =
  /^(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})$/;

const isValidIpLan = (ip: string) => IP_LAN_REGEX.test(ip.trim());

/**
 * Card de exemplo de regra NAT — agora com campo editável para o IP LAN real
 * do DVR. As linhas de redirecionamento se atualizam automaticamente.
 */
export const NATRedirectExample = ({
  protocolo,
  portaExternaHttp,
  portaExternaHttps,
  portaRtsp,
}: Props) => {
  const [ipLan, setIpLan] = useState("192.168.1.105");
  const ipValido = isValidIpLan(ipLan);
  const ipExibido = ipValido ? ipLan.trim() : "192.168.1.105";

  const portaInternaHttp = 80;
  const portaInternaHttps = 443;
  const portaInternaRtsp = 554;
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
        {ipExibido}:<strong className="text-foreground">{interna}</strong>
      </span>
    </div>
  );

  return (
    <Alert>
      <Network className="h-4 w-4" />
      <AlertTitle className="text-sm">
        Exemplo de regra NAT para o roteador
      </AlertTitle>
      <AlertDescription className="space-y-3 text-xs">
        <div className="space-y-1">
          <Label htmlFor="ip-lan-dvr" className="text-xs">
            IP LAN do DVR (rede local)
          </Label>
          <Input
            id="ip-lan-dvr"
            value={ipLan}
            onChange={(e) => setIpLan(e.target.value)}
            placeholder="192.168.1.105"
            className={`h-8 font-mono text-xs ${
              !ipValido && ipLan ? "border-destructive" : ""
            }`}
          />
          {!ipValido && ipLan && (
            <p className="text-xs text-destructive">
              Use um IP de rede privada (10.x, 172.16-31.x ou 192.168.x).
            </p>
          )}
          <p className="text-muted-foreground">
            Esse é o IP do DVR <strong>dentro da granja</strong>. Veja no menu
            Rede → TCP/IP do DVR.
          </p>
        </div>

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
          <strong>"Port Forwarding"</strong>, <strong>"Virtual Server"</strong>{" "}
          ou <strong>"Redirecionamento de portas"</strong> e crie as regras
          acima usando protocolo <strong>TCP</strong>.
        </p>
      </AlertDescription>
    </Alert>
  );
};
