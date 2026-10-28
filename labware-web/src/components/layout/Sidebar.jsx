import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, MessageSquare, UserRound } from 'lucide-react';

const links = [
  { label: 'Dashboard', to: '/dashboard', icon: '/Painel.svg' },
  { label: 'Todos Chamados', to: '/chamados', icon: '/Ticket.svg' },
  { label: 'Meus Chamados', to: '/meus-chamados', Icon: MessageSquare },
  { label: 'Histórico de Chamados', to: '/historico', icon: '/Histórico.svg' },
  { label: 'Relatório', to: '/relatorios', icon: '/Prancheta.svg' },
];

function Avatar() {
  return <span className="avatar"><UserRound size={18}/></span>;
}

export default function Sidebar({ open, onNavigate, user, onSignOut }) {
  const [profileOpen, setProfileOpen] = useState(false);
  return <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
    <NavLink className="brand" to="/dashboard" onClick={onNavigate} aria-label="LabWare - início">
      <img className="brand-logo" src="/Propriedade%201=Padr%C3%A3o.png" alt="LabWare"/>
    </NavLink>
    <nav className="side-nav" aria-label="Navegação principal">
      {links.map(({ label, to, icon, Icon }) => <NavLink key={to} to={to} onClick={onNavigate} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
        {icon ? <img src={icon} alt=""/> : <Icon size={18}/>}<span>{label}</span>
      </NavLink>)}
    </nav>
    <div className="sidebar-account">
      {profileOpen && <div className="profile-menu sidebar-profile-menu">
        <NavLink className="menu-primary" to="/perfil" onClick={() => {setProfileOpen(false); onNavigate();}}>Ver Perfil</NavLink>
        <NavLink to="/configuracoes" onClick={() => {setProfileOpen(false); onNavigate();}}>Configurações</NavLink>
        <button onClick={onSignOut}><span>Sair da conta</span><LogOut size={16}/></button>
      </div>}
      <button className="sidebar-user" onClick={() => setProfileOpen(!profileOpen)} aria-expanded={profileOpen}>
        <Avatar/><span className="sidebar-user-label"><strong>{user.name}</strong><small>Suporte</small></span>
      </button>
    </div>
  </aside>;
}
