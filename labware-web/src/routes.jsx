import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import { NewTicketPage, TicketsPage } from './pages/TicketsPage';
import { useAuth } from './hooks/useAuth';

function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();
  return user ? <AppLayout/> : <Navigate to="/login" replace state={{ from: location.pathname }}/>;
}

function RequireSupport({ children }) {
  const { user } = useAuth();
  return user?.role === 'support' ? children : <Navigate to="/dashboard" replace/>;
}

function PublicOnly() {
  const { user } = useAuth();
  const location = useLocation();
  if (user) return <Navigate to="/dashboard" replace/>;
  return <LoginPage mode={location.pathname === '/cadastro' ? 'register' : 'login'}/>;
}

export default function RoutesApp() {
  return <BrowserRouter><Routes>
    <Route path="/login" element={<PublicOnly/>}/>
    <Route path="/cadastro" element={<PublicOnly/>}/>
    <Route element={<RequireAuth/>}>
      <Route path="/dashboard" element={<TicketsPage mode="dashboard"/>}/>
      <Route path="/chamados" element={<TicketsPage mode="all"/>}/>
      <Route path="/chamados/novo" element={<NewTicketPage/>}/>
      <Route path="/meus-chamados" element={<TicketsPage mode="mine"/>}/>
      <Route path="/historico" element={<TicketsPage mode="history"/>}/>
      <Route path="/relatorios" element={<RequireSupport><ReportsPage/></RequireSupport>}/>
      <Route path="/configuracoes" element={<SettingsPage/>}/>
      <Route path="/perfil" element={<ProfilePage/>}/>
      <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
    </Route>
  </Routes></BrowserRouter>;
}
