import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import MetasVetTab, { type PesagemData } from './MetasVetTab';
import MetasPosturaVetTab from './MetasPosturaVetTab';
import PesagemDetalheDialog from './PesagemDetalheDialog';

interface MetasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loteId: string;
  lote: any;
  isPostura: boolean;
}

interface PesagemSelecionada {
  dataPesagem: string;
  dia: number;
  pesoReferencia?: number;
}

export default function MetasDialog({ open, onOpenChange, loteId, lote, isPostura }: MetasDialogProps) {
  const [pesagemSelecionada, setPesagemSelecionada] = useState<PesagemSelecionada | null>(null);

  const handlePesagemClick = (pesagem: PesagemData, pesoReferencia?: number) => {
    setPesagemSelecionada({
      dataPesagem: pesagem.data_pesagem,
      dia: pesagem.dia,
      pesoReferencia
    });
  };

  return (
    <>
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
                <MetasVetTab loteId={loteId} lote={lote} onPesagemClick={handlePesagemClick} />
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {pesagemSelecionada && (
        <PesagemDetalheDialog
          open={!!pesagemSelecionada}
          onOpenChange={(open) => !open && setPesagemSelecionada(null)}
          dataPesagem={pesagemSelecionada.dataPesagem}
          loteId={loteId}
          dia={pesagemSelecionada.dia}
          pesoReferencia={pesagemSelecionada.pesoReferencia}
        />
      )}
    </>
  );
}
