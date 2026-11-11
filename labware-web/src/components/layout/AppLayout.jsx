import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';
import ProfileMenu from './ProfileMenu';
import NotificationDropdown from './NotificationDropdown';
import ConfirmDialog from '../common/ConfirmDialog';
import { useAutenticacao } from '../../hooks/useAuth';

const pageNames = {
  '/dashboard': 'Dashboard',
  '/chamados': 'Todos Chamados',
  '/meus-chamados': 'Meus Chamados',
  '/historico': 'Histórico de Chamados',
  '/relatorios': 'Relatórios',
  '/configuracoes': 'Configurações',
  '/perfil': 'Meu perfil',
  '/chamados/novo': 'Novo chamado',
  '/novo-chamado': 'Novo chamado',
  '/notificacoes': 'Notificações',
};

export default function AppLayout() {
  const { usuario: user, desconectar: logout } = useAutenticacao();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const notificationRef = useRef(null);
  const ehDetalheChamado = /^\/(dashboard|chamado|chamados|meus-chamados|historico)\/[^/]+\/?$/.test(location.pathname)
    && location.pathname.replace(/\/$/, '') !== '/chamados/novo'
    && location.pathname.replace(/\/$/, '') !== '/novo-chamado';
  const title = ehDetalheChamado ? 'Detalhes' : pageNames[location.pathname] || 'Central de Suporte';

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
    navigate('/notificacoes');
  }

  const isReportsPage = location.pathname === '/relatorios';
  const ehDashboard = location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/');
  const isNotificacoesPage = location.pathname === '/notificacoes';

  return (
    <div className={`app-shell ${isReportsPage ? 'app-shell--reports' : ''} ${ehDashboard ? 'app-shell--dashboard' : ''} ${isNotificacoesPage ? 'app-shell--notificacoes' : ''}`}>
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} user={user} onRequestLogout={() => setLogoutOpen(true)} />
      {menuOpen && <button className="mobile-scrim" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" />}
      <main className={`main-area ${isReportsPage ? 'main-area--reports' : ''} ${isNotificacoesPage ? 'main-area--notificacoes' : ''}`}>
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}>
            {menuOpen ? <X /> : <Menu />}
          </button>

          {isNotificacoesPage ? (
            <div className="topbar-breadcrumb">
              <span className="topbar-breadcrumb-sub">Suporte Labware</span>
              <span className="topbar-breadcrumb-main">Notificações</span>
            </div>
          ) : (
            <div className="breadcrumb"><span>Central de Suporte</span><strong>{title}</strong></div>
          )}

          <div className="top-actions">
            <div className="notification-center" ref={notificationRef}>
              <button
                type="button"
                className="topbar-bell-button"
                onClick={() => setNotificationsOpen(prev => !prev)}
                aria-label="3 notificações não lidas"
                aria-expanded={notificationsOpen}
              >
                <Bell size={26} strokeWidth={1.8} className="topbar-bell-svg" />
                <span className="topbar-badge">3</span>
              </button>
              {notificationsOpen && (
                <NotificationDropdown
                  onClose={() => setNotificationsOpen(false)}
                  onViewAll={openNotifications}
                />
              )}
            </div>
            {!isNotificacoesPage && (
              <ProfileMenu user={user} variant="header" onRequestLogout={() => setLogoutOpen(true)} />
            )}
          </div>
        </header>

        <div className={`content-area ${isReportsPage ? 'content-area--reports' : ''} ${isNotificacoesPage ? 'content-area--notificacoes' : ''}`}>
          <Outlet />
        </div>
      </main>
      <ConfirmDialog open={logoutOpen} title="Sair da conta?" message="Sua sessão será encerrada neste dispositivo." confirmLabel="Sair da conta" onCancel={() => setLogoutOpen(false)} onConfirm={leaveAccount} />
    </div>
  );
}
