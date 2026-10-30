import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Clock3, Headset, Search, Ticket } from 'lucide-react';
import { createTicket } from '../services/ticketService';
import { sendNotification } from '../utils/notifications';
import { useAuth } from '../hooks/useAuth';
import { useTickets } from '../hooks/useTickets';

function Heading({ title, description, action }) {
  return <div className="page-heading"><div><div className="eyebrow">Central de Suporte</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function TicketTable({ tickets, query, onSearch }) {
  const filtered = tickets.filter(ticket => `${ticket.id} ${ticket.title} ${ticket.category}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="panel tickets-panel">
    <div className="ticket-toolbar"><div><h2>Solicitações</h2><p>{filtered.length} chamado(s) nesta lista</p></div><label className="search-box"><Search size={17}/><input placeholder="Buscar chamado..." value={query} onChange={event => onSearch(event.target.value)}/></label></div>
    <div className="ticket-table-wrap"><table><thead><tr><th>CHAMADO</th><th>ASSUNTO</th><th>CATEGORIA</th><th>PRIORIDADE</th><th>STATUS</th><th>ABERTO EM</th></tr></thead>
      <tbody>{filtered.map(ticket => <tr key={ticket.id}><td className="ticket-id">{ticket.id}</td><td className="ticket-title">{ticket.title}</td><td>{ticket.category}</td><td><span className={`priority-tag ${ticket.priority.toLowerCase()}`}>{ticket.priority}</span></td><td><span className={`status-tag ${ticket.status === 'Resolvido' ? 'done' : ticket.status === 'Aberto' ? 'open' : 'progress'}`}><i aria-hidden="true"/>{ticket.status}</span></td><td className="ticket-date">{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</td></tr>)}</tbody>
    </table>{filtered.length === 0 && <div className="empty-state">Nenhum chamado encontrado.</div>}</div>
  </section>;
}

export function TicketsPage({ mode }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tickets: allTickets, loading, error: dataError } = useTickets();
  const userTickets = user.role === 'support' ? allTickets : allTickets.filter(ticket => ticket.ownerId === user.id);
  let tickets = userTickets;
  let title = 'Todos os chamados';
  if (mode === 'mine') {
    title = 'Meus chamados';
    tickets = userTickets.filter(ticket => ticket.ownerId === user.id);
  } else if (mode === 'history') {
    title = 'Histórico de chamados';
    tickets = tickets.filter(ticket => ticket.status === 'Resolvido');
  } else if (mode === 'dashboard') {
    title = 'Dashboard';
  } else if (user.role !== 'support') {
    title = 'Meus chamados';
  }

  const openCount = userTickets.filter(ticket => ticket.status !== 'Resolvido').length;
  const resolvedCount = userTickets.filter(ticket => ticket.status === 'Resolvido').length;
  const createButton = <button className="primary-button" onClick={() => navigate('/chamados/novo')}><span>＋</span> Novo chamado</button>;
  return <>
    <Heading title={title} description="Acompanhe solicitações e atualizações da equipe de suporte." action={createButton}/>
    {mode === 'dashboard' && <div className="metric-grid dashboard-metrics">
      <article className="metric-card"><span className="metric-icon"><Ticket size={18}/></span><strong>{openCount}</strong><span>Chamados em aberto</span></article>
      <article className="metric-card metric-blue"><span className="metric-icon"><Clock3 size={18}/></span><strong>{resolvedCount}</strong><span>Chamados resolvidos</span></article>
      <article className="metric-card metric-green"><span className="metric-icon"><Check size={18}/></span><strong>{userTickets.length}</strong><span>Total de chamados</span></article>
    </div>}
    {loading && <div className="panel loading-state" role="status">Carregando chamados…</div>}
    {dataError && <div className="data-warning" role="status">{dataError}</div>}
    {!loading && <TicketTable tickets={tickets} query={query} onSearch={setQuery}/>}
    <div className="list-note"><Headset size={17}/> Precisa de ajuda? <a href="mailto:suporte@labware.com.br">Fale com o suporte LabWare</a></div>
  </>;
}

export function NewTicketPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Acesso');
  const [priority, setPriority] = useState('Média');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  function submit(event) {
    event.preventDefault();
    if (description.trim().length < 10) {
      setError('Descreva o problema com pelo menos 10 caracteres.');
      return;
    }
    let ticket;
    try {
      ticket = createTicket({ title: title.trim(), category, description: description.trim(), priority, ownerId: user.id });
    } catch {
      setError('Não foi possível salvar o chamado neste navegador. Verifique o armazenamento local e tente novamente.');
      return;
    }
    sendNotification('assigned', `Chamado ${ticket.id} criado`, ticket.title);
    if (priority === 'Crítica') sendNotification('critical', 'Chamado crítico criado', ticket.title);
    navigate('/chamados');
  }

  return <>
    <Heading title="Novo chamado" description="Conte para a equipe de suporte como podemos ajudar."/>
    <form className="panel settings-panel ticket-form" onSubmit={submit}>
      <label className="form-label">Assunto<input required maxLength="120" value={title} onChange={event => setTitle(event.target.value)} placeholder="Resuma sua solicitação"/></label>
      <label className="form-label">Categoria<select value={category} onChange={event => setCategory(event.target.value)}><option>Acesso</option><option>Integração</option><option>Indisponibilidade</option><option>Dúvida</option><option>Segurança</option><option>Outros</option></select></label>
      <label className="form-label">Prioridade<select value={priority} onChange={event => setPriority(event.target.value)}><option>Baixa</option><option>Média</option><option>Alta</option><option>Urgente</option><option>Crítica</option></select></label>
      <label className="form-label">Descrição<textarea required minLength="10" rows="6" value={description} onChange={event => setDescription(event.target.value)} placeholder="Descreva o problema e os passos para reproduzi-lo"/></label>
      {error && <p id="ticket-error" className="form-error" role="alert">{error}</p>}
      <div className="settings-footer"><button type="button" className="secondary-button" onClick={() => navigate(-1)}>Cancelar</button><button className="primary-button" type="submit">Enviar chamado</button></div>
    </form>
  </>;
}
