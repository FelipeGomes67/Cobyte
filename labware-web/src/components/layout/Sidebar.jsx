import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, PlusCircle, FileText, History, Bell } from 'lucide-react';
import ProfileMenu from './ProfileMenu';

export default function Sidebar({ open, onNavigate, user, onRequestLogout }) {
  const location = useLocation();
  const currentPath = location.pathname;

  const isDashboardActive = currentPath === '/dashboard';
  const isNovoChamadoActive = currentPath === '/chamados/novo' || currentPath === '/novo-chamado';
  const isMeusChamadosActive = (currentPath === '/chamados' || currentPath === '/meus-chamados') && !isNovoChamadoActive;
  const isHistoricoActive = currentPath === '/historico';
  const isNotificacoesActive = currentPath === '/notificacoes';

  const navItems = [
    {
      label: 'DashBoard',
      to: '/dashboard',
      Icon: LayoutGrid,
      active: isDashboardActive,
    },
    {
      label: 'Fazer Chamado',
      to: '/chamados/novo',
      Icon: PlusCircle,
      active: isNovoChamadoActive,
    },
    {
      label: 'Meus Chamados',
      to: '/chamados',
      Icon: FileText,
      active: isMeusChamadosActive,
    },
    {
      label: 'Histórico',
      to: '/historico',
      Icon: History,
      active: isHistoricoActive,
    },
    {
      label: 'Notificações',
      to: '/notificacoes',
      Icon: Bell,
      active: isNotificacoesActive,
    },
  ];

  return (
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <Link className="brand" to="/dashboard" onClick={onNavigate} aria-label="CoBYTE - início">
        <img className="brand-logo" src="/Propriedade%201=Padr%C3%A3o.png" alt="CoBYTE" />
      </Link>
      <nav className="side-nav" aria-label="Navegação principal">
        {navItems.map(({ label, to, Icon, active }) => (
          <Link
            key={label}
            to={to}
            onClick={onNavigate}
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
