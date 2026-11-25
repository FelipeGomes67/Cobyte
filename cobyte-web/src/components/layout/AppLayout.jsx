import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useNotificacoes } from '../../hooks/useNotificacoes';
import '../../css/NotificacoesReais.css';
import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';
import ProfileMenu from './ProfileMenu';
import NotificationDropdown from './NotificationDropdown';
import ConfirmDialog from '../common/ConfirmDialog';
import AvisoEmpresaPendente from '../common/AvisoEmpresaPendente';
import { empresaPendente } from '../../utils/acessoUsuario';
import { useAutenticacao } from '../../hooks/useAuth';

const pageNames = {
  '/admin/usuarios': 'Gerenciar usuários',
  '/admin/chamados': 'Gerenciar chamados',
  '/admin/empresas': 'Gerenciar empresas',
  '/dashboard': 'Dashboard',
  '/chamados': 'Todos Chamados',
  '/meus-chamados': 'Meus Chamados',
  '/chamados-empresa': 'Chamados da empresa',
  '/historico': 'Histórico de Chamados',
  '/relatorios': 'Relatórios',
  '/configuracoes': 'Configurações',
  '/usuarios-pendentes': 'Usuários pendentes',
  '/perfil': 'Meu perfil',
  '/chamados/novo': 'Novo chamado',
  '/novo-chamado': 'Novo chamado',
  '/notificacoes': 'Notificações',
};

export default function AppLayout() {
  const notificacoes = useNotificacoes(0, 6);
  const { usuario: user, desconectar: logout } = useAutenticacao();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [telaPequena, setTelaPequena] = useState(() => window.matchMedia('(max-width: 720px)').matches);
  const menuRef = useFocusTrap(menuOpen && telaPequena, () => setMenuOpen(false));
  useEffect(() => {
    const consulta = window.matchMedia('(max-width: 720px)');
    function ajustar(evento) { setTelaPequena(evento.matches); if (!evento.matches) setMenuOpen(false); }
    consulta.addEventListener('change', ajustar);
    return () => consulta.removeEventListener('change', ajustar);
  }, []);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const notificationRef = useRef(null);
  const ehDetalheChamado = /^\/(dashboard|chamado|chamados|chamados-empresa|meus-chamados|historico)\/[^/]+\/?$/.test(location.pathname)
    && location.pathname.replace(/\/$/, '') !== '/chamados/novo'
    && location.pathname.replace(/\/$/, '') !== '/novo-chamado';
  const title = ehDetalheChamado ? 'Detalhes' : pageNames[location.pathname] || 'Central de Suporte';

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    function abrirChamado(evento) {
      if (evento.data?.tipo !== 'COBYTE_ABRIR_CHAMADO') return;
      const caminho = evento.data.caminho;
      if (!/^\/chamados\/\d+$/.test(caminho) && caminho !== '/notificacoes') return;
      setNotificationsOpen(false);
      navigate(caminho);
      evento.ports?.[0]?.postMessage('navegado');
    }
    navigator.serviceWorker.addEventListener('message', abrirChamado);
    return () => navigator.serviceWorker.removeEventListener('message', abrirChamado);
  }, [navigate]);

  function leaveAccount() {
    logout();
    setLogoutOpen(false);
    navigate('/login', { replace: true });
  }

  useEffect(() => {
    if (!notificationsOpen) return undefined;
    notificationRef.current?.querySelector('.notification-dropdown-card button')?.focus();
    function closeOnOutsideClick(event) {
      if (!notificationRef.current?.contains(event.target)) setNotificationsOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setNotificationsOpen(false);
        notificationRef.current?.querySelector('.topbar-bell-button')?.focus();
      }
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

  return (
    <div className={`app-shell ${isReportsPage ? 'app-shell--reports' : ''} ${ehDashboard ? 'app-shell--dashboard' : ''}`}>
      <a className="skip-link" href="#conteudo-principal">Pular para o conteúdo</a>
      <Sidebar sidebarRef={menuRef} mobile={telaPequena} inert={logoutOpen} open={menuOpen} onNavigate={() => setMenuOpen(false)} user={user} onRequestLogout={() => { setMenuOpen(false); setLogoutOpen(true); }} />
      {menuOpen && <button className="mobile-scrim" tabIndex={-1} onClick={() => setMenuOpen(false)} aria-label="Fechar menu" />}
      <main inert={logoutOpen || (menuOpen && telaPequena)} className={`main-area ${isReportsPage ? 'main-area--reports' : ''}`}>
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="menu-lateral" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}>
            {menuOpen ? <X /> : <Menu />}
          </button>

          <div className="breadcrumb"><span>Central de Suporte</span><strong>{title}</strong></div>

          <div className="top-actions">
            {user?.perfil !== 'ADMIN' && <div className="notification-center" ref={notificationRef}>
              <button
                type="button"
                className="topbar-bell-button"
                onClick={() => setNotificationsOpen(prev => !prev)}
                aria-label={notificacoes.naoLidas + ' notificações não lidas'}
                aria-expanded={notificationsOpen}
              >
                <Bell size={26} strokeWidth={1.8} className="topbar-bell-svg" />
                {notificacoes.naoLidas > 0 && <span className="topbar-badge">{notificacoes.naoLidas > 99 ? '99+' : notificacoes.naoLidas}</span>}
              </button>
              {notificationsOpen && (
                <NotificationDropdown dados={notificacoes}
                  onClose={() => setNotificationsOpen(false)}
                  onViewAll={openNotifications}
                />
              )}
            </div>}
            <ProfileMenu user={user} variant="header" onRequestLogout={() => setLogoutOpen(true)} />
          </div>
        </header>

        <div id="conteudo-principal" tabIndex={-1} className={`content-area ${isReportsPage ? 'content-area--reports' : ''}`}>
          {empresaPendente(user) && <AvisoEmpresaPendente />}
          {empresaPendente(user) && !['/dashboard', '/perfil', '/configuracoes'].includes(location.pathname) ? null : <Outlet />}
        </div>
      </main>
      <ConfirmDialog open={logoutOpen} title="Sair da conta?" message="Sua sessão será encerrada neste dispositivo." confirmLabel="Sair da conta" onCancel={() => setLogoutOpen(false)} onConfirm={leaveAccount} />
    </div>
  );
}
