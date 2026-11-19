import { obterVisualNotificacao } from '../../utils/notificacaoVisual';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { marcarNotificacao } from '../../services/notificacaoService';
export default function NotificationDropdown({ onClose, onViewAll, dados }) {
  const navigate = useNavigate();
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  async function marcar(id, abrir) {
    setOcupado(true); setErro('');
    try {
      await marcarNotificacao(id);
      if (abrir) { onClose(); navigate('/chamados/' + abrir); }
    } catch { setErro('Não foi possível marcar como lida.'); }
    finally { setOcupado(false); }
  }
  return <section className="notification-dropdown-card notificacoes-reais" aria-label="Notificações recentes">
    <h3>Notificações {dados.naoLidas > 0 && '(' + dados.naoLidas + ')'}</h3>
    {(erro || dados.erro) && <p role="alert">{erro || dados.erro}</p>}
    {dados.carregando ? <p>Carregando...</p> : !dados.content.length && <p>Nenhuma notificação por enquanto.</p>}
    <div className="notification-dropdown-list">{dados.content.map(item => { const visual = obterVisualNotificacao(item); const Icone = visual.Icone; return <article key={item.id} className={(visual.destaque || '') + ' ' + (item.lida ? 'aviso-lido' : 'aviso-nao-lido')}>
      <strong className="notificacao-dropdown-titulo"><span className="notificacao-dropdown-icone" style={{ color: visual.cor, backgroundColor: visual.fundo }}><Icone size={18} aria-hidden="true" /></span>{visual.titulo}</strong><p>{visual.mensagem}</p><small>{new Date(item.criadoEm).toLocaleString('pt-BR')}</small>
      <div className="aviso-acoes">{item.chamadoId && <button disabled={ocupado} onClick={() => marcar(item.id, item.chamadoId)}>Ver chamado</button>}
      {!item.lida && <button disabled={ocupado} onClick={() => marcar(item.id)}>Marcar como lida</button>}</div>
    </article>; })}</div>
    <div className="aviso-acoes"><button disabled={ocupado || !dados.naoLidas} onClick={() => marcar(null)}>Marcar todas como lidas</button><button onClick={onViewAll}>Ver todas</button></div>
  </section>;
}
