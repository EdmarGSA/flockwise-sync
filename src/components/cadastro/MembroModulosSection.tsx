import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Modulo {
  id: string;
  codigo: string;
  nome: string;
}

interface UserModulo {
  modulo_id: string;
  permitido: boolean;
}

interface RoleModulo {
  modulo_id: string;
  permitido: boolean;
}

interface MembroModulosSectionProps {
  membroId: string;
  membroRoles: string[];
  integradoId: string;
  onModulosChange: (modulos: { modulo_id: string; permitido: boolean }[]) => void;
}

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
  const [localChanges, setLocalChanges] = useState<Map<string, boolean | null>>(new Map());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all modules
        const { data: modulosData } = await supabase
          .from('modulos' as any)
          .select('id, codigo, nome')
          .eq('ativo', true)
          .order('ordem');

        // Fetch user's individual module permissions
        const { data: userModulosData } = await supabase
          .from('user_modulos' as any)
          .select('modulo_id, permitido')
          .eq('user_id', membroId);

        // Fetch role-based permissions for all roles the member has
        const { data: roleModulosData } = await supabase
          .from('role_modulos' as any)
          .select('modulo_id, permitido, role')
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

  const getModuleAccess = (moduloId: string): { hasAccess: boolean; source: 'individual' | 'role' | 'none' } => {
    // Check local changes first
    const localChange = localChanges.get(moduloId);
    if (localChange !== undefined && localChange !== null) {
      return { hasAccess: localChange, source: 'individual' };
    }

    // Check individual permissions
    const userModulo = userModulos.find(um => um.modulo_id === moduloId);
    if (userModulo !== undefined) {
      return { hasAccess: userModulo.permitido, source: 'individual' };
    }

    // Check role permissions
    const rolePermission = roleModulos.find(rm => rm.modulo_id === moduloId && rm.permitido);
    if (rolePermission) {
      return { hasAccess: true, source: 'role' };
    }

    return { hasAccess: false, source: 'none' };
  };

  const handleToggle = (moduloId: string, currentAccess: { hasAccess: boolean; source: string }) => {
    const newChanges = new Map(localChanges);
    
    if (currentAccess.source === 'role') {
      // If coming from role, we need to add an individual override
      newChanges.set(moduloId, !currentAccess.hasAccess);
    } else if (currentAccess.source === 'individual' || localChanges.has(moduloId)) {
      // Toggle individual permission
      const currentValue = localChanges.get(moduloId);
      if (currentValue !== undefined && currentValue !== null) {
        // If we're toggling back to what the role says, remove the override
        const roleHasAccess = roleModulos.some(rm => rm.modulo_id === moduloId && rm.permitido);
        if (!currentValue === roleHasAccess) {
          newChanges.delete(moduloId);
        } else {
          newChanges.set(moduloId, !currentValue);
        }
      } else {
        newChanges.set(moduloId, !currentAccess.hasAccess);
      }
    } else {
      // No permission exists, add individual access
      newChanges.set(moduloId, true);
    }

    setLocalChanges(newChanges);

    // Notify parent of changes
    const changes = Array.from(newChanges.entries()).map(([modulo_id, permitido]) => ({
      modulo_id,
      permitido: permitido as boolean
    }));
    onModulosChange(changes);
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
        Marque os módulos que este membro pode acessar. Módulos herdados do papel aparecem com badge "Role".
      </div>
      <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded-lg max-h-48 overflow-y-auto">
        {modulos.map((modulo) => {
          const access = getModuleAccess(modulo.id);
          const hasLocalChange = localChanges.has(modulo.id);
          
          return (
            <div key={modulo.id} className="flex items-center gap-2">
              <Checkbox
                id={`modulo-${modulo.id}`}
                checked={access.hasAccess}
                onCheckedChange={() => handleToggle(modulo.id, access)}
              />
              <label
                htmlFor={`modulo-${modulo.id}`}
                className="text-sm cursor-pointer flex items-center gap-1 flex-wrap"
              >
                {modulo.nome}
                {access.source === 'role' && !hasLocalChange && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    Role
                  </Badge>
                )}
                {hasLocalChange && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                    Custom
                  </Badge>
                )}
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MembroModulosSection;
