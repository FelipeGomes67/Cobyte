import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';
import ProfileMenu from './ProfileMenu';
import ConfirmDialog from '../common/ConfirmDialog';
import { useAuth } from '../../hooks/useAuth';

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

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const notificationRef = useRef(null);
  const title = pageNames[location.pathname] || 'Central de Suporte';
  function leaveAccount() {
    logout();
    setLogoutOpen(false);
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
    navigate('/configuracoes?aba=notificacoes');
  }

  return <div className="app-shell">
    <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} user={user} onRequestLogout={() => setLogoutOpen(true)}/>
    {menuOpen && <button className="mobile-scrim" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"/>}
    <main className="main-area">
      <header className="topbar">
        <button className="icon-button mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}>{menuOpen ? <X/> : <Menu/>}</button>
        <div className="breadcrumb"><span>Central de Suporte</span><strong>{title}</strong></div>
        <div className="top-actions">
          <div className="notification-center" ref={notificationRef}>
            <button className="icon-button notification-button" onClick={() => setNotificationsOpen(!notificationsOpen)} aria-label="Notificações" aria-expanded={notificationsOpen} aria-haspopup="true">
              <Bell size={21}/>
            </button>
            {notificationsOpen && <section className="notification-popover" aria-label="Notificações recentes">
              <h2>Notificações</h2>
              <p className="notification-empty">O histórico de notificações será exibido quando estiver conectado ao serviço de chamados.</p>
              <button className="notification-see-all" onClick={openNotifications}>Configurar notificações</button>
            </section>}
          </div>
          <ProfileMenu user={user} variant="header" onRequestLogout={() => setLogoutOpen(true)}/>
        </div>
      </header>
      <div className="content-area"><Outlet/></div>
    </main>
    <ConfirmDialog open={logoutOpen} title="Sair da conta?" message="Sua sessão será encerrada neste dispositivo." confirmLabel="Sair da conta" onCancel={() => setLogoutOpen(false)} onConfirm={leaveAccount}/>
  </div>;
}
