import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import DashboardPage from './pages/DashboardPage';
import { TicketsPage } from './pages/TicketsPage';
import NovoChamado from './pages/NovoChamado';
import Notificacoes from './pages/Notificacoes';
import DetalhesChamado from './pages/DetalhesChamado';
import { useAutenticacao } from './hooks/useAuth';
import { obterToken } from './services/api';

export function ProtectedRoute() {
  const { usuario, inicializando } = useAutenticacao();
  const localizacao = useLocation();
  const token = obterToken();

  // Sem token salvo no localStorage -> redireciona imediatamente para /login
  if (!token) {
    return <Navigate to="/login" replace state={{ from: localizacao.pathname }} />;
  }

  // Enquanto inicializa e valida o token existente com a API
  if (inicializando) {
    return <main className="auth-screen" role="status">Carregando sessão…</main>;
  }

  // Se a inicialização terminou e não há usuário válido autenticado
  if (!usuario) {
    return <Navigate to="/login" replace state={{ from: localizacao.pathname }} />;
  }

  return <AppLayout />;
}

export function ExigirSuporte({ children }) {
  const { usuario } = useAutenticacao();
  return usuario?.role === 'support' ? children : <Navigate to="/dashboard" replace />;
}

export function PublicRoute({ children }) {
  const { usuario, inicializando } = useAutenticacao();
  const token = obterToken();

  if (token && inicializando) {
    return <main className="auth-screen" role="status">Carregando sessão…</main>;
  }

  if (usuario && token) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function RotaRaiz() {
  const { usuario, inicializando } = useAutenticacao();
  const token = obterToken();

  if (token && inicializando) {
    return <main className="auth-screen" role="status">Carregando sessão…</main>;
  }

  return usuario && token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
}

export default function RotasAplicacao() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RotaRaiz />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage modo="login" />
            </PublicRoute>
          }
        />
        <Route
          path="/cadastro"
          element={
            <PublicRoute>
              <LoginPage modo="cadastro" />
            </PublicRoute>
          }
        />
        <Route element={<ProtectedRoute />}>
          <Route path="/notificacoes" element={<Notificacoes />} />
          <Route path="/chamado/:id" element={<DetalhesChamado />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/:ticketId" element={<DetalhesChamado />} />
          <Route path="/chamados" element={<TicketsPage mode="all" />} />
          <Route path="/chamados/:ticketId" element={<DetalhesChamado />} />
          <Route path="/chamados/novo" element={<NovoChamado />} />
          <Route path="/novo-chamado" element={<NovoChamado />} />
          <Route path="/meus-chamados" element={<TicketsPage mode="mine" />} />
          <Route path="/meus-chamados/:ticketId" element={<DetalhesChamado />} />
          <Route path="/historico" element={<TicketsPage mode="history" />} />
          <Route path="/historico/:ticketId" element={<DetalhesChamado />} />
          <Route
            path="/relatorios"
            element={
              <ExigirSuporte>
                <ReportsPage />
              </ExigirSuporte>
            }
          />
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
