import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Eye, Pencil, Shield } from "lucide-react";
import type { NivelAcesso } from "@/hooks/useModuleAccess";

interface Modulo {
  id: string;
  codigo: string;
  nome: string;
}

interface UserModulo {
  modulo_id: string;
  permitido: boolean;
  nivel_acesso: NivelAcesso;
}

interface RoleModulo {
  modulo_id: string;
  permitido: boolean;
  nivel_acesso: NivelAcesso;
  role: string;
}

interface ModuloChange {
  modulo_id: string;
  permitido: boolean;
  nivel_acesso: NivelAcesso;
}

interface MembroModulosSectionProps {
  membroId: string;
  membroRoles: string[];
  integradoId: string;
  onModulosChange: (modulos: ModuloChange[]) => void;
}

const nivelLabels: Record<NivelAcesso, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  view: { label: 'Ver', icon: Eye },
  edit: { label: 'Editar', icon: Pencil },
  full: { label: 'Total', icon: Shield },
};

const MembroModulosSection = ({ 
  membroId, 
  membroRoles, 
  integradoId,
  onModulosChange 
}: MembroModulosSectionProps) => {
  const [loading, setLoading] = useState(true);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [userModulos, setUserModulos] = useState<UserModulo[]>([]);
  const [roleModulos, setRoleModulos] = useState<RoleModulo[]>([]);
  const [localChanges, setLocalChanges] = useState<Map<string, { permitido: boolean | null; nivel_acesso: NivelAcesso }>>(new Map());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: modulosData } = await supabase
          .from('modulos' as any)
          .select('id, codigo, nome')
          .eq('ativo', true)
          .neq('codigo', 'portal-fornecedor')
          .order('ordem');

        const { data: userModulosData } = await supabase
          .from('user_modulos' as any)
          .select('modulo_id, permitido, nivel_acesso')
          .eq('user_id', membroId);

        const { data: roleModulosData } = await supabase
          .from('role_modulos' as any)
          .select('modulo_id, permitido, nivel_acesso, role')
          .in('role', membroRoles.length > 0 ? membroRoles : ['integrado']);

        setModulos((modulosData as unknown as Modulo[]) || []);
        setUserModulos((userModulosData as unknown as UserModulo[]) || []);
        setRoleModulos((roleModulosData as unknown as RoleModulo[]) || []);
      } catch (error) {
        console.error('Error fetching modulos:', error);
      } finally {
        setLoading(false);
      }
    };

    if (membroId) {
      fetchData();
    }
  }, [membroId, membroRoles]);

  const getModuleAccess = (moduloId: string): { 
    hasAccess: boolean; 
    source: 'individual' | 'role' | 'none';
    nivel_acesso: NivelAcesso;
  } => {
    const localChange = localChanges.get(moduloId);
    if (localChange !== undefined && localChange.permitido !== null) {
      return { 
        hasAccess: localChange.permitido, 
        source: 'individual',
        nivel_acesso: localChange.nivel_acesso
      };
    }

    const userModulo = userModulos.find(um => um.modulo_id === moduloId);
    if (userModulo !== undefined) {
      return { 
        hasAccess: userModulo.permitido, 
        source: 'individual',
        nivel_acesso: userModulo.nivel_acesso || 'view'
      };
    }

    const rolePermissions = roleModulos.filter(rm => rm.modulo_id === moduloId && rm.permitido);
    if (rolePermissions.length > 0) {
      const maxLevel = rolePermissions.reduce((max, rp) => {
        const order = { view: 1, edit: 2, full: 3 };
        return order[rp.nivel_acesso] > order[max] ? rp.nivel_acesso : max;
      }, 'view' as NivelAcesso);
      
      return { hasAccess: true, source: 'role', nivel_acesso: maxLevel };
    }

    return { hasAccess: false, source: 'none', nivel_acesso: 'view' };
  };

  const handleToggle = (moduloId: string, currentAccess: ReturnType<typeof getModuleAccess>) => {
    const newChanges = new Map(localChanges);
    
    if (currentAccess.hasAccess) {
      newChanges.set(moduloId, { permitido: false, nivel_acesso: currentAccess.nivel_acesso });
    } else {
      newChanges.set(moduloId, { permitido: true, nivel_acesso: 'view' });
    }

    setLocalChanges(newChanges);
    notifyChanges(newChanges);
  };

  const handleNivelChange = (moduloId: string, nivel: NivelAcesso) => {
    const newChanges = new Map(localChanges);
    const current = localChanges.get(moduloId);
    
    newChanges.set(moduloId, { 
      permitido: current?.permitido ?? true, 
      nivel_acesso: nivel 
    });

    setLocalChanges(newChanges);
    notifyChanges(newChanges);
  };

  const notifyChanges = (changes: Map<string, { permitido: boolean | null; nivel_acesso: NivelAcesso }>) => {
    const changesArray = Array.from(changes.entries())
      .filter(([_, value]) => value.permitido !== null)
      .map(([modulo_id, value]) => ({
        modulo_id,
        permitido: value.permitido as boolean,
        nivel_acesso: value.nivel_acesso
      }));
    onModulosChange(changesArray);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Carregando módulos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground mb-2">
        Configure o acesso aos módulos. <strong>Ver</strong>: apenas leitura, <strong>Editar</strong>: criar/editar, <strong>Total</strong>: todas as ações.
      </div>
      <div className="space-y-2 p-3 bg-muted rounded-lg max-h-64 overflow-y-auto">
        {modulos.map((modulo) => {
          const access = getModuleAccess(modulo.id);
          const hasLocalChange = localChanges.has(modulo.id);
          
          return (
            <div key={modulo.id} className="flex items-center gap-3 py-1.5 border-b border-border/30 last:border-0">
              <Checkbox
                id={`modulo-${modulo.id}`}
                checked={access.hasAccess}
                onCheckedChange={() => handleToggle(modulo.id, access)}
              />
              <label
                htmlFor={`modulo-${modulo.id}`}
                className="text-sm cursor-pointer flex-1 flex items-center gap-2"
              >
                {modulo.nome}
                {access.source === 'role' && !hasLocalChange && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    Role
                  </Badge>
                )}
                {hasLocalChange && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Custom
                  </Badge>
                )}
              </label>
              {access.hasAccess && (
                <Select
                  value={access.nivel_acesso}
                  onValueChange={(value) => handleNivelChange(modulo.id, value as NivelAcesso)}
                >
                  <SelectTrigger className="w-28 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(nivelLabels).map(([key, { label, icon: Icon }]) => (
                      <SelectItem key={key} value={key} className="text-xs">
                        <span className="flex items-center gap-1.5">
                          <Icon className="w-3 h-3" />
                          {label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MembroModulosSection;
