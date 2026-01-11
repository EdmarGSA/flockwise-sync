import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import MetasVetTab from './MetasVetTab';
import MetasPosturaVetTab from './MetasPosturaVetTab';

interface MetasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loteId: string;
  lote: any;
  isPostura: boolean;
}

export default function MetasDialog({ open, onOpenChange, loteId, lote, isPostura }: MetasDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full w-full h-[95vh] p-0 gap-0 sm:rounded-t-xl rounded-none">
        <DialogHeader className="px-4 py-3 border-b border-border shrink-0">
          <DialogTitle className="text-lg">Metas</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 h-[calc(95vh-60px)]">
          <div className="p-4">
            {isPostura ? (
              <MetasPosturaVetTab loteId={loteId} lote={lote} />
            ) : (
              <MetasVetTab loteId={loteId} lote={lote} />
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
