import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Bird, 
  Truck, 
  Stethoscope, 
  Factory, 
  Users, 
  Map, 
  LogOut,
  Settings,
  Package,
  DollarSign,
  ShoppingCart,
  Plane,
  Egg,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import logoGSA from "@/assets/logo-gsa.png";

interface ModuleCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  color: string;
  systemAvailable: boolean;
}

const modules: ModuleCard[] = [
  {
    id: 'lotes',
    title: 'Meus Lotes',
    description: 'Abertura e acompanhamento de lotes ativos',
    icon: Bird,
    path: '/meus-lotes',
    color: 'from-primary to-primary/70',
    systemAvailable: true,
  },
  {
    id: 'gestao-campo',
    title: 'Gestão de Campo',
    description: 'Cadastro de áreas, núcleos e galpões',
    icon: Map,
    path: '/gestao-campo',
    color: 'from-emerald-500 to-emerald-700',
    systemAvailable: true,
  },
  {
    id: 'gestao-consumo',
    title: 'Gestão de Consumo',
    description: 'Solicitação e controle de ração',
    icon: Package,
    path: '/gestao-consumo',
    color: 'from-orange-500 to-orange-700',
    systemAvailable: true,
  },
  {
    id: 'logistica',
    title: 'Logística',
    description: 'Rastreamento de entregas e gestão de frota',
    icon: Truck,
    path: '/logistica',
    color: 'from-blue-500 to-blue-700',
    systemAvailable: false,
  },
  {
    id: 'veterinario',
    title: 'Veterinário',
    description: 'Acompanhamento técnico e análises',
    icon: Stethoscope,
    path: '/veterinario',
    color: 'from-purple-500 to-purple-700',
    systemAvailable: true,
  },
  {
    id: 'fabrica-racao',
    title: 'Fábrica de Ração',
    description: 'Gestão de compras e estoque',
    icon: Factory,
    path: '/fabrica-racao',
    color: 'from-amber-500 to-amber-700',
    systemAvailable: true,
  },
  {
    id: 'estoque-ovos',
    title: 'Estoque de Ovos',
    description: 'Gestão FIFO e rastreabilidade de ovos',
    icon: Egg,
    path: '/estoque-ovos',
    color: 'from-amber-400 to-amber-600',
    systemAvailable: true,
  },
  {
    id: 'apanha',
    title: 'Apanha',
    description: 'Gestão de turmas de carregamento',
    icon: Users,
    path: '/apanha',
    color: 'from-rose-500 to-rose-700',
    systemAvailable: false,
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    description: 'Dashboard, fluxo de caixa e relatórios',
    icon: DollarSign,
    path: '/financeiro',
    color: 'from-teal-500 to-teal-700',
    systemAvailable: true,
  },
  {
    id: 'comercial',
    title: 'Comercial',
    description: 'Vendas, pedidos e contas a receber',
    icon: ShoppingCart,
    path: '/comercial',
    color: 'from-indigo-500 to-indigo-700',
    systemAvailable: true,
  },
  {
    id: 'cockpit',
    title: 'Cockpit Thoth',
    description: 'Painel de controle integrado',
    icon: Plane,
    path: '/cockpit',
    color: 'from-slate-600 to-slate-800',
    systemAvailable: true,
  },
];

export default function Home() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { accessibleModules, loading: modulesLoading } = useModuleAccess();

  const handleModuleClick = (module: ModuleCard) => {
    if (!module.systemAvailable) return;
    
    const hasAccess = accessibleModules.some(m => m.codigo === module.id);
    if (hasAccess) {
      navigate(module.path);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getModuleStatus = (module: ModuleCard): 'available' | 'no-permission' | 'coming-soon' => {
    if (!module.systemAvailable) return 'coming-soon';
    const hasAccess = accessibleModules.some(m => m.codigo === module.id);
    return hasAccess ? 'available' : 'no-permission';
  };

  const getModuleLevel = (moduleId: string): string | null => {
    const module = accessibleModules.find(m => m.codigo === moduleId);
    return module?.nivel_acesso || null;
  };

  const getLevelBadge = (level: string) => {
    const labels: Record<string, { text: string; className: string }> = {
      view: { text: 'Ver', className: 'bg-blue-500/10 text-blue-500' },
      edit: { text: 'Editar', className: 'bg-amber-500/10 text-amber-500' },
      full: { text: 'Total', className: 'bg-emerald-500/10 text-emerald-500' },
    };
    return labels[level] || null;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoGSA} alt="GSA Tibiri" className="w-10 h-10 rounded-lg" />
            <span className="text-xl font-bold text-foreground">
              GSA <span className="text-[#2E7D32]">Tibiri</span>
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground hidden sm:block">
              {user?.user_metadata?.full_name || user?.email}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/configuracoes')}
              className="text-muted-foreground hover:text-foreground"
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Olá, {user?.user_metadata?.full_name?.split(' ')[0] || 'Produtor'}!
          </h1>
          <p className="text-muted-foreground">
            Selecione um módulo para começar
          </p>
        </div>

        {modulesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-card border-border">
                <CardHeader className="pb-3">
                  <Skeleton className="w-12 h-12 rounded-xl mb-3" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48 mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module) => {
              const status = getModuleStatus(module);
              const isClickable = status === 'available';
              const level = getModuleLevel(module.id);
              const levelBadge = level ? getLevelBadge(level) : null;
              
              return (
                <Card 
                  key={module.id}
                  className={`bg-card border-border transition-all duration-300 ${
                    isClickable 
                      ? 'cursor-pointer hover:shadow-card-hover hover:scale-[1.02]' 
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                  onClick={() => isClickable && handleModuleClick(module)}
                >
                  <CardHeader className="pb-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center mb-3 relative`}>
                      <module.icon className="w-6 h-6 text-white" />
                      {status === 'no-permission' && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                          <Lock className="w-3 h-3 text-destructive-foreground" />
                        </div>
                      )}
                    </div>
                    <CardTitle className="text-foreground flex items-center gap-2 flex-wrap">
                      {module.title}
                      {status === 'coming-soon' && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                          Em breve
                        </span>
                      )}
                      {status === 'no-permission' && (
                        <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                          Sem acesso
                        </span>
                      )}
                      {status === 'available' && levelBadge && (
                        <span className={`text-xs px-2 py-0.5 rounded ${levelBadge.className}`}>
                          {levelBadge.text}
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>{module.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        )}

      </main>
    </div>
  );
}
