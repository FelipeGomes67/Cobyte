import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { obterVisualNotificacao } from '../utils/notificacaoVisual';
import { useNotificacoes } from '../hooks/useNotificacoes';
import { marcarNotificacao, EVENTO_NOTIFICACOES } from '../services/notificacaoService';
import EstadoConteudo from '../components/common/EstadoConteudo';
import '../css/Notificacoes.css';

const abas = [
  ['todas', 'Todas'], ['nao-lidas', 'Não lidas'],
  ['mensagens', 'Mensagens'], ['chamados', 'Chamados'],
];

export default function Notificacoes() {
  const navegar = useNavigate();
  const [aba, setAba] = useState('todas');
  const [page, setPage] = useState(0);
  const dados = useNotificacoes(page, 20, aba);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function marcar(id, chamadoId) {
    if (ocupado) return;
    setOcupado(true); setErro('');
    try {
      await marcarNotificacao(id);
      setPage(0);
      if (chamadoId) navegar('/chamados/' + encodeURIComponent(chamadoId));
    } catch (falha) {
      setErro(falha.message || 'Não foi possível atualizar a leitura. Tente novamente.');
    } finally { setOcupado(false); }
  }

  function abrir(item) {
    if (item.lida) navegar('/chamados/' + encodeURIComponent(item.chamadoId));
    else marcar(item.id, item.chamadoId);
  }

  return <div className="notificacoes-container">
    <header className="notificacoes-header notificacoes-cabecalho-real">
      <div><small className="subtitulo-app">Suporte Cobyte</small><h1 className="notificacoes-main-title">Notificações</h1>
        <p className="descricao-pagina">Acompanhe seus alertas importantes. {dados.naoLidas} não lidas.</p></div>
      <Link to="/configuracoes?aba=notificacoes" className="secondary-button">Configurar notificações</Link>
    </header>
    <section className="card-notificacoes-wrapper" aria-label="Central de notificações" aria-busy={dados.carregando}>
      <div className="tabs-notificacao">
        <div className="tabs-grupo" role="group" aria-label="Filtrar notificações">
          {abas.map(([valor, nome]) => <button type="button" key={valor} aria-pressed={aba === valor}
            className={'tab-btn-n ' + (aba === valor ? 'ativa' : '')}
            onClick={() => { setAba(valor); setPage(0); setErro(''); }}>{nome}</button>)}
        </div>
        <button type="button" className="btn-link-marcar-lidas" disabled={dados.carregando || ocupado || !dados.naoLidas}
          onClick={() => marcar(null)}>Marcar todas como lidas</button>
      </div>
      {erro && <EstadoConteudo tipo="erro" mensagem={erro} />}
      {dados.erro && <EstadoConteudo tipo="erro" mensagem={dados.erro}
        onTentar={() => window.dispatchEvent(new Event(EVENTO_NOTIFICACOES))} />}
      {dados.carregando ? <EstadoConteudo tipo="carregando" mensagem="Carregando notificações..." />
        : !dados.erro && !dados.content.length ? <EstadoConteudo mensagem="Nenhuma notificação encontrada neste filtro." /> : null}
      <div className="lista-notificacoes-itens">
        {!dados.carregando && dados.content.map(item => {
          const visual = obterVisualNotificacao(item);
          const Icone = visual.Icone;
          return <article key={item.id} className={'item-notificacao ' + (visual.destaque || '') + ' ' + (item.lida ? 'notificacao-lida' : 'notificacao-nao-lida')}>
            <div className="status-icon-circle" style={{ color: visual.cor, backgroundColor: visual.fundo }}><Icone size={20} aria-hidden="true" /></div>
            <div className="item-info-conteudo">
              <p className="item-titulo">{visual.titulo}</p><p className="item-mensagem">{visual.mensagem}</p>
              <small className="item-data">{new Date(item.criadoEm).toLocaleString('pt-BR')} · {item.lida ? 'Lida' : 'Não lida'}</small>
            </div>
            <div className="notificacao-acoes">
              {item.chamadoId && <button type="button" disabled={ocupado} className="btn-acao-ver-chamado"
                onClick={() => abrir(item)}>Ver chamado</button>}
              {!item.lida && <button type="button" disabled={ocupado} className="secondary-button"
                onClick={() => marcar(item.id)}>Marcar como lida</button>}
            </div>
          </article>;
        })}
      </div>
      <nav className="notificacao-paginacao" aria-label="Páginas de notificações">
        <button type="button" className="secondary-button" disabled={dados.carregando || ocupado || page === 0} onClick={() => setPage(p => p - 1)}>Anterior</button>
        <span aria-live="polite">Página {page + 1} de {Math.max(1, dados.totalPages)}</span>
        <button type="button" className="secondary-button" disabled={dados.carregando || ocupado || page + 1 >= dados.totalPages} onClick={() => setPage(p => p + 1)}>Próxima</button>
      </nav>
    </section>
  </div>;
}
