
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LoaderCircle, Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAutenticacao } from '../hooks/useAuth';

export default function LoginPage({ modo = 'login' }) {
  const navegar = useNavigate();
  const localizacao = useLocation();
  const { autenticar, cadastrar, carregando, erroSessao, acessarSemLogin } = useAutenticacao();

  const [erroLogin, definirErroLogin] = useState('');
  const [erroCadastro, definirErroCadastro] = useState('');
  const [mostrarSenha, definirMostrarSenha] = useState(false);

  const ehCadastro = modo === 'cadastro';

  function acessarComoVisitante() {
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
      definirErroLogin(erro.message || 'Credenciais inválidas. Verifique seu e-mail e senha.');
    }
  }

  async function enviarCadastro(evento) {
    evento.preventDefault();
    definirErroCadastro('');

    const formulario = new FormData(evento.currentTarget);

    try {
      await cadastrar({
        nome: formulario.get('nome'),
        email: formulario.get('email'),
        senha: formulario.get('senha')
      });

      navegar('/dashboard', { replace: true });
    } catch (erro) {
      definirErroCadastro(erro.message || 'Não foi possível concluir o cadastro.');
    }
  }

  return (
    <main className="tela-autenticacao">
      <div className="conteudo-autenticacao">
        <section className="identidade-marca">
          <div className="logo-marca-conteudo">
            <img className="logo-marca" src="/cobyte-logo-white.png" alt="CoByte" />
          </div>

          <div className="texto-apresentacao">
            <h1>
              Seu suporte,
              <span className="destaque-claro">mais próximo.</span>
              <span className="destaque-azul">Tudo conectado.</span>
            </h1>

            <p>
              Acompanhe suas solicitações, converse com a equipe e fique por dentro de cada atualização em um só lugar.
            </p>
          </div>
        </section>

        <section className="cartao-autenticacao-conteudo">
          <form className="cartao-autenticacao" onSubmit={ehCadastro ? enviarCadastro : enviarLogin}>
            <div className="cabecalho-autenticacao">
              <h2>{ehCadastro ? 'Crie sua conta' : 'Acesse sua plataforma'}</h2>
              <p>
                {ehCadastro
                  ? 'Cadastre-se para acompanhar seus chamados e interagir com a equipe de suporte.'
                  : 'Entre com suas credenciais para continuar.'}
              </p>
            </div>

            <div className="campos-autenticacao">
              {ehCadastro && (
                <div className="campo-autenticacao">
                  <label htmlFor="nome">Nome completo</label>
                  <div className="envoltorio-campo">
                    <User size={18} className="icone-campo" />
                    <input id="nome" name="nome" type="text" placeholder="Ex: João da Silva" required minLength={2} maxLength={255} autoComplete="name" />
                  </div>
                </div>
              )}

              <div className="campo-autenticacao">
                <label htmlFor="email">E-mail</label>
                <div className="envoltorio-campo">
                  <Mail size={18} className="icone-campo" />
                  <input id="email" name="email" type="email" placeholder="Ex: joao@email.com" required maxLength={255} autoComplete={ehCadastro ? 'email' : 'username'} />
                </div>
              </div>

              <div className="campo-autenticacao">
                <label htmlFor="senha">Senha</label>
                <div className="envoltorio-campo">
                  <Lock size={18} className="icone-campo" />
                  <input id="senha" name="senha" type={mostrarSenha ? 'text' : 'password'} placeholder="Insira sua senha" required minLength={ehCadastro ? 8 : undefined} maxLength={ehCadastro ? 72 : undefined} autoComplete={ehCadastro ? 'new-password' : 'current-password'} />

                  <button
                    type="button"
                    className="botao-visualizar-senha"
                    onClick={() => definirMostrarSenha(!mostrarSenha)}
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {ehCadastro && <span className="dica-senha">Mínimo de 8 caracteres.</span>}

                {!ehCadastro && (
                  <div className="recuperar-senha">
                    <Link to="/esqueci-senha">Esqueceu sua senha?</Link>
                  </div>
                )}
              </div>
            </div>

            {erroSessao && <p className="mensagem-autenticacao mensagem-erro" role="alert">{erroSessao}</p>}
            {erroLogin && <p className="mensagem-autenticacao mensagem-erro" role="alert">{erroLogin}</p>}
            {erroCadastro && <p className="mensagem-autenticacao mensagem-erro" role="alert">{erroCadastro}</p>}

            <button className="botao-principal" type="submit" disabled={carregando}>
              {carregando ? (
                <>
                  <LoaderCircle size={18} className="carregando" />
                  {ehCadastro ? 'Cadastrando...' : 'Entrando...'}
                </>
              ) : (
                <>
                  {ehCadastro ? 'Cadastrar' : 'Entrar'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {!ehCadastro && (
              <>
                <div className="divisor-autenticacao"><span>ou</span></div>
                <button type="button" className="botao-visitante" onClick={acessarComoVisitante} disabled={carregando}>
                  Acessar sem login
                </button>
              </>
            )}

            <div className="rodape-autenticacao">
              <p className="link-autenticacao">
                {ehCadastro
                  ? <>Já tem uma conta? <Link to="/login">Faça login</Link></>
                  : <>Não tem uma conta? <Link to="/cadastro">Cadastre-se</Link></>}
              </p>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
