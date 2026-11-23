import { Link, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  Ticket,
  FileText,
  History,
  ClipboardCheck,
  PlusCircle,
  Users,
  X,
} from 'lucide-react';
import { empresaPendente } from '../../utils/acessoUsuario';
import ProfileMenu from './ProfileMenu';
import { useAutenticacao } from '../../hooks/useAuth';

export default function Sidebar({ sidebarRef, mobile, inert, open, onNavigate, user: userProp, onRequestLogout }) {
  const { usuario: userContext } = useAutenticacao();
  const user = userProp || userContext;
  const location = useLocation();
  const currentPath = location.pathname;

  const ehCliente =
    user?.perfil === 'CLIENTE' ||
    user?.role === 'client';
  const ehSuporte =
    user?.role === 'support' ||
    user?.perfil === 'SUPORTE' ||
    user?.perfil === 'ADMIN';

  // Itens dinâmicos de acordo com o perfil do usuário
  const navItems = user?.perfil === 'ADMIN'
    ? [
        { label: 'Usuários pendentes', to: '/usuarios-pendentes', Icon: Users, active: currentPath === '/usuarios-pendentes' },
        { label: 'Gerenciar usuários', to: '/admin/usuarios', Icon: Users, active: currentPath === '/admin/usuarios' },
        { label: 'Gerenciar chamados', to: '/admin/chamados', Icon: Ticket, active: currentPath === '/admin/chamados' },
        { label: 'Gerenciar empresas', to: '/admin/empresas', Icon: ClipboardCheck, active: currentPath === '/admin/empresas' },
      ]
    : empresaPendente(user)
    ? [
        {
          label: 'Dashboard',
          to: '/dashboard',
          Icon: LayoutGrid,
          active: currentPath === '/dashboard',
        },
        {
          label: 'Meu perfil',
          to: '/perfil',
          Icon: Users,
          active: currentPath === '/perfil',
        },
      ]
    : ehSuporte
    ? [
        {
          label: 'Dashboard',
          to: '/dashboard',
          Icon: LayoutGrid,
          active: currentPath === '/dashboard',
        },
        {
          label: 'Todos Chamados',
          to: '/chamados',
          Icon: Ticket,
          active:
            (currentPath === '/chamados' || currentPath === '/todos-chamados') &&
            currentPath !== '/chamados/novo' &&
            currentPath !== '/novo-chamado',
        },
        {
          label: 'Meus Chamados',
          to: '/meus-chamados',
          Icon: FileText,
          active: currentPath === '/meus-chamados',
        },
        {
          label: 'Histórico de Chamados',
          to: '/historico',
          Icon: History,
          active: currentPath === '/historico',
        },
        {
          label: 'Relatórios',
          to: '/relatorios',
          Icon: ClipboardCheck,
          active: currentPath === '/relatorios',
        },
        {
          label: 'Usuários pendentes',
          to: '/usuarios-pendentes',
          Icon: Users,
          active: currentPath === '/usuarios-pendentes',
        },
      ]
    : [
      {
        label: 'Dashboard',
        to: '/dashboard',
        Icon: LayoutGrid,
        active: currentPath === '/dashboard',
      },
      ...(ehCliente
        ? [
          {
            label: 'Chamados da empresa',
            to: '/chamados-empresa',
            Icon: Ticket,
            active: currentPath.startsWith('/chamados-empresa'),
          },
          {
            label: 'Fazer Chamado',
            to: '/chamados/novo',
            Icon: PlusCircle,
            active:
              currentPath === '/chamados/novo' || currentPath === '/novo-chamado',
          },
        ]
        : []),
      {
        label: 'Meus Chamados',
        to: '/chamados',
        Icon: FileText,
        active:
          currentPath === '/chamados' &&
          currentPath !== '/chamados/novo' &&
          currentPath !== '/novo-chamado',
      },
      {
        label: 'Histórico de Chamados',
        to: '/historico',
        Icon: History,
        active: currentPath === '/historico',
      },
    ];


  return (
    <aside ref={sidebarRef} id="menu-lateral" tabIndex={-1} inert={inert || (mobile && !open)} role={mobile && open ? 'dialog' : undefined} aria-modal={mobile && open ? true : undefined} aria-label="Menu principal" className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <Link className="brand" to={user?.perfil === 'ADMIN' ? '/admin/usuarios' : '/dashboard'} onClick={onNavigate} aria-label="CoBYTE - início">
        <img className="brand-logo" src="/Propriedade%201=Padr%C3%A3o.png" alt="CoBYTE" />
      </Link>
      {mobile && open && <button type="button" className="sidebar-close" onClick={onNavigate} aria-label="Fechar menu"><X size={22} aria-hidden="true" /></button>}
      <nav className="side-nav"  aria-label="Navegação principal">
        {navItems.map(({ label, to, Icon, active }) => (
          <Link
            key={label}
            to={to}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`nav-link ${active ? 'active' : ''}`}
          >
            <Icon size={19} className="nav-icon" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="sidebar-account">
        <ProfileMenu
          user={user || { name: 'Fidalgo', role: 'support' }}
          onNavigate={onNavigate}
          onRequestLogout={onRequestLogout}
        />
      </div>
    </aside>
  );
}
