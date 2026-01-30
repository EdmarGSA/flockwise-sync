import { useNavigate } from 'react-router-dom';
import { ClipboardList, RefreshCw, Settings } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface MenuVendasSheetProps {
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export const MenuVendasSheet = ({
  open,
  onClose,
  onRefresh
}: MenuVendasSheetProps) => {
  const navigate = useNavigate();

  const handleNavegar = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleRefresh = () => {
    onRefresh?.();
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[280px]">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-12"
            onClick={() => handleNavegar('/meus-pedidos-fornecedor')}
          >
            <ClipboardList className="h-5 w-5" />
            <span>Meus Pedidos</span>
          </Button>

          <Separator />

          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-12"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-5 w-5" />
            <span>Atualizar Produtos</span>
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-12"
            onClick={() => handleNavegar('/portal-fornecedor')}
          >
            <Settings className="h-5 w-5" />
            <span>Configurações</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
