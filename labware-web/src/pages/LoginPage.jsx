import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn } from '../data/mockDatabase';

export default function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  function submit(event) {
    event.preventDefault(); 
    const form = new FormData(event.currentTarget);
    if (!signIn(form.get('email'), form.get('password'))) {
      setError('E-mail ou senha incorretos. Use a conta de demonstração abaixo.');
      return;
    }
    navigate('/dashboard', { replace: true });
  }

  return <main className="login-screen"><form className="login-card" onSubmit={submit}>
    <img className="login-logo" src="/Propriedade%201=Padr%C3%A3o.png" alt="LabWare"/>
    <div className="eyebrow">CENTRAL DE SUPORTE</div><h1>Bem-vindo à LabWare</h1><p>Acesse sua conta para acompanhar os chamados.</p>
    <label className="form-label">E-mail<input name="email" type="email" required defaultValue="demo@labware.com.br" autoComplete="username"/></label>
    <label className="form-label">Senha<input name="password" type="password" required defaultValue="Labware123!" autoComplete="current-password"/></label>
    {error && <p className="form-error">{error}</p>}
    <button className="primary-button" type="submit">Entrar na plataforma</button>
    <div className="demo-credentials"><strong>Acesso de demonstração</strong><span>demo@labware.com.br</span><span>Labware123!</span></div>
  </form></main>;
}
