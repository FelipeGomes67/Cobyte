import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {  Headset, Search,  } from 'lucide-react';
import { createTicket } from '../services/ticketService';
import { sendNotification } from '../utils/notifications';
import { useAuth } from '../hooks/useAuth';
import { useTickets } from '../hooks/useTickets';


function smoothPath(points) {
  if (!points.length) return '';
  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const before = points[Math.max(0, index - 1)];
    const after = points[Math.min(points.length - 1, index + 2)];
    const firstControl = {
      x: previous.x + (point.x - before.x) / 6,
      y: previous.y + (point.y - before.y) / 6,
    };
    const secondControl = {
      x: point.x - (after.x - previous.x) / 6,
      y: point.y - (after.y - previous.y) / 6,
    };
    return `${path} C ${firstControl.x},${firstControl.y} ${secondControl.x},${secondControl.y} ${point.x},${point.y}`;
  }, `M ${points[0].x},${points[0].y}`);
}


function Heading({ title, description, action }) {
  return <div className="page-heading"><div><div className="eyebrow">Central de Suporte</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function TicketTable({ tickets, query, onSearch }) {
  const filtered = tickets.filter(ticket => `${ticket.id} ${ticket.title} ${ticket.category}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="panel tickets-panel">
    <div className="ticket-toolbar"><div> <p>AÇÃO IMEDIATA DO SUPORTE</p><h2>Chamados Críticos & SLA em Risco</h2><p>Lista priorizada dos chamados com maior urgência ou mais próximos do estouro de prazo.</p></div><label className="search-box"><Search size={17}/><input placeholder="Buscar chamado..." value={query} onChange={event => onSearch(event.target.value)}/></label></div>
    <div className="ticket-table-wrap"><table><thead><tr><th>CHAMADO</th><th>ASSUNTO</th><th>CATEGORIA</th><th>PRIORIDADE</th><th>STATUS</th><th>ABERTO EM</th></tr></thead>
      <tbody>{filtered.map(ticket => <tr key={ticket.id}><td className="ticket-id">{ticket.id}</td><td className="ticket-title">{ticket.title}</td><td>{ticket.category}</td><td><span className={`priority-tag ${ticket.priority.toLowerCase()}`}>{ticket.priority}</span></td><td><span className={`status-tag ${ticket.status === 'Resolvido' ? 'done' : ticket.status === 'Aberto' ? 'open' : 'progress'}`}><i aria-hidden="true"/>{ticket.status}</span></td><td className="ticket-date">{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</td></tr>)}</tbody>
    </table>{filtered.length === 0 && <div className="empty-state">Nenhum chamado encontrado.</div>}</div>
  </section>;
}

function HorizontalBars({ items, variant = 'category' }) {
  const [tooltip, setTooltip] = useState(null);
  const { axisMax, ticks } = getAxisScale(Math.max(0, ...items.map(item => item.count)));
  return <>
    <div className={`bar-chart ${variant === 'priority' ? 'priority-bar-chart' : ''}`}>{items.map((item, index) => <div className={`bar-row ${variant === 'priority' ? 'priority-bar-row' : ''}`} key={item.name} tabIndex="0" aria-label={`${item.name}: ${item.count} ${item.count === 1 ? 'chamado' : 'chamados'}`} onFocus={() => setTooltip(item.name)} onBlur={() => setTooltip(null)} onMouseEnter={() => setTooltip(item.name)} onMouseLeave={() => setTooltip(null)}>
      <span className={variant === 'priority' ? 'priority-bar-label' : undefined}>{variant === 'priority' && <i aria-hidden="true" style={{ backgroundColor: item.color }} />}{item.name}</span><i className="bar-track"><b style={{ width: `${(item.count / axisMax) * 100}%`, ...(item.color ? { backgroundColor: item.color } : {}), '--bar-index': index }}/>{tooltip === item.name && <em className="bar-tooltip">{item.count} {item.count === 1 ? 'chamado' : 'chamados'}</em>}</i><small>{item.count}</small>
    </div>)}</div>
    <div className={`axis ${variant === 'priority' ? 'priority-axis' : ''}`} aria-hidden="true">{ticks.map(tick => <span key={tick} style={{ left: `${(tick / axisMax) * 100}%` }}>{tick.toLocaleString('pt-BR')}</span>)}</div>
  </>;
}

function getAxisScale(max) {
  const axisMax = Math.max(5, Math.ceil(max / 5) * 5);

  const ticks = [
    0,
    axisMax / 4,
    axisMax / 2,
    axisMax * 0.75,
    axisMax
  ];

  return { axisMax, ticks };
}

function CategoryChart({ categories }) {
  return <section className="panel chart-panel category-panel">
    <p className="priority-panel-heading3">RECORRÊNCIA POR CATEGORIA</p>
    <h2>Chamados por Módulo</h2>
    {categories.every(item => item.count === 0) ? <div className="chart-empty">Sem dados no período</div> : <div className="category-chart-content"><HorizontalBars items={categories}/></div>}
  </section>;
}

function PriorityChart({ priorities }) {
  return <section className="panel chart-panel priority-panel">
    <div className="priority-panel-heading"><div><p>Severidade</p><h2>Chamados por Prioridade</h2></div><span>5 níveis</span></div>
    {priorities.every(item => item.count === 0) ? <div className="chart-empty">Sem dados no período</div> : <HorizontalBars items={priorities} variant="priority"/>}
  </section>;
}

function TrendChart({ trend }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const peak = Math.max(1, ...trend.flatMap(item => [item.opened, item.resolved]));
  const { axisMax, ticks } = getAxisScale(peak);
  const pointAt = (value, index) => ({ x: 10 + index / Math.max(1, trend.length - 1) * 700, y: 145 - value / axisMax * 130 });
  const openedPath = smoothPath(trend.map((item, index) => pointAt(item.opened, index)));
  const resolvedPath = smoothPath(trend.map((item, index) => pointAt(item.resolved, index)));
  const selected = activeIndex === null ? null : trend[activeIndex];
  const activePoint = activeIndex === null ? null : pointAt(Math.max(selected.opened, selected.resolved), activeIndex);
  const tooltipLeft = activeIndex === null ? 0 : Math.max(0, Math.min(76, (activeIndex / Math.max(1, trend.length - 1)) * 100 - 7));
  function selectMonthFromPointer(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    setActiveIndex(Math.round(ratio * (trend.length - 1)));
  }


  return <section className="trend-panel">
    <div className="panel-title"><h2>Volume Diário: Criados vs Resolvidos</h2></div>
    {trend.every(item => item.opened === 0 && item.resolved === 0) ? <div className="chart-empty">Sem dados nos últimos 12 meses.</div> : <>
      <div className="trend-plot">
        <div className="y-axis">{[...ticks].reverse().map(tick => <span key={tick} style={{ top: `${(1 - tick / axisMax) * 100}%` }}>{tick.toLocaleString('pt-BR')}</span>)}</div>
        <svg viewBox="0 0 720 160" preserveAspectRatio="none" role="group" aria-label="Evolução mensal dos chamados" onPointerMove={selectMonthFromPointer} onPointerLeave={() => setActiveIndex(null)}>
          <defs>
            <linearGradient id="opened-trend-gradient" x1="0" x2="1">
              <stop offset="0%" stopColor="#78a7ff"/><stop offset="100%" stopColor="#2463eb"/>
            </linearGradient>
            <linearGradient id="resolved-trend-gradient" x1="0" x2="1">
              <stop offset="0%" stopColor="#53d98a"/><stop offset="100%" stopColor="#159447"/>
            </linearGradient>
          </defs>
          <path d={openedPath} pathLength="1" className="trend-line trend-line-opened" vectorEffect="non-scaling-stroke"/>
          <path d={resolvedPath} pathLength="1" className="trend-line trend-line-resolved" vectorEffect="non-scaling-stroke"/>
          {activePoint && <line className="trend-guide" x1={activePoint.x} x2={activePoint.x} y1="0" y2="160"/>}
          {trend.map((item, index) => {
            const opened = pointAt(item.opened, index);
            const resolved = pointAt(item.resolved, index);
            return <g key={`${item.year}-${item.month}`} className="trend-month-point" tabIndex="0" aria-label={`${item.month} ${item.year}: ${item.opened} abertos e ${item.resolved} resolvidos`} onFocus={() => setActiveIndex(index)} onBlur={() => setActiveIndex(null)} onMouseEnter={() => setActiveIndex(index)}>
              <circle cx={opened.x} cy={opened.y} r="4" className="trend-point-opened"/><circle cx={resolved.x} cy={resolved.y} r="4" className="trend-point-resolved"/>
            </g>;
          })}
        </svg>
        {selected && <div className="trend-tooltip" style={{ left: `${tooltipLeft}%` }} role="status"><strong>{selected.month} {selected.year}</strong><span className="opened-value">Abertos: {selected.opened}</span><span className="resolved-value">Resolvidos: {selected.resolved}</span></div>}
      </div>
      <div className="month-axis">{trend.map((item, index) => <span key={`${item.year}-${item.month}-${index}`}>{item.month}.</span>)}</div>
      <div className="trend-legend"><span><i/>Abertos</span><span><i/>Resolvidos</span></div>
    </>}
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


const categories = [
  'Acesso',
  'Integração',
  'Indisponibilidade',
  'Dúvida',
  'Segurança',
  'Outros'
].map(name => ({
  name,
  count: userTickets.filter(
    ticket => ticket.category === name
  ).length
}));

const priorities = [
  'Baixa',
  'Média',
  'Alta',
  'Urgente',
  'Crítica'
].map(name => ({
  name,
  count: userTickets.filter(
    ticket => ticket.priority === name
  ).length,
  color: {
    'Baixa': '#22c55e',
    'Média': '#3b82f6',
    'Alta': '#f59e0b',
    'Urgente': '#f97316',
    'Crítica': '#ef4444'
  }[name]
}));


const trend = [
  { month: 'Seg', year: 2026, opened: 5, resolved: 2 },
  { month: 'Ter', year: 2026, opened: 8, resolved: 4 },
  { month: 'Qua', year: 2026, opened: 3, resolved: 2 },
  { month: 'Qui', year: 2026, opened: 7, resolved: 5 },
  { month: 'Sex', year: 2026, opened: 10, resolved: 6 },
  { month: 'Sáb', year: 2026, opened: 4, resolved: 3 },
  { month: 'Dom', year: 2026, opened: 2, resolved: 1 }
];

  const createButton = <button className="primary-button" onClick={() => navigate('/chamados/novo')}><span>＋</span> Novo chamado</button>;
  return <>
    <Heading title={title} description="Acompanhe solicitações e atualizações da equipe de suporte." action={createButton}/>
    {mode === 'dashboard' && <div className="metric-grid dashboard-metrics">


      <article className="metric-card">
          <span className='span-header'>Chamados Ativos na Fila</span>
           <span className="priority-panel-heading2">3 no total</span>
          <strong>2</strong>
          </article>


      <article className="metric-card">
          <strong>100.0%</strong>
          <span className='span-header'>Cumprimento de SLA</span>
      <span className='span-pequeno'>Excelente · Dentro da meta</span>
          </article>


      <article className="metric-card">
          <strong>1min</strong>
          <span className='span-header'>Tempo Médio de Resolução</span>
          </article>


      <article className="metric-card">
          <strong>1</strong>
          <span className='span-header'>SLA em Risco/Críticos</span>
          
          </article>




    </div>}

{mode === 'dashboard' && (
  <div className="dashboard-charts">
    <PriorityChart priorities={priorities} className="panel chart-panel priority-panel"/>

    <CategoryChart categories={categories} className="panel chart-panel priority-panel" />


  </div>
)}
<TrendChart trend={trend} />
    
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
