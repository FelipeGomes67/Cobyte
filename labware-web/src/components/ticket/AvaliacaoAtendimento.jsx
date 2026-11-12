import { useState } from 'react';
import { useAutenticacao } from '../../hooks/useAuth';
import { avaliarAtendimento } from '../../services/ticketService';

export default function AvaliacaoAtendimento({ chamado, onAtualizado }) {
  const { usuario } = useAutenticacao();
  const [nota, setNota] = useState('');
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const finalizado = ['RESOLVIDO', 'FECHADO', 'Resolvido', 'Fechado'].includes(chamado.statusRaw || chamado.status);
  const solicitante = usuario?.perfil === 'CLIENTE' && String(usuario.id) === String(chamado.solicitanteId);
  if (!finalizado) return null;
  async function enviar(evento) {
    evento.preventDefault();
    if (enviando || !nota) return;
    setEnviando(true); setErro('');
    try {
      const atualizado = await avaliarAtendimento(chamado.id, Number(nota), comentario.trim() || null);
      onAtualizado(atualizado);
    } catch (e) {
      setErro(e.response?.data?.message || e.response?.data?.detail || 'Não foi possível enviar a avaliação.');
    } finally { setEnviando(false); }
  }
  return <section className="history-info-card avaliacao-atendimento">
    <h4>Avaliação do atendimento</h4>
    {chamado.notaAvaliacao ? <div role="status">
      <p className="avaliacao-estrelas" aria-label={chamado.notaAvaliacao + ' de 5 estrelas'}>{'★'.repeat(chamado.notaAvaliacao)}{'☆'.repeat(5 - chamado.notaAvaliacao)}</p>
      <p>Avaliação registrada. Obrigado!</p>
      {chamado.comentarioAvaliacao && <p className="avaliacao-comentario">{chamado.comentarioAvaliacao}</p>}
    </div> : solicitante ? <form onSubmit={enviar}>
      <fieldset className="avaliacao-selecao" disabled={enviando}>
        <legend>Como foi o atendimento?</legend>
        <div className="avaliacao-opcoes">
          {[1, 2, 3, 4, 5].map(n => <label key={n} className="avaliacao-estrela">
            <input type="radio" name={'nota-' + chamado.id} value={n} checked={Number(nota) === n} onChange={() => setNota(String(n))} aria-label={n + (n === 1 ? ' estrela' : ' estrelas')} required />
            <span aria-hidden="true" className={Number(nota) >= n ? 'preenchida' : ''}>{Number(nota) >= n ? '★' : '☆'}</span>
          </label>)}
        </div>
        <small aria-live="polite">{nota ? nota + (nota === '1' ? ' estrela selecionada' : ' estrelas selecionadas') : 'Selecione de 1 a 5 estrelas'}</small>
      </fieldset>
      <label>Comentário opcional<textarea rows={3} maxLength={500} value={comentario} onChange={e => setComentario(e.target.value)} disabled={enviando} /></label>
      <small>{comentario.length}/500 caracteres</small>
      {chamado.statusRaw === 'RESOLVIDO' && <p>Enviar a avaliação também confirma a resolução e fecha o chamado.</p>}
      {erro && <p role="alert">{erro}</p>}
      <button type="submit" className="primary-button wide-button" disabled={enviando || !nota}>{enviando ? 'Enviando...' : 'Enviar avaliação'}</button>
    </form> : <p>Aguardando a avaliação do solicitante.</p>}
  </section>;
}
