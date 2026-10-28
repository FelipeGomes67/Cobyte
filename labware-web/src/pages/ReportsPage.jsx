import { useState } from 'react';
import { Check, Clock3, Star } from 'lucide-react';
import { getReportTrend, getTickets } from '../data/mockDatabase';

const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const categoryNames = ['Indisponibilidade', 'Integração', 'Acesso', 'Dúvida', 'Segurança', 'Outros'];
const priorities = [
  { name: 'Crítica', color: '#ef4444' },
  { name: 'Urgente', color: '#f97316' },
  { name: 'Alta', color: '#f3a20a' },
  { name: 'Média', color: '#3478f6' },
  { name: 'Baixa', color: '#9aa9bd' },
];

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function tooltipPosition(event, panelSelector = '.chart-panel') {
  const panel = event.currentTarget.closest(panelSelector);
  if (!panel || event.type === 'focus') return { left: 18, top: 38 };
  const bounds = panel.getBoundingClientRect();
  return {
    left: Math.min(bounds.width - 126, Math.max(12, event.clientX - bounds.left + 12)),
    top: Math.min(bounds.height - 54, Math.max(32, event.clientY - bounds.top - 12)),
  };
}

function ChartTooltip({ details }) {
  if (!details) return null;
  return <div className="chart-tooltip" style={{ left: details.left, top: details.top }} role="status">
    <strong>{details.label}</strong><span>{details.value}</span>
  </div>;
}

function PageHeading() {
  return <div className="page-heading"><div><h1>Relatórios</h1><p>Indicadores de desempenho do atendimento.</p></div></div>;
}

function CategoryChart({ tickets }) {
  const [tooltip, setTooltip] = useState(null);
  const counts = categoryNames.map(name => ({ name, count: tickets.filter(ticket => ticket.category === name).length }));
  const max = Math.max(1, ...counts.map(item => item.count));
  const axisValues = Array.from({ length: 5 }, (_, index) => Math.round((max / 4) * index));

  function showDetails(item, event) {
    const position = tooltipPosition(event);
    setTooltip({ label: item.name, value: `${item.count} chamado${item.count === 1 ? '' : 's'}`, ...position });
  }

  return <section className="panel chart-panel category-panel">
    <h3>Chamados por Categoria</h3>
    <ChartTooltip details={tooltip}/>
    <div className="bar-chart" onMouseLeave={() => setTooltip(null)}>
      {counts.map(item => <div className="bar-row" key={item.name} tabIndex={0} role="img" aria-label={`${item.name}: ${item.count} chamados`} onMouseMove={event => showDetails(item, event)} onFocus={event => showDetails(item, event)} onBlur={() => setTooltip(null)}>
        <span>{item.name}</span><i><b style={{ width: `${(item.count / max) * 100}%` }}/></i><small>{item.count}</small>
      </div>)}
    </div>
    <div className="axis">{axisValues.map((value, index) => <span key={`${value}-${index}`}>{value}</span>)}</div>
  </section>;
}

function pointOnCircle(angle, radius) {
  const radians = (angle * Math.PI) / 180;
  return { x: 70 + Math.cos(radians) * radius, y: 70 + Math.sin(radians) * radius };
}

