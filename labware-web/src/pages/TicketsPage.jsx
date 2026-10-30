import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CalendarDays, Check, Clock3, FileText, Headset, Search, Tag, Ticket, User, X } from 'lucide-react';
import { createTicket } from '../services/ticketService';
import { sendNotification } from '../utils/notifications';
import { useAuth } from '../hooks/useAuth';
import { useTickets } from '../hooks/useTickets';

function TicketDetailsModal({ ticket, onClose }) {
  useEffect(() => {
    if (!ticket) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [ticket, onClose]);

  if (!ticket) return null;

  const description = ticket.description || `Solicitação da categoria ${ticket.category} referente a "${ticket.title}". O cliente reportou o problema e acompanha a resolução do atendimento via suporte.`;
  const isHistoryDetail = ticket.status === 'Resolvido';
  const resolvedAt = ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleDateString('pt-BR') : new Date(ticket.createdAt).toLocaleDateString('pt-BR');

  if (isHistoryDetail) {
    return (
      <div className="dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
        <section className="ticket-detail-dialog history-detail-modal" role="dialog" aria-modal="true" aria-labelledby="ticket-detail-title">
          <button className="dialog-close" onClick={onClose} aria-label="Fechar detalhes do chamado"><X size={17}/></button>

          <header className="history-modal-header">
            <div className="history-modal-brand">
              <div className="history-modal-logo"><Ticket size={18}/></div>
              <div>
                <div className="eyebrow">Central de Suporte</div>
                <h2>Detalhes</h2>
              </div>
            </div>
          </header>

          <div className="history-modal-layout">
            <main className="history-modal-main">
              <div className="history-header-row">
                <span className="history-ticket-code">{ticket.id}</span>
                <span className={`status-tag ${ticket.status === 'Resolvido' ? 'done' : ticket.status === 'Aberto' ? 'open' : 'progress'}`}><i aria-hidden="true"/>{ticket.status}</span>
              </div>

              <h3 className="history-title">{ticket.title}</h3>
              <p className="history-description">{description}</p>

              <div className="history-people-row">
                <div className="history-person-box">
                  <span className="history-person-label">Responsável</span>
                  <strong>Ronaldo</strong>
                </div>
                <div className="history-person-box">
                  <span className="history-person-label">Suporte</span>
                  <strong>Ruffles</strong>
                </div>
              </div>

              <div className="history-conversation">
                <div className="history-conversation-header">
                  <span className="conversation-pill">Conversa</span>
                  <span className="conversation-date">{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>

                <div className="history-message-row">
                  <div className="avatar small-avatar">R</div>
                  <div className="history-message-card customer-message">
                    <strong>Ronaldo</strong>
                    <p>O sistema está instável e a equipe realizou a correção no ambiente de produção. A manutenção foi validada e o chamado foi encerrado com sucesso.</p>
                  </div>
                </div>

                <div className="history-message-row right-align">
                  <div className="history-message-card support-message">
                    <strong>Ruffles</strong>
                    <p>O erro foi corrigido e o processo de monitoramento foi ajustado para evitar recorrência. Seguimos atento ao comportamento do sistema.</p>
                  </div>
                  <div className="avatar small-avatar support-avatar">S</div>
                </div>

                <div className="history-message-composer">
                  <input type="text" placeholder="Nova mensagem" />
                  <button className="primary-button">Enviar mensagem</button>
                </div>
              </div>

              <div className="history-evidences">
                <div className="evidence-header">
                  <h4>Evidências</h4>
                  <button type="button" className="secondary-button small-button">Baixar</button>
                </div>
                <div className="evidence-item">
                  <span className="evidence-text">Captura de tela 2026-10-27 10:14:25.png</span>
                  <span className="evidence-size">1.4 MB</span>
                </div>
              </div>

              <div className="history-rating">
                <h4>Avaliação do cliente</h4>
                <div className="stars" aria-label="Avaliação 4 de 5">★★★★★</div>
                <p>Boa</p>
                <small>{resolvedAt}</small>
              </div>
            </main>

            <aside className="history-modal-sidebar">
              <div className="history-summary-card">
                <div className="summary-header">
                  <span className="summary-label">LABWARE</span>
                  <span className="summary-progress">Cumprido</span>
                </div>

                <div className="summary-grid">
                  <div className="summary-item"><span>Prioridade</span><strong>{ticket.priority}</strong></div>
                  <div className="summary-item"><span>Responsável</span><strong>Lucas Ribeiro</strong></div>
                  <div className="summary-item"><span>Categoria</span><strong>{ticket.category}</strong></div>
                  <div className="summary-item"><span>Origem</span><strong>AUDIO VOZ</strong></div>
                  <div className="summary-item"><span>Última resposta</span><strong>{resolvedAt}</strong></div>
                  <div className="summary-item"><span>Data de criação</span><strong>{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</strong></div>
                </div>

                <button className="secondary-button wide-button">Reabrir chamado</button>
              </div>

              <div className="history-info-card">
                <h4>Atendimento</h4>
                <p>Chamado encerrado. Reabra o atendimento para registrar nova atualização.</p>
              </div>
            </aside>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="ticket-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="ticket-detail-title">
        <button className="dialog-close" onClick={onClose} aria-label="Fechar detalhes do chamado">
          <X size={17} />
        </button>

        <div className="ticket-modal-header">
          <span className="dialog-icon ticket-modal-icon"><Ticket size={20} /></span>
          <div>
            <small>Chamado {ticket.id}</small>
            <h2 id="ticket-detail-title">{ticket.title}</h2>
          </div>
        </div>

        <div className="ticket-detail-grid">
          <div className="detail-item">
            <span className="detail-label"><Tag size={12} />Categoria</span>
            <strong>{ticket.category}</strong>
          </div>
          <div className="detail-item">
            <span className="detail-label"><Clock3 size={12} />Prioridade</span>
            <strong className={`priority-tag ${ticket.priority.toLowerCase()}`}>{ticket.priority}</strong>
          </div>
          <div className="detail-item">
            <span className="detail-label"><Check size={12} />Status</span>
            <strong>
              <span className={`status-tag ${ticket.status === 'Resolvido' ? 'done' : ticket.status === 'Aberto' ? 'open' : 'progress'}`}><i aria-hidden="true" />{ticket.status}</span>
            </strong>
          </div>
          <div className="detail-item">
            <span className="detail-label"><CalendarDays size={12} />Aberto em</span>
            <strong>{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</strong>
          </div>
          <div className="detail-item">
            <span className="detail-label"><User size={12} />Responsável</span>
            <strong>{ticket.ownerId || 'Equipe de suporte'}</strong>
          </div>
        </div>

        <div className="ticket-detail-section">
          <span className="detail-label"><FileText size={12} />Descrição</span>
          <p>{description}</p>
        </div>

        <div className="dialog-actions modal-actions">
          <button className="secondary-button" onClick={onClose}>Fechar</button>
        </div>
      </section>
    </div>
  );
}

function Heading({ title, description, action }) {
  return <div className="page-heading"><div><div className="eyebrow">Central de Suporte</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function TicketTable({ tickets, query, onSearch, onSelect }) {
  const filtered = tickets.filter(ticket => `${ticket.id} ${ticket.title} ${ticket.category}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <section className="panel tickets-panel">
      <div className="ticket-toolbar">
        <div>
          <h2>Solicitações</h2>
          <p>{filtered.length} chamado(s) nesta lista</p>
        </div>
        <label className="search-box">
          <Search size={17} />
          <input placeholder="Buscar chamado..." value={query} onChange={event => onSearch(event.target.value)} />
        </label>
      </div>

      <div className="ticket-table-wrap">
        <table>
          <thead>
            <tr>
              <th>CHAMADO</th>
              <th>ASSUNTO</th>
              <th>CATEGORIA</th>
              <th>PRIORIDADE</th>
              <th>STATUS</th>
              <th>ABERTO EM</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(ticket => (
              <tr
                key={ticket.id}
                className="clickable-row"
                onClick={() => onSelect(ticket)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(ticket);
                  }
                }}
                tabIndex={0}
                role="button"
              >
                <td className="ticket-id">{ticket.id}</td>
                <td className="ticket-title">{ticket.title}</td>
                <td>{ticket.category}</td>
                <td><span className={`priority-tag ${ticket.priority.toLowerCase()}`}>{ticket.priority}</span></td>
                <td><span className={`status-tag ${ticket.status === 'Resolvido' ? 'done' : ticket.status === 'Aberto' ? 'open' : 'progress'}`}><i aria-hidden="true" />{ticket.status}</span></td>
                <td className="ticket-date">{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && <div className="empty-state">Nenhum chamado encontrado.</div>}
      </div>
    </section>
  );
}

function HistoryTable({ tickets, query, onSearch, onSelect }) {
  const filtered = tickets.filter(ticket => `${ticket.id} ${ticket.title} ${ticket.category}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <section className="panel tickets-panel">
      <div className="ticket-toolbar">
        <div>
          <h2>Histórico de chamados</h2>
          <p>{filtered.length} chamado(s) resolvido(s)</p>
        </div>
        <label className="search-box">
          <Search size={17} />
          <input placeholder="Buscar no histórico..." value={query} onChange={event => onSearch(event.target.value)} />
        </label>
      </div>

      <div className="ticket-table-wrap">
        <table>
          <thead>
            <tr>
              <th>CHAMADO</th>
              <th>ASSUNTO</th>
              <th>CATEGORIA</th>
              <th>PRIORIDADE</th>
              <th>STATUS</th>
              <th>RESOLVIDO EM</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(ticket => (
              <tr
                key={ticket.id}
                className="clickable-row"
                onClick={() => onSelect(ticket)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(ticket);
                  }
                }}
                tabIndex={0}
                role="button"
              >
                <td className="ticket-id">{ticket.id}</td>
                <td className="ticket-title">{ticket.title}</td>
                <td>{ticket.category}</td>
                <td><span className={`priority-tag ${ticket.priority.toLowerCase()}`}>{ticket.priority}</span></td>
                <td><span className={`status-tag ${ticket.status === 'Resolvido' ? 'done' : ticket.status === 'Aberto' ? 'open' : 'progress'}`}><i aria-hidden="true" />{ticket.status}</span></td>
                <td className="ticket-date">{ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleDateString('pt-BR') : new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && <div className="empty-state">Nenhum chamado resolvido encontrado.</div>}
      </div>
    </section>
  );
}

export function TicketsPage({ mode }) {
  const [query, setQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tickets: allTickets, loading, error: dataError } = useTickets();
  const location = useLocation();

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

  const ticketIdFromUrl = location.pathname.split('/').filter(Boolean).pop();
  const selectedFromUrl = tickets.find(ticket => ticket.id === ticketIdFromUrl) ?? null;
  const isHistoryDetailRoute = mode === 'history' && Boolean(ticketIdFromUrl) && ticketIdFromUrl !== 'historico';
  const resolvedTicket = mode === 'history' ? (selectedFromUrl ?? null) : selectedTicket;

  function handleHistorySelect(ticket) {
    navigate(`/historico/${ticket.id}`);
  }

  const openCount = userTickets.filter(ticket => ticket.status !== 'Resolvido').length;
  const resolvedCount = userTickets.filter(ticket => ticket.status === 'Resolvido').length;
  const createButton = <button className="primary-button" onClick={() => navigate('/chamados/novo')}><span>＋</span> Novo chamado</button>;

  return (
    <>
      <Heading title={title} description="Acompanhe solicitações e atualizações da equipe de suporte." action={createButton} />

      {mode === 'dashboard' && (
        <div className="metric-grid dashboard-metrics">
          <article className="metric-card"><span className="metric-icon"><Ticket size={18} /></span><strong>{openCount}</strong><span>Chamados em aberto</span></article>
          <article className="metric-card metric-blue"><span className="metric-icon"><Clock3 size={18} /></span><strong>{resolvedCount}</strong><span>Chamados resolvidos</span></article>
          <article className="metric-card metric-green"><span className="metric-icon"><Check size={18} /></span><strong>{userTickets.length}</strong><span>Total de chamados</span></article>
        </div>
      )}

      {loading && <div className="panel loading-state" role="status">Carregando chamados…</div>}
      {dataError && <div className="data-warning" role="status">{dataError}</div>}
      {!loading && mode !== 'history' && <TicketTable tickets={tickets} query={query} onSearch={setQuery} onSelect={setSelectedTicket} />}
      {!loading && mode === 'history' && !isHistoryDetailRoute && <HistoryTable tickets={tickets} query={query} onSearch={setQuery} onSelect={handleHistorySelect} />}
      {!loading && mode === 'history' && isHistoryDetailRoute && <HistoryTicketView ticket={resolvedTicket} />}

      {mode !== 'history' && <TicketDetailsModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />}

      <div className="list-note"><Headset size={17} /> Precisa de ajuda? <a href="mailto:suporte@labware.com.br">Fale com o suporte LabWare</a></div>
    </>
  );
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

  return (
    <>
      <Heading title="Novo chamado" description="Conte para a equipe de suporte como podemos ajudar." />
      <form className="panel settings-panel ticket-form" onSubmit={submit}>
        <label className="form-label">Assunto<input required maxLength="120" value={title} onChange={event => setTitle(event.target.value)} placeholder="Resuma sua solicitação" /></label>
        <label className="form-label">Categoria<select value={category} onChange={event => setCategory(event.target.value)}><option>Acesso</option><option>Integração</option><option>Indisponibilidade</option><option>Dúvida</option><option>Segurança</option><option>Outros</option></select></label>
        <label className="form-label">Prioridade<select value={priority} onChange={event => setPriority(event.target.value)}><option>Baixa</option><option>Média</option><option>Alta</option><option>Urgente</option><option>Crítica</option></select></label>
        <label className="form-label">Descrição<textarea required minLength="10" rows="6" value={description} onChange={event => setDescription(event.target.value)} placeholder="Descreva o problema e os passos para reproduzi-lo" /></label>
        {error && <p id="ticket-error" className="form-error" role="alert">{error}</p>}
        <div className="settings-footer"><button type="button" className="secondary-button" onClick={() => navigate(-1)}>Cancelar</button><button className="primary-button" type="submit">Enviar chamado</button></div>
      </form>
    </>
  );
}

function HistoryTicketView({ ticket }) {
  if (!ticket) {
    return <div className="panel empty-state">Nenhum chamado resolvido para exibir.</div>;
  }

  const description = ticket.description || 'O sistema mostrou instabilidade e a equipe realizou a correção no ambiente de produção. A manutenção foi validada e o chamado foi encerrado com sucesso.';
  const resolvedAt = ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleDateString('pt-BR') : new Date(ticket.createdAt).toLocaleDateString('pt-BR');

  return (
    <div className="history-page-shell">
      <div className="history-shell panel">
        <header className="history-header">
          <div className="history-brand-wrap">
            <div className="history-logo">
              <Ticket size={18} />
            </div>
            <div>
              <div className="eyebrow">Central de Suporte</div>
              <h2>Detalhes</h2>
            </div>
          </div>
        </header>

        <div className="history-layout">
          <main className="history-main-content">
            <div className="history-header-row">
              <span className="history-ticket-code">{ticket.id}</span>
              <span className={`status-tag ${ticket.status === 'Resolvido' ? 'done' : ticket.status === 'Aberto' ? 'open' : 'progress'}`}><i aria-hidden="true" />{ticket.status}</span>
            </div>

            <h3 className="history-title">{ticket.title}</h3>
            <p className="history-description">{description}</p>

            <div className="history-people-row">
              <div className="history-person-box">
                <span className="history-person-label">Responsável</span>
                <strong>Ronaldo</strong>
              </div>
              <div className="history-person-box">
                <span className="history-person-label">Suporte</span>
                <strong>Ruffles</strong>
              </div>
            </div>

            <div className="history-conversation">
              <div className="history-conversation-header">
                <span className="conversation-pill">Conversa</span>
                <span className="conversation-date">{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>

              <div className="history-message-row">
                <div className="avatar small-avatar">R</div>
                <div className="history-message-card customer-message">
                  <strong>Ronaldo</strong>
                  <p>O sistema está instável e a equipe realizou a correção no ambiente de produção. A manutenção foi validada e o chamado foi encerrado com sucesso.</p>
                </div>
              </div>

              <div className="history-message-row right-align">
                <div className="history-message-card support-message">
                  <strong>Ruffles</strong>
                  <p>O erro foi corrigido e o processo de monitoramento foi ajustado para evitar recorrência. Seguimos atento ao comportamento do sistema.</p>
                </div>
                <div className="avatar small-avatar support-avatar">S</div>
              </div>

              <div className="history-message-composer">
                <input type="text" placeholder="Nova mensagem" />
                <button className="primary-button">Enviar mensagem</button>
              </div>
            </div>

            <div className="history-evidences">
              <div className="evidence-header">
                <h4>Evidências</h4>
                <button type="button" className="secondary-button small-button">Baixar</button>
              </div>
              <div className="evidence-item">
                <span className="evidence-text">Captura de tela 2026-10-27 10:14:25.png</span>
                <span className="evidence-size">1.4 MB</span>
              </div>
            </div>

            <div className="history-rating">
              <h4>Avaliação do cliente</h4>
              <div className="stars" aria-label="Avaliação 4 de 5">★★★★★</div>
              <p>Boa</p>
              <small>{resolvedAt}</small>
            </div>
          </main>

          <aside className="history-sidebar">
            <div className="history-summary-card">
              <div className="summary-header">
                <span className="summary-label">LABWARE</span>
                <span className="summary-progress">Cumprido</span>
              </div>

              <div className="summary-grid">
                <div className="summary-item"><span>Prioridade</span><strong>{ticket.priority}</strong></div>
                <div className="summary-item"><span>Responsável</span><strong>Lucas Ribeiro</strong></div>
                <div className="summary-item"><span>Categoria</span><strong>{ticket.category}</strong></div>
                <div className="summary-item"><span>Origem</span><strong>AUDIO VOZ</strong></div>
                <div className="summary-item"><span>Última resposta</span><strong>{resolvedAt}</strong></div>
                <div className="summary-item"><span>Data de criação</span><strong>{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</strong></div>
              </div>

              <button className="secondary-button wide-button">Reabrir chamado</button>
            </div>

            <div className="history-info-card">
              <h4>Atendimento</h4>
              <p>Chamado encerrado. Reabra o atendimento para registrar nova atualização.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
