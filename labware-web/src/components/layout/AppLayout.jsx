import { useEffect, useRef, useState } from 'react';
import { NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, Menu, MessageSquare, Settings, UserRound, X } from 'lucide-react';
import Sidebar from './Sidebar';
import { getCurrentUser, signOut } from '../../data/mockDatabase';

const pageNames = {
  '/dashboard': 'Dashboard',
  '/chamados': 'Todos Chamados',
  '/meus-chamados': 'Meus Chamados',
  '/historico': 'Histórico de Chamados',
  '/relatorios': 'Relatórios',
  '/configuracoes': 'Configurações',
  '/perfil': 'Meu perfil',
  '/chamados/novo': 'Novo chamado',
};

const sampleNotifications = [
  { id: 1, title: 'Nova mensagem em Chamado #102', time: 'Há 2 min' },
  { id: 2, title: 'Nova mensagem em Chamado #102', time: 'Há 2 min' },
  { id: 3, title: 'Nova mensagem em Chamado #102', time: 'Há 2 min' },
];

function Avatar() {
  return <span className="avatar"><UserRound size={18}/></span>;
}

export default function AppLayout({ children }) {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationRef = useRef(null);
  const title = pageNames[location.pathname] || 'Central de Suporte';
  function leaveAccount() {
    signOut();
    navigate('/login', { replace: true });
  }

  useEffect(() => {
    if (!notificationsOpen) return undefined;
    function closeOnOutsideClick(event) {
      if (!notificationRef.current?.contains(event.target)) setNotificationsOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setNotificationsOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [notificationsOpen]);

  function openNotifications() {
    setNotificationsOpen(false);
    navigate('/historico');
  }

  if (!user) return <Navigate to="/login" replace/>;

  return <div className="app-shell">
    <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} user={user} onSignOut={leaveAccount}/>
    {menuOpen && <button className="mobile-scrim" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"/>}
    <main className="main-area">
      <header className="topbar">
        <button className="icon-button mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}>{menuOpen ? <X/> : <Menu/>}</button>
        <div className="breadcrumb"><span>Central de Suporte</span><strong>{title}</strong></div>
        <div className="top-actions">
          <div className="notification-center" ref={notificationRef}>
            <button className="icon-button notification-button" onClick={() => setNotificationsOpen(!notificationsOpen)} aria-label="Notificações" aria-expanded={notificationsOpen} aria-haspopup="true">
              <Bell size={21}/><i aria-label="3 não lidas">3</i>
            </button>
            {notificationsOpen && <section className="notification-popover" aria-label="Notificações recentes">
              <h2>Notificações</h2>
              <div className="notification-list">{sampleNotifications.map(notification => <button className="notification-item" key={notification.id} onClick={openNotifications}>
                <span className="notification-message-icon"><MessageSquare size={13}/></span>
                <span className="notification-item-copy"><strong>{notification.title}</strong><small>{notification.time}</small></span>
              </button>)}</div>
              <button className="notification-see-all" onClick={openNotifications}>Ver todas as notificações</button>
            </section>}
          </div>
          <button className="user-trigger" onClick={() => setProfileOpen(!profileOpen)} aria-expanded={profileOpen}>
            <Avatar/><span className="user-name">{user.name}</span><ChevronDown size={15}/>
          </button>
          {profileOpen && <div className="profile-menu header-profile-menu">
            <div className="profile-menu-heading"><Avatar/><div><strong>{user.name}</strong><small>{user.role}</small></div></div>
            <NavLink to="/perfil" onClick={() => setProfileOpen(false)}><UserRound size={16}/> Ver perfil</NavLink>
            <NavLink to="/configuracoes" onClick={() => setProfileOpen(false)}><Settings size={16}/> Configurações</NavLink>
            <button onClick={leaveAccount}><LogOut size={16}/> Sair da conta</button>
          </div>}
        </div>
      </header>
      <div className="content-area">{children}</div>
    </main>
  </div>;
}
