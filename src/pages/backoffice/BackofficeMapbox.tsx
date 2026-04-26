import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Search,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  Save,
  ExternalLink,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  Globe2,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrgRow {
  integrado_id: string;
  nome: string;
  total_usuarios: number;
  // mapbox config
  config_id: string | null;
  public_token: string | null;
  default_lat: number | null;
  default_lng: number | null;
  default_zoom: number | null;
  updated_at: string | null;
  updated_by_name: string | null;
  // local
  test_status: 'idle' | 'testing' | 'ok' | 'fail';
}

function maskToken(token: string | null | undefined) {
  if (!token) return '';
  if (token.length <= 14) return token;
  return `${token.slice(0, 8)}••••••${token.slice(-6)}`;
}

export default function BackofficeMapbox() {
  const [rows, setRows] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'configured' | 'missing'>('all');

  // Edit dialog
  const [editing, setEditing] = useState<OrgRow | null>(null);
  const [editToken, setEditToken] = useState('');
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');
  const [editZoom, setEditZoom] = useState('12');
  const [showEditToken, setShowEditToken] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [testingEdit, setTestingEdit] = useState(false);
  const [editTestResult, setEditTestResult] = useState<'ok' | 'fail' | null>(
    null,
  );

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [profilesRes, configsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, integrado_id, created_at'),
        supabase
          .from('mapbox_config')
          .select(
            'id, integrado_id, public_token, default_lat, default_lng, default_zoom, updated_at, updated_by',
          ),
      ]);

      const profiles = profilesRes.data || [];
      const configs = configsRes.data || [];

      // Build name lookup
      const nameById = new Map<string, string>();
      profiles.forEach((p) => {
        if (p.full_name) nameById.set(p.id, p.full_name);
      });

      // Aggregate orgs
      const orgs = new Map<
        string,
        { nome: string; total_usuarios: number }
      >();
      profiles.forEach((p) => {
        const iid = p.integrado_id || p.id;
        if (!orgs.has(iid)) {
          orgs.set(iid, {
            nome: nameById.get(iid) || iid.slice(0, 8),
            total_usuarios: 0,
          });
        }
        const o = orgs.get(iid)!;
        o.total_usuarios++;
        if (p.id === iid && p.full_name) o.nome = p.full_name;
      });

      const configByOrg = new Map(configs.map((c) => [c.integrado_id, c]));

      const result: OrgRow[] = Array.from(orgs.entries()).map(([iid, o]) => {
        const cfg = configByOrg.get(iid);
        return {
          integrado_id: iid,
          nome: o.nome,
          total_usuarios: o.total_usuarios,
          config_id: cfg?.id || null,
          public_token: cfg?.public_token || null,
          default_lat: cfg?.default_lat ?? null,
          default_lng: cfg?.default_lng ?? null,
          default_zoom: cfg?.default_zoom ?? null,
          updated_at: cfg?.updated_at || null,
          updated_by_name: cfg?.updated_by
            ? nameById.get(cfg.updated_by) || null
            : null,
          test_status: 'idle',
        };
      });

      result.sort((a, b) => {
        // Sem token primeiro, depois alfabético
        if (!!a.public_token === !!b.public_token) {
          return a.nome.localeCompare(b.nome);
        }
        return a.public_token ? 1 : -1;
      });

      setRows(result);
    } catch (err: any) {
      toast.error('Erro ao carregar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter === 'configured' && !r.public_token) return false;
      if (filter === 'missing' && r.public_token) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          r.nome.toLowerCase().includes(s) ||
          r.integrado_id.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [rows, filter, search]);

  const stats = useMemo(() => {
    const total = rows.length;
    const configured = rows.filter((r) => r.public_token).length;
    return {
      total,
      configured,
      missing: total - configured,
      pct: total ? Math.round((configured / total) * 100) : 0,
    };
  }, [rows]);

  const testToken = async (token: string): Promise<'ok' | 'fail'> => {
    try {
      const r = await fetch(
        `https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=${encodeURIComponent(
          token,
        )}`,
      );
      return r.status === 200 ? 'ok' : 'fail';
    } catch {
      return 'fail';
    }
  };

  const handleTestRow = async (row: OrgRow) => {
    if (!row.public_token) return;
    setRows((prev) =>
      prev.map((r) =>
        r.integrado_id === row.integrado_id ? { ...r, test_status: 'testing' } : r,
      ),
    );
    const result = await testToken(row.public_token);
    setRows((prev) =>
      prev.map((r) =>
        r.integrado_id === row.integrado_id ? { ...r, test_status: result } : r,
      ),
    );
    if (result === 'ok') toast.success(`Token de "${row.nome}" válido`);
    else toast.error(`Token de "${row.nome}" inválido ou expirado`);
  };

  const handleTestAll = async () => {
    const targets = rows.filter((r) => r.public_token);
    if (targets.length === 0) return;
    toast.info(`Testando ${targets.length} tokens...`);
    setRows((prev) =>
      prev.map((r) => (r.public_token ? { ...r, test_status: 'testing' } : r)),
    );
    const updated = await Promise.all(
      targets.map(async (r) => ({
        id: r.integrado_id,
        status: await testToken(r.public_token!),
      })),
    );
    setRows((prev) =>
      prev.map((r) => {
        const found = updated.find((u) => u.id === r.integrado_id);
        return found ? { ...r, test_status: found.status } : r;
      }),
    );
    const failures = updated.filter((u) => u.status === 'fail').length;
    if (failures === 0) toast.success('Todos os tokens válidos');
    else toast.error(`${failures} token(s) com problema`);
  };

  const openEdit = (row: OrgRow) => {
    setEditing(row);
    setEditToken(row.public_token || '');
    setEditLat(row.default_lat?.toString() || '');
    setEditLng(row.default_lng?.toString() || '');
    setEditZoom(row.default_zoom?.toString() || '12');
    setShowEditToken(false);
    setEditTestResult(null);
  };

  const handleEditSave = async () => {
    if (!editing) return;
    if (editToken && !editToken.startsWith('pk.')) {
      toast.error('Token deve começar com "pk."');
      return;
    }
    setSavingEdit(true);
    const payload = {
      integrado_id: editing.integrado_id,
      public_token: editToken.trim(),
      default_lat: editLat ? parseFloat(editLat) : null,
      default_lng: editLng ? parseFloat(editLng) : null,
      default_zoom: editZoom ? parseInt(editZoom) : 12,
    };
    const { error } = await supabase
      .from('mapbox_config')
      .upsert(payload, { onConflict: 'integrado_id' });
    if (error) toast.error('Erro: ' + error.message);
    else {
      toast.success('Configuração salva');
      setEditing(null);
      fetchAll();
    }
    setSavingEdit(false);
  };

  const handleEditTest = async () => {
    if (!editToken || !editToken.startsWith('pk.')) {
      toast.error('Informe um token válido');
      return;
    }
    setTestingEdit(true);
    setEditTestResult(null);
    const result = await testToken(editToken);
    setEditTestResult(result);
    if (result === 'ok') toast.success('Token válido');
    else toast.error('Token inválido');
    setTestingEdit(false);
  };

  const handleDelete = async (row: OrgRow) => {
    if (!row.config_id) return;
    if (
      !confirm(
        `Remover token Mapbox de "${row.nome}"?\nA organização perderá acesso ao mapeamento até reconfigurar.`,
      )
    )
      return;
    const { error } = await supabase
      .from('mapbox_config')
      .delete()
      .eq('id', row.config_id);
    if (error) toast.error('Erro: ' + error.message);
    else {
      toast.success('Token removido');
      fetchAll();
    }
  };

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('ID copiado');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Globe2 className="w-6 h-6 text-primary" />
            Mapbox por Organização
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão centralizada dos tokens Mapbox de todas as organizações.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleTestAll}
            disabled={loading || stats.configured === 0}
            className="gap-2"
          >
            <ShieldCheck className="h-4 w-4" />
            Testar todos ({stats.configured})
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total de organizações</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Com token</p>
            <p className="text-2xl font-bold mt-1 text-green-600">
              {stats.configured}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Sem token</p>
            <p className="text-2xl font-bold mt-1 text-amber-600">
              {stats.missing}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">% Cobertura</p>
            <p className="text-2xl font-bold mt-1">{stats.pct}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" /> Organizações
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={filter === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilter('all')}
                >
                  Todas
                </Button>
                <Button
                  size="sm"
                  variant={filter === 'configured' ? 'default' : 'outline'}
                  onClick={() => setFilter('configured')}
                >
                  Configuradas
                </Button>
                <Button
                  size="sm"
                  variant={filter === 'missing' ? 'default' : 'outline'}
                  onClick={() => setFilter('missing')}
                >
                  Sem token
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar nome ou ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 w-56"
                />
              </div>
            </div>
          </div>
          <CardDescription>
            Clique em <strong>Editar</strong> para definir/alterar o token de uma
            organização ou em <strong>Testar</strong> para verificar contra a API
            Mapbox.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma organização encontrada com os filtros atuais.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organização</TableHead>
                    <TableHead className="hidden md:table-cell">Usuários</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Token</TableHead>
                    <TableHead className="hidden xl:table-cell">
                      Atualizado
                    </TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.integrado_id}>
                      <TableCell>
                        <div className="font-medium">{row.nome}</div>
                        <button
                          onClick={() => copyId(row.integrado_id)}
                          className="text-xs text-muted-foreground hover:text-primary font-mono inline-flex items-center gap-1"
                          title="Copiar ID"
                        >
                          {row.integrado_id.slice(0, 8)}…
                          <Copy className="h-3 w-3" />
                        </button>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">{row.total_usuarios}</Badge>
                      </TableCell>
                      <TableCell>
                        {!row.public_token ? (
                          <Badge
                            variant="outline"
                            className="gap-1 border-amber-500/40 text-amber-700 dark:text-amber-400"
                          >
                            <AlertTriangle className="h-3 w-3" /> Sem token
                          </Badge>
                        ) : row.test_status === 'testing' ? (
                          <Badge variant="outline" className="gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />{' '}
                            Testando
                          </Badge>
                        ) : row.test_status === 'ok' ? (
                          <Badge className="gap-1 bg-green-600 hover:bg-green-700">
                            <CheckCircle2 className="h-3 w-3" /> Válido
                          </Badge>
                        ) : row.test_status === 'fail' ? (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" /> Inválido
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Configurado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <code className="text-xs font-mono text-muted-foreground">
                          {row.public_token ? maskToken(row.public_token) : '—'}
                        </code>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                        {row.updated_at ? (
                          <>
                            {format(new Date(row.updated_at), 'dd/MM/yy HH:mm', {
                              locale: ptBR,
                            })}
                            {row.updated_by_name && (
                              <div className="text-[10px]">
                                por {row.updated_by_name}
                              </div>
                            )}
                          </>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {row.public_token && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleTestRow(row)}
                              disabled={row.test_status === 'testing'}
                              title="Testar token"
                            >
                              <ShieldCheck className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(row)}
                          >
                            {row.public_token ? 'Editar' : 'Configurar'}
                          </Button>
                          {row.config_id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(row)}
                              className="text-destructive hover:text-destructive"
                              title="Remover token"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de edição */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {editing?.public_token ? 'Editar' : 'Configurar'} Mapbox
            </DialogTitle>
            <DialogDescription>
              Organização: <strong>{editing?.nome}</strong>
              <br />
              <a
                href="https://account.mapbox.com/access-tokens/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline mt-2 text-xs"
              >
                Obter token público gratuito{' '}
                <ExternalLink className="h-3 w-3" />
              </a>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bo-token">Token público (pk.xxxx...)</Label>
              <div className="flex gap-2">
                <Input
                  id="bo-token"
                  type={showEditToken || !editToken ? 'text' : 'password'}
                  value={
                    showEditToken || !editToken
                      ? editToken
                      : maskToken(editToken)
                  }
                  onChange={(e) => {
                    setEditToken(e.target.value);
                    setEditTestResult(null);
                  }}
                  placeholder="pk.eyJ1Ijoi..."
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowEditToken((v) => !v)}
                  disabled={!editToken}
                >
                  {showEditToken ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {editToken && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleEditTest}
                  disabled={testingEdit}
                  className="gap-2"
                >
                  {testingEdit ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : editTestResult === 'ok' ? (
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  ) : editTestResult === 'fail' ? (
                    <XCircle className="h-3 w-3 text-destructive" />
                  ) : (
                    <ShieldCheck className="h-3 w-3" />
                  )}
                  {testingEdit ? 'Testando...' : 'Testar contra Mapbox'}
                </Button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 pt-3 border-t">
              <div className="space-y-1.5">
                <Label htmlFor="bo-lat">Latitude</Label>
                <Input
                  id="bo-lat"
                  type="number"
                  step="any"
                  placeholder="-25.42"
                  value={editLat}
                  onChange={(e) => setEditLat(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bo-lng">Longitude</Label>
                <Input
                  id="bo-lng"
                  type="number"
                  step="any"
                  placeholder="-49.27"
                  value={editLng}
                  onChange={(e) => setEditLng(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bo-zoom">Zoom</Label>
                <Input
                  id="bo-zoom"
                  type="number"
                  min="1"
                  max="22"
                  value={editZoom}
                  onChange={(e) => setEditZoom(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={savingEdit || !editToken}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {savingEdit ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
