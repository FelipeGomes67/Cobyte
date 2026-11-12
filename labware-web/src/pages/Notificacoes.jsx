import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotificacoes } from '../hooks/useNotificacoes';
import { marcarNotificacao } from '../services/notificacaoService';
import '../css/NotificacoesReais.css';
export default function Notificacoes() {
  const [page, setPage] = useState(0);
  const dados = useNotificacoes(page);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  async function marcar(id) {
    setOcupado(true); setErro('');
    try { await marcarNotificacao(id); } catch { setErro('Não foi possível atualizar a leitura.'); }
    finally { setOcupado(false); }
  }
  return <div className="notificacoes-reais">
    <div className="page-heading"><div><h1>Notificações</h1><p>{dados.naoLidas} não lidas</p></div>
      <Link to="/configuracoes?aba=notificacoes" className="secondary-button">Configurar notificações</Link></div>
    <section className="panel notificacoes-painel">
      <button className="secondary-button" disabled={ocupado || !dados.naoLidas} onClick={() => marcar(null)}>Marcar todas como lidas</button>
      {(erro || dados.erro) && <p role="alert">{erro || dados.erro}</p>}
      {dados.carregando ? <p>Carregando...</p> : !dados.content.length && <p>Nenhuma notificação por enquanto.</p>}
      {dados.content.map(item => <article key={item.id} className={item.lida ? 'aviso-lido' : 'aviso-nao-lido'}>
        <strong>{item.titulo}</strong><p>{item.mensagem}</p><small>{new Date(item.criadoEm).toLocaleString('pt-BR')} · {item.lida ? 'Lida' : 'Não lida'}</small>
        <div className="aviso-acoes">{item.chamadoId && <Link to={'/chamados/' + item.chamadoId}>Ver chamado</Link>}
          {!item.lida && <button disabled={ocupado} onClick={() => marcar(item.id)}>Marcar como lida</button>}</div>
      </article>)}
      <nav className="aviso-acoes" aria-label="Páginas de notificações"><button disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page + 1} de {Math.max(1, dados.totalPages)}</span><button disabled={page + 1 >= dados.totalPages} onClick={() => setPage(page + 1)}>Próxima</button></nav>
    </section>
  </div>;
}
