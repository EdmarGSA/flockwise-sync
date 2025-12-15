import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ShoppingCart, DollarSign, Tag, FileText } from 'lucide-react';
import PedidosTable from '@/components/comercial/PedidosTable';
import TabelasPrecosTab from '@/components/comercial/TabelasPrecosTab';
import ContasReceberTable from '@/components/comercial/ContasReceberTable';

export default function Comercial() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('pedidos');

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Comercial</h1>
              <p className="text-sm text-muted-foreground">Pedidos, preços e faturamento</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pt-28">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="pedidos" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Pedidos</span>
            </TabsTrigger>
            <TabsTrigger value="tabelas-preco" className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              <span className="hidden sm:inline">Tabelas de Preço</span>
            </TabsTrigger>
            <TabsTrigger value="contas-receber" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Contas a Receber</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pedidos">
            <PedidosTable integradoId={user.id} />
          </TabsContent>

          <TabsContent value="tabelas-preco">
            <TabelasPrecosTab integradoId={user.id} />
          </TabsContent>

          <TabsContent value="contas-receber">
            <ContasReceberTable integradoId={user.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
