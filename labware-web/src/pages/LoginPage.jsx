import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage({ mode = 'login' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, loading } = useAuth();
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registered, setRegistered] = useState(false);
  const isRegistration = mode === 'register';

  async function submitLogin(event) {
    event.preventDefault();
    setLoginError('');
    const form = new FormData(event.currentTarget);
    try {
      const user = await login(form.get('email'), form.get('password'));
      const destination = location.state?.from;
      navigate(user.role === 'support' && destination ? destination : '/dashboard', { replace: true });
    } catch (error) {
      setLoginError(error.message || 'Não foi possível entrar.');
    }
  }

  async function submitRegister(event) {
    event.preventDefault();
    setRegisterError('');
    setRegistered(false);
    const form = new FormData(event.currentTarget);
    try {
      await register({ name: form.get('name'), email: form.get('email'), password: form.get('password') });
      setRegistered(true);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setRegisterError(error.message || 'Não foi possível concluir o cadastro.');
    }
  }

  return <main className="auth-screen">
    <form className="auth-card auth-card-single" onSubmit={isRegistration ? submitRegister : submitLogin}>
      <img className="auth-logo" src="/Propriedade%201=Padr%C3%A3o.png" alt="COBYTE"/>
      <h1>{isRegistration ? 'Cadastro' : 'Login'}</h1>
      {isRegistration && <label className="auth-field">Nome<input name="name" type="text" required minLength="2" autoComplete="name" aria-describedby={registerError ? 'register-error' : undefined}/></label>}
      <label className="auth-field">E-mail<input name="email" type="email" required autoComplete={isRegistration ? 'email' : 'username'} aria-describedby={isRegistration ? (registerError ? 'register-error' : undefined) : (loginError ? 'login-error' : undefined)}/></label>
      <label className="auth-field">Senha<input name="password" type="password" required minLength={isRegistration ? 8 : undefined} autoComplete={isRegistration ? 'new-password' : 'current-password'} aria-describedby={isRegistration ? (registerError ? 'register-error' : undefined) : (loginError ? 'login-error' : undefined)}/></label>
      {isRegistration && <p className="auth-footnote">Use pelo menos 8 caracteres. O cadastro cria uma conta cliente de demonstração.</p>}
      {loginError && <p id="login-error" className="auth-message error" role="alert">{loginError}</p>}
      {registerError && <p id="register-error" className="auth-message error" role="alert">{registerError}</p>}
      {registered && <p className="auth-message success" role="status">Cadastro concluído.</p>}
      <button className="auth-submit" type="submit" disabled={loading}>{loading ? <><LoaderCircle size={16} className="spin"/> {isRegistration ? 'Cadastrando…' : 'Entrando…'}</> : (isRegistration ? 'Cadastrar' : 'Entrar')}</button>
      <p className="auth-switch">{isRegistration ? 'Já tem uma conta?' : 'Não tem uma conta?'} <Link to={isRegistration ? '/login' : '/cadastro'}>{isRegistration ? 'Faça login' : 'Cadastre-se'}</Link></p>
      {!isRegistration && <div className="demo-credentials"><strong>Contas fictícias de demonstração</strong><span>Suporte: demo@labware.com.br · Labware123!</span><span>Cliente: cliente@labware.com.br · Cliente123!</span></div>}
    </form>
  </main>;
}
