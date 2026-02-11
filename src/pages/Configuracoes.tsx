import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Package, ArrowLeft, Settings, Layers, Target, Handshake, Percent, Warehouse, Lock, Bird, Egg, Container, Gauge, Palette, Sun, TreePine } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const Configuracoes = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  const menuItems = [
    {
      title: "Organização",
      description: "Cadastro e configuração da empresa",
      icon: Building2,
      path: "/configuracoes/organizacao"
    },
    {
      title: "Membros",
      description: "Gerenciar usuários do sistema",
      icon: Users,
      path: "/configuracoes/membros"
    },
    {
      title: "Produtos",
      description: "Cadastro completo de produtos e kardex",
      icon: Package,
      path: "/configuracoes/produtos"
    },
    {
      title: "Grupos de Animais",
      description: "Grupos e fases de produção animal",
      icon: Layers,
      path: "/configuracoes/grupos-animal"
    },
    {
      title: "Meta de Peso",
      description: "Multiplicadores e tabela de desempenho",
      icon: Target,
      path: "/configuracoes/desempenho-aves"
    },
    {
      title: "Fornecedores e Clientes",
      description: "Cadastro de parceiros comerciais",
      icon: Handshake,
      path: "/configuracoes/parceiros"
    },
    {
      title: "Mortalidade Média",
      description: "Percentuais de referência por semana",
      icon: Percent,
      path: "/configuracoes/mortalidade-media"
    },
    {
      title: "Cadastro de Silos",
      description: "Especificações e capacidades dos silos",
      icon: Container,
      path: "/configuracoes/silos"
    },
    {
      title: "Nível de Silo",
      description: "Thresholds de alerta e estoque sugerido",
      icon: Warehouse,
      path: "/configuracoes/silo"
    },
    {
      title: "Fechamento de Lote",
      description: "Constante de ajuste de conversão alimentar",
      icon: Lock,
      path: "/configuracoes/fechamento"
    },
    {
      title: "Metas Zootécnicas",
      description: "Mortalidade, conversão alimentar e consumo",
      icon: Gauge,
      path: "/configuracoes/metas-zootecnicas"
    },
    {
      title: "Produtos de Ovos",
      description: "Catálogo comercial de ovos",
      icon: Egg,
      path: "/configuracoes/produtos-ovos"
    },
    {
      title: "Produtos Animais",
      description: "Aves vivas, ovos, suínos e outros",
      icon: Bird,
      path: "/configuracoes/produtos-animais"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-3 sm:px-6 pt-20 sm:pt-24 pb-12">
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')} className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-foreground">Configurações</h1>
              <p className="text-sm sm:text-base text-muted-foreground hidden sm:block">Gerencie cadastros e configurações</p>
            </div>
          </div>
        </div>

        {/* Theme Selector */}
        <Card className="mb-6 sm:mb-8">
          <CardHeader className="p-4 sm:p-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <Palette className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <CardTitle className="text-base sm:text-lg">Aparência</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Tema visual do sistema</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <button
                onClick={() => setTheme("light")}
                className={`relative rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-all ${theme === "light" ? "border-primary shadow-md" : "border-border hover:border-primary/40"}`}
              >
                <div className="w-full h-16 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                  <Sun className="w-6 h-6 text-yellow-500" />
                </div>
                <span className="text-sm font-medium text-foreground">White</span>
                {theme === "light" && <span className="text-[10px] text-primary font-semibold">ATIVO</span>}
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`relative rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-all ${theme === "dark" ? "border-primary shadow-md" : "border-border hover:border-primary/40"}`}
              >
                <div className="w-full h-16 rounded-lg bg-[hsl(160,30%,6%)] border border-[hsl(160,20%,18%)] flex items-center justify-center">
                  <TreePine className="w-6 h-6 text-emerald-400" />
                </div>
                <span className="text-sm font-medium text-foreground">Dark Green</span>
                {theme === "dark" && <span className="text-[10px] text-primary font-semibold">ATIVO</span>}
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {menuItems.map((item) => (
            <Card 
              key={item.path}
              className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg"
              onClick={() => navigate(item.path)}
            >
              <CardHeader className="p-4 sm:p-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <CardTitle className="text-base sm:text-lg">{item.title}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Configuracoes;
