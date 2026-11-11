import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';

function obterClasseStatus(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('resolvido') || s.includes('fechado')) return 'done';
  if (s.includes('aberto')) return 'open';
  return 'progress';
}

export default function TabelaChamados({ tickets, query, onSearch, titulo = 'Solicitações', subtitulo, descricao, rotaBase = '/chamados', historico = false }) {
  const filtrados = (tickets || []).filter(chamado => {
    const texto = `${chamado.protocolo || chamado.id} ${chamado.titulo || chamado.title} ${chamado.categoria || chamado.category}`.toLowerCase();
    return texto.includes((query || '').toLowerCase());
  });

  return <section className="panel tickets-panel">
    <div className="ticket-toolbar">
      <div>
        {subtitulo && <p>{subtitulo}</p>}
        <h2>{titulo}</h2>
        {descricao && <p>{descricao}</p>}
      </div>
      <label className="search-box"><Search size={17}/><input aria-label="Buscar chamado" placeholder="Buscar chamado..." value={query} onChange={evento => onSearch(evento.target.value)}/></label>
    </div>
    <div className="ticket-table-wrap">
      <table>
        <thead><tr><th>CHAMADO</th><th>ASSUNTO</th><th>CATEGORIA</th><th>PRIORIDADE</th><th>STATUS</th><th>{historico ? 'RESOLVIDO EM' : 'ABERTO EM'}</th></tr></thead>
        <tbody>{filtrados.map(chamado => {
          const linkDestino = `${rotaBase}/${encodeURIComponent(chamado.id)}`;
          const dataResolvido = chamado.resolvidoEm || chamado.resolvedAt;
          const dataCriacao = chamado.dataCriacao || chamado.abertoEm || chamado.createdAt;
          const dataExibida = historico
            ? (dataResolvido ? new Date(dataResolvido).toLocaleDateString('pt-BR') : '—')
            : (dataCriacao ? new Date(dataCriacao).toLocaleDateString('pt-BR') : '—');

          return (
            <tr key={chamado.id}>
              <td className="ticket-id"><Link to={linkDestino} aria-label={`Ver chamado ${chamado.protocolo || chamado.id}`}>{chamado.protocolo || chamado.id}</Link></td>
              <td className="ticket-title"><Link to={linkDestino}>{chamado.titulo || chamado.title}</Link></td>
              <td>{chamado.categoria || chamado.category}</td>
              <td><span className={`priority-tag ${(chamado.prioridade || chamado.priority || '').toLowerCase()}`}>{chamado.prioridade || chamado.priority}</span></td>
              <td><span className={`status-tag ${obterClasseStatus(chamado.status)}`}><i aria-hidden="true"/>{chamado.status}</span></td>
              <td className="ticket-date">{dataExibida}</td>
            </tr>
          );
        })}</tbody>
      </table>
      {filtrados.length === 0 && <div className="empty-state">Nenhum chamado encontrado.</div>}
    </div>
  </section>;
}
