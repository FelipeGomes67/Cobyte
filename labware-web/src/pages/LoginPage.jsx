import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { useAutenticacao } from '../hooks/useAuth';

export default function LoginPage({ modo = 'login' }) {
  const navegar = useNavigate();
  const localizacao = useLocation();
  const { autenticar, cadastrar, carregando, erroSessao, acessarSemLogin } = useAutenticacao();
  const [erroLogin, definirErroLogin] = useState('');
  const [erroCadastro, definirErroCadastro] = useState('');
  const [cadastrado, definirCadastrado] = useState(false);
  const ehCadastro = modo === 'cadastro';

  function abrirTelasSemLogin() {
    acessarSemLogin();
    navegar('/dashboard', { replace: true });
  }

  async function enviarLogin(evento) {
    evento.preventDefault();
    definirErroLogin('');
    const formulario = new FormData(evento.currentTarget);
    try {
      const usuario = await autenticar(formulario.get('email'), formulario.get('senha'));
      const destino = localizacao.state?.from;
      navegar(usuario.role === 'support' && destino ? destino : '/dashboard', { replace: true });
    } catch (erro) {
      definirErroLogin(erro.message || 'Não foi possível entrar.');
    }
  }

  async function enviarCadastro(evento) {
    evento.preventDefault();
    definirErroCadastro('');
    definirCadastrado(false);
    const formulario = new FormData(evento.currentTarget);
    try {
      await cadastrar({ nome: formulario.get('nome'), email: formulario.get('email'), senha: formulario.get('senha') });
      definirCadastrado(true);
      navegar('/dashboard', { replace: true });
    } catch (erro) {
      definirErroCadastro(erro.message || 'Não foi possível concluir o cadastro.');
    }
  }

    return <main className="auth-screen">
    <form className={`auth-card ${ehCadastro ? 'auth-card-register' : 'auth-card-login'}`} onSubmit={ehCadastro ? enviarCadastro : enviarLogin}>
      <img className="auth-logo" src="/cobyte-logo-white.png" alt="COBYTE"/>
      <h1>{ehCadastro ? 'Cadastro' : 'Login'}</h1>
      <div className="auth-fields">
        {ehCadastro && <div className="auth-field"><input name="nome" type="text" placeholder="Nome" aria-label="Nome" required minLength="2" maxLength="255" autoComplete="name" aria-describedby={erroCadastro ? 'register-error' : undefined}/></div>}
        <div className="auth-field"><input name="email" maxLength="255" type="email" placeholder="Email" aria-label="E-mail" required autoComplete={ehCadastro ? 'email' : 'username'} aria-describedby={ehCadastro ? (erroCadastro ? 'register-error' : undefined) : (erroLogin ? 'login-error' : undefined)}/></div>
        <div className="auth-field"><input name="senha" type="password" placeholder="Senha" aria-label="Senha" required minLength={ehCadastro ? 8 : undefined} maxLength={ehCadastro ? 72 : undefined} autoComplete={ehCadastro ? 'new-password' : 'current-password'} aria-describedby={ehCadastro ? (erroCadastro ? 'register-error' : undefined) : (erroLogin ? 'login-error' : undefined)}/></div>
      </div>
      {erroSessao && <p className="auth-message error" role="alert">{erroSessao}</p>}
      {erroLogin && <p id="login-error" className="auth-message error" role="alert">{erroLogin}</p>}
      {erroCadastro && <p id="register-error" className="auth-message error" role="alert">{erroCadastro}</p>}
      {cadastrado && <p className="auth-message success" role="status">Cadastro concluído.</p>}
      <button className="auth-submit" type="submit" disabled={carregando}>{carregando ? <><LoaderCircle size={16} className="spin"/> {ehCadastro ? 'Cadastrando…' : 'Entrando…'}</> : (ehCadastro ? 'Cadastrar' : 'Entrar')}</button>
      <div className="auth-bottom">
        {!ehCadastro && <button type="button" onClick={abrirTelasSemLogin} disabled={carregando}>Acessar sem login</button>}
        {ehCadastro && <p className="auth-footnote">Use pelo menos 8 caracteres. O cadastro cria uma conta cliente.</p>}
        <p className="auth-switch">{ehCadastro
          ? <>Já tem uma conta? Faça <Link to="/login">Login</Link></>
          : <>Não tem uma conta? <Link to="/cadastro">Cadastre-se</Link></>}</p>

      </div>
    </form>
  </main>;
}
