import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Package, ArrowLeft, Settings, Layers, Target, Handshake, Percent, Warehouse, Lock } from "lucide-react";

const Configuracoes = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

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
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 pt-24 pb-12">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Settings className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
              <p className="text-muted-foreground">Gerencie cadastros e configurações do sistema</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <Card 
              key={item.path}
              className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg"
              onClick={() => navigate(item.path)}
            >
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Configuracoes;
