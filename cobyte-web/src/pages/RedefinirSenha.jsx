import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCheck, Eye, EyeOff, Lock, LoaderCircle, Mail, KeyRound } from 'lucide-react';
import LayoutAutenticacao from '../components/layout/LayoutAutenticacao';
import { redefinirSenha } from '../services/recuperacaoSenhaService';
import '../css/RecuperacaoSenha.css';

export default function RedefinirSenha() {
  const localizacao = useLocation();
  const [email, definirEmail] = useState(localizacao.state?.email || '');
  const [codigo, definirCodigo] = useState('');
  const [senha, definirSenha] = useState('');
  const [confirmacao, definirConfirmacao] = useState('');
  const [mostrar, definirMostrar] = useState(false);
  const [salvando, definirSalvando] = useState(false);
  const [concluido, definirConcluido] = useState(false);
  const [erro, definirErro] = useState('');

  async function salvar(evento) {
    evento.preventDefault();
    if (salvando || !/^[0-9]{6}$/.test(codigo)) return;
    if (senha !== confirmacao) { definirErro('As senhas precisam ser iguais.'); return; }
    if (new TextEncoder().encode(senha).length > 72) { definirErro('A senha deve ter no máximo 72 bytes. Use uma senha menor.'); return; }
    definirSalvando(true); definirErro('');
    try {
      await redefinirSenha(email, codigo, senha);
      definirConcluido(true); definirSenha(''); definirConfirmacao(''); definirCodigo('');
    } catch (falha) {
      definirErro(falha.message || 'Não foi possível redefinir sua senha. Solicite um novo código e tente novamente.');
    } finally { definirSalvando(false); }
  }

  return <LayoutAutenticacao>
    <section className="cartao-autenticacao cartao-recuperacao" aria-labelledby="titulo-nova-senha">
      <div className="icone-recuperacao" aria-hidden="true">{concluido ? <CheckCheck size={28} /> : <Lock size={28} />}</div>
      <div className="cabecalho-autenticacao">
        <h2 id="titulo-nova-senha">{concluido ? 'Senha atualizada!' : 'Crie uma nova senha'}</h2>
        <p>{concluido ? 'Sua senha foi alterada. Entre novamente para acessar a plataforma.' : 'Informe o código recebido por e-mail e escolha uma senha com pelo menos 8 caracteres.'}</p>
      </div>
      {concluido ? <p className="confirmacao-recuperacao" role="status">As sessões anteriores foram encerradas.</p>
        : <form onSubmit={salvar}>
          <div className="campos-autenticacao">
            <div className="campo-autenticacao">
              <label htmlFor="email-nova-senha">E-mail da conta</label>
              <div className="envoltorio-campo">
                <Mail size={18} className="icone-campo" aria-hidden="true" />
                <input id="email-nova-senha" type="email" autoComplete="email" required maxLength={255}
                  value={email} placeholder="Ex: joao@email.com" disabled={salvando}
                  onChange={evento => { definirEmail(evento.target.value); definirErro(''); }} />
              </div>
            </div>
            <div className="campo-autenticacao">
              <label htmlFor="codigo-recuperacao">Código recebido por e-mail</label>
              <div className="envoltorio-campo">
                <KeyRound size={18} className="icone-campo" aria-hidden="true" />
                <input id="codigo-recuperacao" type="text" inputMode="numeric" autoComplete="one-time-code"
                  required minLength={6} maxLength={6} pattern="[0-9]{6}" placeholder="000000" disabled={salvando}
                  value={codigo} aria-describedby="dica-codigo"
                  onChange={evento => { definirCodigo(evento.target.value.replace(/\D/g, '').slice(0, 6)); definirErro(''); }} />
              </div>
              <span className="dica-senha" id="dica-codigo">Válido por 10 minutos. Após 5 tentativas incorretas, solicite outro código.</span>
            </div>
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
