import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Bird, 
  Truck, 
  Stethoscope, 
  Factory, 
  Users, 
  Map, 
  BarChart3,
  AlertTriangle,
  LogOut,
  Settings,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModuleCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  color: string;
  available: boolean;
}

const modules: ModuleCard[] = [
  {
    id: 'lotes',
    title: 'Meus Lotes',
    description: 'Abertura e acompanhamento de lotes ativos',
    icon: Bird,
    path: '/meus-lotes',
    color: 'from-primary to-primary/70',
    available: true,
  },
  {
    id: 'gestao-campo',
    title: 'Gestão de Campo',
    description: 'Cadastro de áreas, núcleos e galpões',
    icon: Map,
    path: '/gestao-campo',
    color: 'from-emerald-500 to-emerald-700',
    available: true,
  },
  {
    id: 'gestao-consumo',
    title: 'Gestão de Consumo',
    description: 'Solicitação e controle de ração',
    icon: Package,
    path: '/gestao-consumo',
    color: 'from-orange-500 to-orange-700',
    available: true,
  },
  {
    id: 'logistica',
    title: 'Logística',
    description: 'Rastreamento de entregas e gestão de frota',
    icon: Truck,
    path: '/logistica',
    color: 'from-blue-500 to-blue-700',
    available: false,
  },
  {
    id: 'veterinario',
    title: 'Veterinário',
    description: 'Acompanhamento técnico e análises',
    icon: Stethoscope,
    path: '/veterinario',
    color: 'from-purple-500 to-purple-700',
    available: true,
  },
  {
    id: 'fabrica-racao',
    title: 'Fábrica de Ração',
    description: 'Gestão de compras e estoque',
    icon: Factory,
    path: '/fabrica-racao',
    color: 'from-amber-500 to-amber-700',
    available: true,
  },
  {
    id: 'apanha',
    title: 'Apanha',
    description: 'Gestão de turmas de carregamento',
    icon: Users,
    path: '/apanha',
    color: 'from-rose-500 to-rose-700',
    available: false,
  },
];

export default function Home() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleModuleClick = (module: ModuleCard) => {
    if (module.available) {
      navigate(module.path);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <Bird className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">
              Avi<span className="text-primary">Gestão</span>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <Card 
              key={module.id}
              className={`bg-card border-border cursor-pointer transition-all duration-300 hover:shadow-card-hover hover:scale-[1.02] ${
                !module.available ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={() => handleModuleClick(module)}
            >
              <CardHeader className="pb-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center mb-3`}>
                  <module.icon className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-foreground flex items-center gap-2">
                  {module.title}
                  {!module.available && (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                      Em breve
                    </span>
                  )}
                </CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Resumo Rápido
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Lotes Ativos</p>
                    <p className="text-2xl font-bold text-foreground">0</p>
                  </div>
                  <Bird className="w-8 h-8 text-primary/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Núcleos</p>
                    <p className="text-2xl font-bold text-foreground">0</p>
                  </div>
                  <Map className="w-8 h-8 text-emerald-500/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Galpões</p>
                    <p className="text-2xl font-bold text-foreground">0</p>
                  </div>
                  <Factory className="w-8 h-8 text-amber-500/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Alertas</p>
                    <p className="text-2xl font-bold text-foreground">0</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-rose-500/50" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
