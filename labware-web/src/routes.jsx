import { BrowserRouter, Navigate, Route, Routes, useRoutes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import NovoChamado from './pages/NovoChamado';
import Notificacoes from './pages/Notificacoes';
import DetalhesChamado from './pages/DetalhesChamado';
import { TicketsPage } from './pages/TicketsPage';

function AuthenticatedRoutes() {
  const page = useRoutes([
    { path: '/notificacoes', element: <Notificacoes /> },
    { path: '/chamado/:id', element: <DetalhesChamado /> },
    { path: '/dashboard', element: <TicketsPage mode="dashboard" /> },
    { path: '/chamados', element: <TicketsPage mode="all" /> },
    { path: '/chamados/novo', element: <NovoChamado /> },
    { path: '/meus-chamados', element: <TicketsPage mode="mine" /> },
    { path: '/historico', element: <TicketsPage mode="history" /> },
    { path: '/relatorios', element: <ReportsPage /> },
    { path: '/configuracoes', element: <SettingsPage /> },
    { path: '/perfil', element: <ProfilePage /> },
    { path: '*', element: <Navigate to="/dashboard" replace /> },
  ]);

  return <AppLayout>{page}</AppLayout>;
}

export default function RoutesApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<AuthenticatedRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}