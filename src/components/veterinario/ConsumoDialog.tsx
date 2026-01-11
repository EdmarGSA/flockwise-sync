import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import ConsumoVetTab from './ConsumoVetTab';

interface ConsumoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loteId: string;
}

export default function ConsumoDialog({ open, onOpenChange, loteId }: ConsumoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full w-full h-[95vh] p-0 gap-0 sm:rounded-t-xl rounded-none">
        <DialogHeader className="px-4 py-3 border-b border-border shrink-0">
          <DialogTitle className="text-lg">Consumo</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 h-[calc(95vh-60px)]">
          <div className="p-4">
            <ConsumoVetTab loteId={loteId} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
