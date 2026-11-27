import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Mail, MailCheck, LoaderCircle } from 'lucide-react';
import LayoutAutenticacao from '../components/layout/LayoutAutenticacao';
import { solicitarRecuperacaoSenha } from '../services/recuperacaoSenhaService';
import '../css/RecuperacaoSenha.css';

export default function EsqueciSenha() {
  const [email, definirEmail] = useState('');
  const [enviando, definirEnviando] = useState(false);
  const [enviado, definirEnviado] = useState(false);
  const [erro, definirErro] = useState('');

  async function solicitar(evento) {
    evento.preventDefault();
    if (enviando || enviado) return;
    definirEnviando(true); definirErro('');
    try {
      await solicitarRecuperacaoSenha(email);
      definirEnviado(true);
    } catch (falha) {
      definirErro(falha.message || 'Não foi possível solicitar a recuperação. Tente novamente.');
    } finally { definirEnviando(false); }
  }

  return <LayoutAutenticacao>
    <section className="cartao-autenticacao cartao-recuperacao" aria-labelledby="titulo-recuperacao">
      <div className="icone-recuperacao" aria-hidden="true">{enviado ? <MailCheck size={28} /> : <Mail size={28} />}</div>
      <div className="cabecalho-autenticacao">
        <h2 id="titulo-recuperacao">{enviado ? 'Confira seu e-mail' : 'Esqueceu sua senha?'}</h2>
        <p>{enviado ? 'Se houver uma conta com esse e-mail, enviaremos um código para você criar uma nova senha.' : 'Informe o e-mail da sua conta para receber um código de recuperação de senha.'}</p>
      </div>
      {enviado ? <div className="confirmacao-recuperacao" role="status">
        <p>O código de 6 dígitos expira em 10 minutos. Confira também a pasta de spam ou lixo eletrônico.</p>
        <p>Não solicitou a alteração? Sua senha permanece a mesma.</p>
        <Link className="botao-principal" to="/redefinir-senha" state={{ email }}>Informar código e nova senha <ArrowRight size={16} aria-hidden="true" /></Link>
      </div> : <form onSubmit={solicitar}>
        <div className="campo-autenticacao">
          <label htmlFor="email-recuperacao">E-mail</label>
          <div className="envoltorio-campo">
            <Mail size={18} className="icone-campo" aria-hidden="true" />
            <input id="email-recuperacao" type="email" name="email" autoComplete="email" required maxLength={255}
              placeholder="Ex: joao@email.com" value={email} disabled={enviando}
              aria-describedby={erro ? 'erro-recuperacao' : undefined}
              onChange={evento => { definirEmail(evento.target.value); definirErro(''); }} />
          </div>
        </div>
        {erro && <p id="erro-recuperacao" className="mensagem-autenticacao mensagem-erro" role="alert">{erro}</p>}
        <button type="submit" className="botao-principal" disabled={enviando}>
          {enviando ? <><LoaderCircle size={18} className="carregando" aria-hidden="true" /> Enviando...</>
            : <>Enviar código de recuperação <ArrowRight size={16} aria-hidden="true" /></>}
        </button>
      </form>}
      <Link to="/login" className="voltar-login"><ArrowLeft size={16} aria-hidden="true" /> Voltar para o login</Link>
    </section>
  </LayoutAutenticacao>;
}
