import { Button } from "@/components/ui/button";
import { 
  Layers, 
  Truck, 
  ClipboardList, 
  MapPin, 
  Users, 
  Stethoscope,
  BarChart3,
  Hand,
  LayoutDashboard,
  Bell,
  Wheat,
  ArrowRight
} from "lucide-react";

interface ModuleCardProps {
  icon: React.ReactNode;
  title: string;
  features: string[];
  index: number;
}

const ModuleCard = ({ icon, title, features, index }: ModuleCardProps) => {
  return (
    <div 
      className="group relative p-6 rounded-2xl bg-gradient-card border border-border/50 hover:border-primary/40 transition-all duration-500 shadow-card hover:shadow-card-hover hover:-translate-y-1"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors duration-300">
          <div className="text-primary group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">
          {title}
        </h3>

        {/* Features */}
        <ul className="space-y-2 mb-5">
          {features.map((feature, i) => (
            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-1.5 shrink-0" />
              {feature}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="group/btn p-0 h-auto text-primary hover:text-primary hover:bg-transparent"
        >
          Explorar
          <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
};

const ModulesSection = () => {
  const modules = [
    {
      icon: <Layers className="w-6 h-6" />,
      title: "Meus Lotes",
      features: ["Portal do integrado", "Registro de situação"],
    },
    {
      icon: <Truck className="w-6 h-6" />,
      title: "Logística",
      features: ["Rastreamento de entregas", "Gestão de frota"],
    },
    {
      icon: <ClipboardList className="w-6 h-6" />,
      title: "Gestão de Lotes",
      features: ["Abertura e fechamento de lotes", "Ordem de coleta automatizada"],
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: "Gestão de Campo",
      features: ["Gestão de áreas e rotas GPS", "Cadastro de núcleos e galpões"],
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Gerenciar Usuários",
      features: ["Cotação via WhatsApp", "Controle de papéis e permissões"],
    },
    {
      icon: <Stethoscope className="w-6 h-6" />,
      title: "Veterinário",
      features: ["Acompanhamento técnico", "Análise de laboratório"],
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Relatórios",
      features: ["Painéis interativos", "Análises de desempenho"],
    },
    {
      icon: <Hand className="w-6 h-6" />,
      title: "Apanha",
      features: ["Gestão de carregamento", "Controle de equipes"],
    },
    {
      icon: <LayoutDashboard className="w-6 h-6" />,
      title: "Painel de Controle",
      features: ["Visão 360° de toda operação", "Controle de permissões por usuário"],
    },
    {
      icon: <Bell className="w-6 h-6" />,
      title: "Notificações",
      features: ["Alertas em tempo real", "Notificações personalizadas"],
    },
    {
      icon: <Wheat className="w-6 h-6" />,
      title: "Gestão de Racionamento",
      features: ["Ciclo completo da fábrica", "Visão de estoque"],
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
            <span className="text-sm font-medium text-primary">✓ Integrados</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Módulos trabalhando <span className="text-gradient-primary">juntos</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Para gerenciar toda sua operação avícola de ponta a ponta
          </p>
        </div>

        {/* Modules grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {modules.map((module, index) => (
            <ModuleCard
              key={module.title}
              icon={module.icon}
              title={module.title}
              features={module.features}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ModulesSection;
