import { useEffect, useState } from 'react';
import { LayoutDashboard, Building2, Users, HeartHandshake, Wrench, Bell, Globe2, ShieldCheck, UserPlus } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const items = [
  { title: 'Dashboard', url: '/backoffice', icon: LayoutDashboard, badgeKey: null as 'pendentes' | null },
  { title: 'Solicitações', url: '/backoffice/solicitacoes', icon: UserPlus, badgeKey: 'pendentes' as const },
  { title: 'Granjas', url: '/backoffice/granjas', icon: Building2, badgeKey: null },
  { title: 'Usuários', url: '/backoffice/usuarios', icon: Users, badgeKey: null },
  { title: 'Customer Success', url: '/backoffice/cs', icon: HeartHandshake, badgeKey: null },
  { title: 'Mapbox', url: '/backoffice/mapbox', icon: Globe2, badgeKey: null },
  { title: 'Ferramentas', url: '/backoffice/ferramentas', icon: Wrench, badgeKey: null },
  { title: 'Notificações', url: '/backoffice/notificacoes', icon: Bell, badgeKey: null },
  { title: 'Auditoria', url: '/backoffice/auditoria', icon: ShieldCheck, badgeKey: null },
];

export function BackofficeSidebar() {
  const location = useLocation();
  const sidebar = useSidebar();
  const collapsed = sidebar.state === 'collapsed';
  const [pendentes, setPendentes] = useState<number>(0);

  useEffect(() => {
    let cancel = false;

    const fetchCount = async () => {
      const { count } = await supabase
        .from('solicitacoes_cadastro' as any)
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendente');
      if (!cancel) setPendentes(count || 0);
    };

    fetchCount();

    const channel = supabase
      .channel('solicitacoes-sidebar-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitacoes_cadastro' }, () => fetchCount())
      .subscribe();

    const interval = setInterval(fetchCount, 60000);

    return () => {
      cancel = true;
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const getBadgeCount = (key: 'pendentes' | null) => (key === 'pendentes' ? pendentes : 0);

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="pt-14">
        <SidebarGroup>
          <SidebarGroupLabel>Administração</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const count = getBadgeCount(item.badgeKey);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={
                      item.url === '/backoffice'
                        ? location.pathname === '/backoffice'
                        : location.pathname.startsWith(item.url)
                    }>
                      <NavLink to={item.url} end={item.url === '/backoffice'}>
                        <item.icon className="w-4 h-4" />
                        <span className="flex-1">{item.title}</span>
                        {count > 0 && !collapsed && (
                          <Badge variant="destructive" className="h-5 px-1.5 text-[10px] font-semibold">
                            {count > 99 ? '99+' : count}
                          </Badge>
                        )}
                        {count > 0 && collapsed && (
                          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
