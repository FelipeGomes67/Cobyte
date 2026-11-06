import { NavLink } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import ProfileMenu from './ProfileMenu';

const links = [
  { label: 'Dashboard', to: '/dashboard', icon: '/Painel.svg' },
  { label: 'Todos Chamados', to: '/chamados', icon: '/Ticket.svg', supportOnly: true },
  { label: 'Meus Chamados', to: '/meus-chamados', Icon: MessageSquare },
  { label: 'Histórico de Chamados', to: '/historico', icon: '/Histórico.svg' },
  { label: 'Relatório', to: '/relatorios', icon: '/Prancheta.svg', supportOnly: true },
];

export default function Sidebar({ open, onNavigate, user, onRequestLogout }) {
  const visibleLinks = links.filter(link => !link.supportOnly || user.role === 'support');
  return <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
    <NavLink className="brand" to="/dashboard" onClick={onNavigate} aria-label="LabWare - início">
      <img className="brand-logo" src="/Propriedade%201=Padr%C3%A3o.png" alt="LabWare"/>
    </NavLink>
    <nav className="side-nav" aria-label="Navegação principal">
      {visibleLinks.map(({ label, to, icon, Icon }) => <NavLink key={to} to={to} onClick={onNavigate} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
        {icon ? <img src={icon} alt=""/> : <Icon size={18}/>}<span>{label}</span>
      </NavLink>)}
    </nav>
    <div className="sidebar-account"><ProfileMenu user={user} onNavigate={onNavigate} onRequestLogout={onRequestLogout}/></div>
  </aside>;
}
