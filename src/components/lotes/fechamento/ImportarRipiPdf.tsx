import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileUp, Loader2, AlertTriangle, FileText } from 'lucide-react';
import {
  RipiExtracao,
  normalizarExtracao,
  conferirExtracao,
  AvisoConferencia,
} from '@/lib/utils/ripiImport';
import { formatNum } from '@/lib/utils/fechamentoRipi';

export type BlocoRipi = 'abate' | 'cargas' | 'condenacoes' | 'partilha' | 'descontos';

interface Props {
  loteId: string;
  integradoId: string;
  onAplicar: (dados: RipiExtracao, blocos: BlocoRipi[], arquivoPath: string | null) => void;
}

const MAX_MB = 10;

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const linha = (label: string, valor: string | number | null | undefined) =>
  valor === null || valor === undefined || valor === '' ? null : { label, valor: String(valor) };

export function ImportarRipiPdf({ loteId, integradoId, onAplicar }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [dados, setDados] = useState<RipiExtracao | null>(null);
  const [avisos, setAvisos] = useState<AvisoConferencia[]>([]);
  const [arquivoPath, setArquivoPath] = useState<string | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState<string>('');
  const [blocos, setBlocos] = useState<Record<BlocoRipi, boolean>>({
    abate: true,
    cargas: true,
    condenacoes: true,
    partilha: true,
    descontos: true,
  });

  const processar = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Envie um arquivo PDF do RIPI');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`O PDF precisa ter até ${MAX_MB} MB`);
      return;
    }

    setEnviando(true);
    setNomeArquivo(file.name);
    try {
      const base64 = await toBase64(file);

      const path = `${integradoId}/${loteId}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
      const { error: upErr } = await supabase.storage.from('ripi-pdfs').upload(path, file, {
        contentType: 'application/pdf',
        upsert: false,
      });
      if (upErr) {
        console.error('Falha ao guardar o PDF', upErr);
        toast.warning('O PDF não pôde ser arquivado, mas seguimos com a leitura');
      }

      const { data, error } = await supabase.functions.invoke('importar-ripi', {
        body: { fileBase64: base64, filename: file.name, mimeType: 'application/pdf', loteId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const extraido = normalizarExtracao(data?.dados ?? {});
      setDados(extraido);
      setAvisos(conferirExtracao(extraido));
      setArquivoPath(upErr ? null : path);
    } catch (e: any) {
      console.error('Erro ao importar RIPI', e);
      toast.error(e?.message || 'Não foi possível ler o PDF do RIPI');
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const confianca = (campo: string) => dados?.confianca?.[campo];

  const itensAbate = dados
    ? [
        linha('Lote da integradora', dados.lote_integradora),
        linha('Abatedouro', dados.abatedouro),
        linha('Data do abate', dados.data_abate),
        linha('Hora média', dados.hora_media_abate),
        linha('Idade (dias)', dados.idade_abate),
        linha('Tipo de produto', dados.tipo_produto),
        linha('Técnico', dados.tecnico_responsavel),
        linha('Aves alojadas', dados.aves_alojadas),
        linha('Aves abatidas', dados.aves_abatidas),
        linha('Peso total (kg)', dados.peso_total_kg && formatNum(dados.peso_total_kg)),
        linha('Peso médio (kg)', dados.peso_medio_kg && formatNum(dados.peso_medio_kg, 3)),
        linha('Peso projetado (kg)', dados.peso_projetado_kg && formatNum(dados.peso_projetado_kg, 3)),
        linha('Ração consumida (kg)', dados.consumo_total_racao_kg && formatNum(dados.consumo_total_racao_kg)),
        linha('Conversão prevista', dados.conversao_prevista && formatNum(dados.conversao_prevista, 4)),
        linha('Mortalidade prevista (%)', dados.mortalidade_prevista && formatNum(dados.mortalidade_prevista)),
      ].filter(Boolean)
    : [];

  const itensPartilha = dados
    ? [
        linha('Preço do kg', dados.preco_kg_frango && formatNum(dados.preco_kg_frango, 4)),
        linha('Valor da ração', dados.valor_racao && formatNum(dados.valor_racao, 4)),
        linha('Percentual básico (%)', dados.percentual_basico && formatNum(dados.percentual_basico, 3)),
        linha('Aval. conversão (%)', dados.aval_conversao && formatNum(dados.aval_conversao, 3)),
        linha('Aval. condenação (%)', dados.aval_condenacao && formatNum(dados.aval_condenacao, 3)),
        linha('Aval. calo de pata (%)', dados.aval_calo_pata && formatNum(dados.aval_calo_pata, 3)),
        linha('Aval. check-list (%)', dados.aval_checklist && formatNum(dados.aval_checklist, 3)),
        linha('Resultado bruto (%)', dados.resultado_bruto_pc && formatNum(dados.resultado_bruto_pc, 3)),
      ].filter(Boolean)
    : [];

  const aplicar = () => {
    if (!dados) return;
    const escolhidos = (Object.keys(blocos) as BlocoRipi[]).filter((b) => blocos[b]);
    onAplicar(dados, escolhidos, arquivoPath);
    setDados(null);
    toast.success('Dados do RIPI aplicados ao formulário. Confira antes de salvar.');
  };

  return (
    <>
      <Card
        className={`border-dashed ${arrastando ? 'border-primary bg-muted/40' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          const file = e.dataTransfer.files?.[0];
          if (file) processar(file);
        }}
      >
        <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-start gap-3 flex-1">
            <FileUp className="w-5 h-5 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Importar RIPI (PDF)</p>
              <p className="text-xs text-muted-foreground">
                Arraste o demonstrativo do frigorífico ou selecione o arquivo. Nada é salvo antes da sua conferência.
              </p>
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processar(file);
            }}
          />
          <Button type="button" variant="outline" disabled={enviando} onClick={() => inputRef.current?.click()}>
            {enviando ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Lendo PDF...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" /> Selecionar PDF
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={!!dados} onOpenChange={(o) => !o && setDados(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Conferência da importação</DialogTitle>
            <DialogDescription>
              {nomeArquivo} — selecione os blocos que devem preencher o formulário. Nada é gravado agora.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-3">
            <div className="space-y-4">
              {avisos.length > 0 && (
                <Card className="border-warning">
                  <CardContent className="py-3 space-y-1">
                    {avisos.map((a, i) => (
                      <p key={i} className="text-xs flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-warning shrink-0" />
                        <span>
                          <strong>{a.bloco}:</strong> {a.mensagem}
                        </span>
                      </p>
                    ))}
                  </CardContent>
                </Card>
              )}

              <BlocoConferencia
                titulo="Abate e desempenho"
                marcado={blocos.abate}
                onToggle={(v) => setBlocos((p) => ({ ...p, abate: v }))}
                vazio={itensAbate.length === 0}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                  {itensAbate.map((i) => (
                    <ItemLido key={i!.label} label={i!.label} valor={i!.valor} confianca={confianca(i!.label)} />
                  ))}
                </div>
              </BlocoConferencia>

              <BlocoConferencia
                titulo={`Cargas (${dados?.cargas?.length ?? 0})`}
                marcado={blocos.cargas}
                onToggle={(v) => setBlocos((p) => ({ ...p, cargas: v }))}
                vazio={!dados?.cargas?.length}
              >
                <div className="space-y-1">
                  {dados?.cargas?.map((c, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      {c.data_abate ?? '—'} · {c.quantidade ?? 0} aves · {formatNum(c.peso_total_kg ?? 0)} kg
                      {c.nota_produtor ? ` · NF ${c.nota_produtor}` : ''}
                    </p>
                  ))}
                </div>
              </BlocoConferencia>

              <BlocoConferencia
                titulo={`Condenações SIF (${dados?.condenacoes?.length ?? 0})`}
                marcado={blocos.condenacoes}
                onToggle={(v) => setBlocos((p) => ({ ...p, condenacoes: v }))}
                vazio={!dados?.condenacoes?.length}
              >
                <div className="space-y-1">
                  {dados?.condenacoes?.map((c, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      <Badge variant="outline" className="mr-2">
                        {c.tipo}
                      </Badge>
                      {c.codigo ?? '—'} {c.descricao ?? ''} · {c.quantidade ?? 0}
                    </p>
                  ))}
                </div>
              </BlocoConferencia>

              <BlocoConferencia
                titulo="Partilha do integrado"
                marcado={blocos.partilha}
                onToggle={(v) => setBlocos((p) => ({ ...p, partilha: v }))}
                vazio={itensPartilha.length === 0}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                  {itensPartilha.map((i) => (
                    <ItemLido key={i!.label} label={i!.label} valor={i!.valor} confianca={confianca(i!.label)} />
                  ))}
                </div>
              </BlocoConferencia>

              <BlocoConferencia
                titulo={`Descontos e créditos (${dados?.descontos?.length ?? 0})`}
                marcado={blocos.descontos}
                onToggle={(v) => setBlocos((p) => ({ ...p, descontos: v }))}
                vazio={!dados?.descontos?.length}
              >
                <div className="space-y-1">
                  {dados?.descontos?.map((d, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      {d.descricao ?? '—'} · débito {formatNum(d.debito ?? 0)} · crédito {formatNum(d.credito ?? 0)}
                    </p>
                  ))}
                </div>
              </BlocoConferencia>

              {dados?.observacoes && (
                <p className="text-xs text-muted-foreground">Observações da leitura: {dados.observacoes}</p>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDados(null)}>
              Descartar
            </Button>
            <Button onClick={aplicar}>Aplicar ao formulário</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BlocoConferencia({
  titulo,
  marcado,
  onToggle,
  vazio,
  children,
}: {
  titulo: string;
  marcado: boolean;
  onToggle: (v: boolean) => void;
  vazio: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="py-3 space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Checkbox checked={marcado && !vazio} disabled={vazio} onCheckedChange={(v) => onToggle(!!v)} />
          {titulo}
          {vazio && <span className="text-xs font-normal text-muted-foreground">— nada encontrado no PDF</span>}
        </label>
        {!vazio && children}
      </CardContent>
    </Card>
  );
}

function ItemLido({ label, valor, confianca }: { label: string; valor: string; confianca?: string }) {
  const baixa = confianca === 'baixa' || confianca === 'media';
  return (
    <div className="flex items-center justify-between text-xs gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={baixa ? 'font-medium text-warning' : 'font-medium'}>{valor}</span>
    </div>
  );
}
