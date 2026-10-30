import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import { NewTicketPage, TicketsPage } from './pages/TicketsPage';
import { useAutenticacao } from './hooks/useAuth';

function ExigirAutenticacao() {
  const { usuario, inicializando } = useAutenticacao();
  const localizacao = useLocation();
  if (inicializando) return <main className="auth-screen" role="status">Carregando sessão…</main>;
  return usuario ? <AppLayout/> : <Navigate to="/login" replace state={{ from: localizacao.pathname }}/>;
}

function ExigirSuporte({ children }) {
  const { usuario } = useAutenticacao();
  return usuario?.role === 'support' ? children : <Navigate to="/dashboard" replace/>;
}

function SomentePublico() {
  const { usuario, inicializando } = useAutenticacao();
  const localizacao = useLocation();
  if (inicializando) return <main className="auth-screen" role="status">Carregando sessão…</main>;
  if (usuario) return <Navigate to="/dashboard" replace/>;
  return <LoginPage key={localizacao.pathname} modo={localizacao.pathname === '/cadastro' ? 'cadastro' : 'login'}/>;
}

export default function RotasAplicacao() {
  return <BrowserRouter><Routes>
    <Route path="/login" element={<SomentePublico/>}/>
    <Route path="/cadastro" element={<SomentePublico/>}/>
    <Route element={<ExigirAutenticacao/>}>
      <Route path="/dashboard" element={<TicketsPage mode="dashboard"/>}/>
      <Route path="/dashboard/:ticketId" element={<TicketsPage mode="dashboard"/>}/>
      <Route path="/chamados" element={<TicketsPage mode="all"/>}/>
      <Route path="/chamados/:ticketId" element={<TicketsPage mode="all"/>}/>
      <Route path="/chamados/novo" element={<NewTicketPage/>}/>
      <Route path="/meus-chamados" element={<TicketsPage mode="mine"/>}/>
      <Route path="/meus-chamados/:ticketId" element={<TicketsPage mode="mine"/>}/>
      <Route path="/historico" element={<TicketsPage mode="history"/>}/>
      <Route path="/historico/:ticketId" element={<TicketsPage mode="history"/>}/>
      <Route path="/relatorios" element={<ExigirSuporte><ReportsPage/></ExigirSuporte>}/>
      <Route path="/configuracoes" element={<SettingsPage/>}/>
      <Route path="/perfil" element={<ProfilePage/>}/>
      <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
    </Route>
  </Routes></BrowserRouter>;
}
