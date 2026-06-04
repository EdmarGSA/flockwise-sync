import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  titulo?: string;
  descricao?: string;
  className?: string;
}

export default function IAGateCard({
  titulo = "IA Insights — disponível como add-on",
  descricao = "Ative o add-on de IA para receber análises narrativas e diagnósticas geradas automaticamente a partir dos dados do lote.",
  className,
}: Props) {
  const navigate = useNavigate();
  return (
    <Card className={`border-primary/40 bg-primary/5 ${className ?? ""}`}>
      <CardContent className="p-4 flex items-start gap-3 flex-wrap">
        <div className="p-2 rounded-md bg-primary/15">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="font-semibold text-sm">{titulo}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{descricao}</div>
        </div>
        <Button size="sm" variant="default" onClick={() => navigate("/configuracoes/plano")}>
          Ver planos <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
