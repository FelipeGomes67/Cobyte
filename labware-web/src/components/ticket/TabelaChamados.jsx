import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TabelaChamados({ tickets, query, onSearch, titulo = 'Solicitações', subtitulo, descricao, rotaBase = '/chamados' }) {
  const filtrados = tickets.filter(chamado => `${chamado.id} ${chamado.title} ${chamado.category}`.toLowerCase().includes(query.toLowerCase()));

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
        <thead><tr><th>CHAMADO</th><th>ASSUNTO</th><th>CATEGORIA</th><th>PRIORIDADE</th><th>STATUS</th><th>ABERTO EM</th></tr></thead>
        <tbody>{filtrados.map(chamado => <tr key={chamado.id}>
          <td className="ticket-id"><Link to={`${rotaBase}/${encodeURIComponent(chamado.id)}`} aria-label={`Ver chamado ${chamado.id}`}>{chamado.id}</Link></td>
          <td className="ticket-title"><Link to={`${rotaBase}/${encodeURIComponent(chamado.id)}`}>{chamado.title}</Link></td>
          <td>{chamado.category}</td>
          <td><span className={`priority-tag ${chamado.priority.toLowerCase()}`}>{chamado.priority}</span></td>
          <td><span className={`status-tag ${chamado.status === 'Resolvido' ? 'done' : chamado.status === 'Aberto' ? 'open' : 'progress'}`}><i aria-hidden="true"/>{chamado.status}</span></td>
          <td className="ticket-date">{new Date(chamado.createdAt).toLocaleDateString('pt-BR')}</td>
        </tr>)}</tbody>
      </table>
      {filtrados.length === 0 && <div className="empty-state">Nenhum chamado encontrado.</div>}
    </div>
  </section>;
}