function wedgePath(startAngle, endAngle) {
  const start = pointOnCircle(startAngle, 47);
  const end = pointOnCircle(endAngle, 47);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M 70 70 L ${start.x} ${start.y} A 47 47 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function PriorityChart({ tickets }) {
  const [tooltip, setTooltip] = useState(null);
  const counts = priorities.map(priority => ({ ...priority, count: tickets.filter(ticket => ticket.priority === priority.name).length }));
  const total = counts.reduce((sum, item) => sum + item.count, 0);
  const slices = counts.reduce((result, item) => {
    const end = result.angle + (total ? (item.count / total) * 360 : 0);
    return { angle: end, values: [...result.values, { ...item, start: result.angle, end }] };
  }, { angle: -90, values: [] }).values;

  function showDetails(item, event) {
    const position = tooltipPosition(event);
    const percentage = total ? Math.round((item.count / total) * 100) : 0;
    setTooltip({ label: item.name, value: `${item.count} chamados · ${percentage}%`, ...position });
  }

  return <section className="panel chart-panel priority-panel">
    <h3>Chamados por Prioridade</h3>
    <ChartTooltip details={tooltip}/>
    <div className="pie-wrap">
      <svg className="pie-chart" viewBox="0 0 140 140" role="group" aria-label="Chamados por prioridade" onMouseLeave={() => setTooltip(null)}>
        {slices.filter(item => item.count > 0).map(item => {
          const shared = {
            fill: item.color,
            className: 'pie-slice',
            tabIndex: 0,
            role: 'button',
            'aria-label': `${item.name}: ${item.count} chamados`,
            onMouseMove: event => showDetails(item, event),
            onFocus: event => showDetails(item, event),
            onBlur: () => setTooltip(null),
          };
          return item.end - item.start >= 359.9
            ? <circle key={item.name} cx="70" cy="70" r="47" {...shared}/>
            : <path key={item.name} d={wedgePath(item.start, item.end)} {...shared}/>;
        })}
      </svg>
    </div>
    <div className="legend">{counts.map(item => <span key={item.name}><i style={{ backgroundColor: item.color }}/>{item.name}</span>)}</div>
  </section>;
}

function TrendChart({ tickets, trend }) {
  const [activePoint, setActivePoint] = useState(null);
  const max = 100;
  const pointAt = (value, index) => ({ x: (index / (trend.length - 1)) * 652, y: 95 - (value / max) * 82 });
  const openedPoints = trend.map((item, index) => {
    const point = pointAt(item.opened, index);
    return `${point.x},${point.y}`;
  }).join(' ');
  const active = activePoint === null ? null : trend[activePoint];
  const tooltipLeft = activePoint === null ? 0 : Math.min(78, Math.max(1, (activePoint / (trend.length - 1)) * 100));
  const tooltipTop = active ? Math.min(64, Math.max(10, 67 - active.opened * .62)) : 0;

  function selectPoint(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const position = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    setActivePoint(Math.round(position * (trend.length - 1)));
  }

  return <section className="panel trend-panel">
    <div className="panel-title"><div><h3>Evolução dos Chamados Mensal</h3></div><span className="report-total">{tickets.length} no total</span></div>
    <div className="trend-plot" onMouseLeave={() => setActivePoint(null)}>
      <div className="y-axis"><span>100</span><span>75</span><span>50</span><span>25</span><span>10</span><span>0</span></div>
      <svg viewBox="0 0 652 100" preserveAspectRatio="none" role="img" aria-label="Passe o mouse ou use as setas para consultar a evolução dos chamados" onMouseMove={selectPoint} onFocus={() => setActivePoint(0)} onBlur={() => setActivePoint(null)} onKeyDown={event => {
        if (event.key === 'ArrowRight') setActivePoint(index => Math.min(trend.length - 1, (index ?? 0) + 1));
        if (event.key === 'ArrowLeft') setActivePoint(index => Math.max(0, (index ?? 0) - 1));
      }} tabIndex={0}>
        {activePoint !== null && <line x1={pointAt(0, activePoint).x} x2={pointAt(0, activePoint).x} y1="0" y2="100" className="trend-guide"/>}
        <polyline points={openedPoints} fill="none" className="trend-line trend-line-opened" vectorEffect="non-scaling-stroke"/>
        {activePoint !== null && <>
          <circle cx={pointAt(active.opened, activePoint).x} cy={pointAt(active.opened, activePoint).y} r="3.5" className="trend-point-opened"/>
          <circle cx={pointAt(active.resolved, activePoint).x} cy={pointAt(active.resolved, activePoint).y} r="3.5" className="trend-point-resolved"/>
        </>}
      </svg>
      {active && <div className="trend-tooltip" style={{ left: `${tooltipLeft}%`, top: `${tooltipTop}%` }} role="status">
        <strong>{active.month}.</strong><span className="opened-value">Abertos: {active.opened}</span><span className="resolved-value">Resolvidos: {active.resolved}</span>
      </div>}
    </div>
    <div className="month-axis">{months.map(month => <span key={month}>{month}.</span>)}</div>
    <div className="trend-legend"><span><i/>Abertos</span><span><i/>Resolvidos</span></div>
  </section>;
}

export default function ReportsPage() {
  const tickets = getTickets();
  const trend = getReportTrend();
  const rated = tickets.filter(ticket => Number.isFinite(ticket.rating)).map(ticket => ticket.rating);
  const responseTimes = tickets.filter(ticket => Number.isFinite(ticket.responseMinutes)).map(ticket => ticket.responseMinutes);
  const evaluated = tickets.filter(ticket => typeof ticket.slaMet === 'boolean');
  const rating = average(rated);
  const response = average(responseTimes);
  const sla = evaluated.length ? Math.round((evaluated.filter(ticket => ticket.slaMet).length / evaluated.length) * 100) : 0;

  return <><PageHeading/><div className="metric-grid">
    <article className="metric-card metric-yellow"><span className="metric-icon"><Star size={23} fill="currentColor"/></span><strong>{rating.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</strong><span>Avaliação média do atendimento</span></article>
    <article className="metric-card metric-blue"><span className="metric-icon"><Clock3 size={23}/></span><strong>{response ? `${Math.round(response)}min` : '—'}</strong><span>Tempo médio de resposta</span></article>
    <article className="metric-card metric-green"><span className="metric-icon"><Check size={23}/></span><strong>{sla}%</strong><span>SLA's cumpridos</span></article>
  </div><div className="charts-grid"><CategoryChart tickets={tickets}/><PriorityChart tickets={tickets}/></div><TrendChart tickets={tickets} trend={trend}/></>;
}
