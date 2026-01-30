import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { CategoriasSidebar } from './CategoriasSidebar';
import { ProdutoCatalogo } from '@/hooks/useFornecedorData';

interface CategoriasSheetProps {
  open: boolean;
  onClose: () => void;
  produtos: ProdutoCatalogo[];
  categoriaAtiva: string | null;
  onSelectCategoria: (categoria: string | null) => void;
}

export const CategoriasSheet = ({
  open,
  onClose,
  produtos,
  categoriaAtiva,
  onSelectCategoria
}: CategoriasSheetProps) => {
  const handleSelectCategoria = (categoria: string | null) => {
    onSelectCategoria(categoria);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Categorias</SheetTitle>
        </SheetHeader>
        <div className="p-4">
          <CategoriasSidebar
            produtos={produtos}
            categoriaAtiva={categoriaAtiva}
            onSelectCategoria={handleSelectCategoria}
            isInsideSheet
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};
