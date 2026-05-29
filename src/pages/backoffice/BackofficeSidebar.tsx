import { LayoutDashboard, Building2, Users, HeartHandshake, Wrench, Bell, Globe2, ShieldCheck, UserPlus } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
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
  { title: 'Dashboard', url: '/backoffice', icon: LayoutDashboard },
  { title: 'Solicitações', url: '/backoffice/solicitacoes', icon: UserPlus },
  { title: 'Granjas', url: '/backoffice/granjas', icon: Building2 },
  { title: 'Usuários', url: '/backoffice/usuarios', icon: Users },
  { title: 'Customer Success', url: '/backoffice/cs', icon: HeartHandshake },
  { title: 'Mapbox', url: '/backoffice/mapbox', icon: Globe2 },
  { title: 'Ferramentas', url: '/backoffice/ferramentas', icon: Wrench },
  { title: 'Notificações', url: '/backoffice/notificacoes', icon: Bell },
  { title: 'Auditoria', url: '/backoffice/auditoria', icon: ShieldCheck },
];


export function BackofficeSidebar() {
  const location = useLocation();
  const sidebar = useSidebar();
  const collapsed = sidebar.state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="pt-14">
        <SidebarGroup>
          <SidebarGroupLabel>Administração</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={
                    item.url === '/backoffice'
                      ? location.pathname === '/backoffice'
                      : location.pathname.startsWith(item.url)
                  }>
                    <NavLink to={item.url} end={item.url === '/backoffice'}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
