import { Button } from "@/components/ui/button";
import { 
  Layers, 
  Truck, 
  MapPin, 
  Stethoscope,
  Wheat,
  ArrowRight,
  DollarSign,
  ShoppingCart,
  Gauge,
  Utensils,
  Hand,
  CheckCircle,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ModuleCardProps {
  icon: React.ReactNode;
  title: string;
  features: string[];
  index: number;
  isActive: boolean;
}

const ModuleCard = ({ icon, title, features, index, isActive }: ModuleCardProps) => {
  return (
    <div 
      className={cn(
        "group relative p-6 rounded-2xl bg-gradient-card border transition-all duration-500 shadow-card hover:shadow-card-hover hover:-translate-y-1",
        isActive 
          ? "border-primary/30 hover:border-primary/50" 
          : "border-amber-500/20 hover:border-amber-500/40 opacity-80"
      )}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Status badge */}
      <div className={cn(
        "absolute top-4 right-4 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
        isActive 
          ? "bg-primary/20 text-primary" 
          : "bg-amber-500/20 text-amber-400"
      )}>
        {isActive ? (
          <>
            <CheckCircle className="w-3 h-3" />
            Ativo
          </>
        ) : (
          <>
            <Clock className="w-3 h-3" />
            Em breve
          </>
        )}
      </div>

      {/* Glow effect on hover */}
      <div className={cn(
        "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500",
        isActive 
          ? "bg-gradient-to-br from-primary/10 via-transparent to-accent/5" 
          : "bg-gradient-to-br from-amber-500/10 via-transparent to-amber-500/5"
      )} />
      
      <div className="relative">
        {/* Icon */}
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300",
          isActive 
            ? "bg-secondary group-hover:bg-primary/20" 
            : "bg-amber-500/10 group-hover:bg-amber-500/20"
        )}>
          <div className={cn(
            "group-hover:scale-110 transition-transform duration-300",
            isActive ? "text-primary" : "text-amber-400"
          )}>
            {icon}
          </div>
        </div>

        {/* Title */}
        <h3 className={cn(
          "text-lg font-semibold mb-3 transition-colors",
          isActive 
            ? "text-foreground group-hover:text-primary" 
            : "text-foreground/80 group-hover:text-amber-400"
        )}>
          {title}
        </h3>

        {/* Features */}
        <ul className="space-y-2 mb-5">
          {features.map((feature, i) => (
            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
              <span className={cn(
                "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                isActive ? "bg-primary/60" : "bg-amber-500/60"
              )} />
              {feature}
            </li>
          ))}
        </ul>

        {/* CTA */}
        {isActive && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="group/btn p-0 h-auto text-primary hover:text-primary hover:bg-transparent"
          >
            Explorar
            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
          </Button>
        )}
      </div>
    </div>
  );
};

const ModulesSection = () => {
  const activeModules = [
    {
      icon: <Layers className="w-6 h-6" />,
      title: "Meus Lotes",
      features: ["Portal do integrado", "Acompanhamento de lotes ativos", "Mortalidade e pesagens"],
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: "Gestão de Campo",
      features: ["Cadastro de núcleos e galpões", "Gestão de áreas e rotas GPS", "Abertura e fechamento de lotes"],
    },
    {
      icon: <Utensils className="w-6 h-6" />,
      title: "Gestão de Consumo",
      features: ["Solicitação de ração", "Controle de entregas", "Gestão de silos"],
    },
    {
      icon: <Stethoscope className="w-6 h-6" />,
      title: "Veterinário",
      features: ["Tratamentos e medicamentos", "Controle de carência", "Observações e orientações"],
    },
    {
      icon: <Wheat className="w-6 h-6" />,
      title: "Fábrica de Ração",
      features: ["Compras inteligentes", "Ordens de produção", "Gestão de estoque e recebimento"],
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: "Financeiro",
      features: ["Contas a pagar e receber", "Fluxo de caixa", "Centro de custos e DRE"],
    },
    {
      icon: <ShoppingCart className="w-6 h-6" />,
      title: "Comercial",
      features: ["Pedidos e vendas", "Tabelas de preço", "Faturamento e separação"],
    },
    {
      icon: <Gauge className="w-6 h-6" />,
      title: "Cockpit Thoth",
      features: ["Visão 360° da operação", "Indicadores em tempo real", "Alertas e notificações"],
    },
  ];

  const futureModules = [
    {
      icon: <Truck className="w-6 h-6" />,
      title: "Logística",
      features: ["Rastreamento de entregas", "Gestão de frota", "Roteirização inteligente"],
    },
    {
      icon: <Hand className="w-6 h-6" />,
      title: "Apanha",
      features: ["Gestão de turmas", "Controle de carregamento", "Agendamento de coletas"],
    },
  ];

  return (
    <section id="modulos" className="py-24 relative">
      {/* Background accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,hsl(145_60%_15%_/_0.1),transparent_60%)]" />
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <CheckCircle className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">8 Módulos em Funcionamento</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Módulos trabalhando <span className="text-gradient-primary">juntos</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Gerencie toda sua operação avícola de ponta a ponta com módulos integrados
          </p>
        </div>

        {/* Active modules grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-12">
          {activeModules.map((module, index) => (
            <ModuleCard
              key={module.title}
              icon={module.icon}
              title={module.title}
              features={module.features}
              index={index}
              isActive={true}
            />
          ))}
        </div>

        {/* Future modules section */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-4">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-400">Em Desenvolvimento</span>
            </div>
            <h3 className="text-2xl font-semibold text-foreground">
              Próximos Módulos
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5 max-w-2xl mx-auto">
            {futureModules.map((module, index) => (
              <ModuleCard
                key={module.title}
                icon={module.icon}
                title={module.title}
                features={module.features}
                index={index + activeModules.length}
                isActive={false}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ModulesSection;
