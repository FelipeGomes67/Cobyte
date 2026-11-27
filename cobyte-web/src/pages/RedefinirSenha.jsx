import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCheck, Eye, EyeOff, Lock, LoaderCircle } from 'lucide-react';
import LayoutAutenticacao from '../components/layout/LayoutAutenticacao';
import { redefinirSenha } from '../services/recuperacaoSenhaService';
import '../css/RecuperacaoSenha.css';

export default function RedefinirSenha() {
  const localizacao = useLocation();
  const navegar = useNavigate();
  const email = localizacao.state?.email || '';
  const autorizacao = localizacao.state?.autorizacao || '';
  const autorizado = Boolean(email) && /^[A-Za-z0-9_-]{43}$/.test(autorizacao);
  const [senha, definirSenha] = useState('');
  const [confirmacao, definirConfirmacao] = useState('');
  const [mostrar, definirMostrar] = useState(false);
  const [salvando, definirSalvando] = useState(false);
  const [concluido, definirConcluido] = useState(false);
  const [erro, definirErro] = useState('');

  async function salvar(evento) {
    evento.preventDefault();
    if (salvando || !autorizado) return;
    if (senha !== confirmacao) { definirErro('As senhas precisam ser iguais.'); return; }
    if (new TextEncoder().encode(senha).length > 72) { definirErro('A senha deve ter no máximo 72 bytes. Use uma senha menor.'); return; }
    definirSalvando(true); definirErro('');
    try {
      await redefinirSenha(email, autorizacao, senha);
      definirConcluido(true); definirSenha(''); definirConfirmacao('');
      navegar('/redefinir-senha', { replace: true, state: null });
    } catch (falha) {
      definirErro(falha.message || 'Não foi possível redefinir sua senha. Solicite um novo código e tente novamente.');
    } finally { definirSalvando(false); }
  }

  return <LayoutAutenticacao>
    <section className="cartao-autenticacao cartao-recuperacao" aria-labelledby="titulo-nova-senha">
      <div className="icone-recuperacao" aria-hidden="true">{concluido ? <CheckCheck size={28} /> : <Lock size={28} />}</div>
      <div className="cabecalho-autenticacao">
        <h2 id="titulo-nova-senha">{concluido ? 'Senha atualizada!' : 'Crie uma nova senha'}</h2>
        <p>{concluido ? 'Sua senha foi alterada. Entre novamente para acessar a plataforma.' : autorizado ? 'Código confirmado! Escolha uma senha com pelo menos 8 caracteres.' : 'Confirme o código enviado ao seu e-mail para criar uma nova senha.'}</p>
      </div>
      {concluido ? <p className="confirmacao-recuperacao" role="status">As sessões anteriores foram encerradas.</p>
        : !autorizado ? <Link to="/esqueci-senha" className="voltar-login">Informar código de recuperação</Link>
        : <form onSubmit={salvar}>
          <div className="campos-autenticacao">
            {[{ id: 'nova-senha', rotulo: 'Nova senha', valor: senha, definir: definirSenha },
              { id: 'confirmar-senha', rotulo: 'Confirmar nova senha', valor: confirmacao, definir: definirConfirmacao }].map(campo =>
              <div className="campo-autenticacao" key={campo.id}>
                <label htmlFor={campo.id}>{campo.rotulo}</label>
                <div className="envoltorio-campo">
                  <Lock size={18} className="icone-campo" aria-hidden="true" />
                  <input id={campo.id} type={mostrar ? 'text' : 'password'} required minLength={8} maxLength={72}
                    autoComplete="new-password" placeholder={campo.rotulo} disabled={salvando} value={campo.valor}
                    aria-describedby={erro ? 'erro-nova-senha' : undefined}
                    onChange={evento => { campo.definir(evento.target.value); definirErro(''); }} />
                  <button type="button" className="botao-visualizar-senha" aria-label={mostrar ? 'Ocultar senhas' : 'Mostrar senhas'}
                    onClick={() => definirMostrar(!mostrar)}>{mostrar ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </div>)}
          </div>
          {erro && <p id="erro-nova-senha" className="mensagem-autenticacao mensagem-erro" role="alert">{erro} <Link to="/esqueci-senha">Solicitar novo código</Link></p>}
          <button type="submit" className="botao-principal" disabled={salvando}>
            {salvando ? <><LoaderCircle size={18} className="carregando" /> Salvando...</> : <>Salvar nova senha <ArrowRight size={16} /></>}
          </button>
        </form>}
      <Link to="/login" className="voltar-login"><ArrowLeft size={16} aria-hidden="true" /> Voltar para o login</Link>
    </section>
  </LayoutAutenticacao>;
}
