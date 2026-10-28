import { useState } from 'react';
import { Check, Clock3, Star } from 'lucide-react';
import { useTickets } from '../hooks/useTickets';
import { getAxisScale, getMonthlyTrend, getReportSummary } from '../utils/reportMetrics';

function PageHeading() {
  return <div className="page-heading reports-heading"><div><h1>Relatórios</h1><p>Indicadores de desempenho do atendimento.</p></div></div>;
}

function MetricCard({ icon, value, label, tone, suffix = '' }) {
  return <article className={`metric-card ${tone}`}><span className="metric-icon">{icon}</span><strong>{value === null ? 'Sem dados' : `${value}${suffix}`}</strong><span>{label}</span></article>;
}

// As larguras e o eixo usam o mesmo axisMax, então valor, barra e escala sempre coincidem.
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

function CategoryChart({ categories }) {
  return <section className="panel chart-panel category-panel">
    <h2>Chamados por Categoria</h2>
    {categories.every(item => item.count === 0) ? <div className="chart-empty">Sem dados no período</div> : <HorizontalBars items={categories}/>}
  </section>;
}

function PriorityChart({ priorities }) {
  return <section className="panel chart-panel priority-panel">
    <div className="priority-panel-heading"><div><h2>Chamados por Prioridade</h2><p>Distribuição por nível de atendimento</p></div><span>6 níveis</span></div>
    {priorities.every(item => item.count === 0) ? <div className="chart-empty">Sem dados no período</div> : <HorizontalBars items={priorities} variant="priority"/>}
  </section>;
}

function TrendChart({ trend }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const peak = Math.max(1, ...trend.flatMap(item => [item.opened, item.resolved]));
  const pointAt = (value, index) => ({ x: 10 + index / Math.max(1, trend.length - 1) * 700, y: 145 - value / peak * 130 });
  const openedPoints = trend.map((item, index) => { const point = pointAt(item.opened, index); return `${point.x},${point.y}`; }).join(' ');
  const resolvedPoints = trend.map((item, index) => { const point = pointAt(item.resolved, index); return `${point.x},${point.y}`; }).join(' ');
  const selected = activeIndex === null ? null : trend[activeIndex];
  const activePoint = activeIndex === null ? null : pointAt(Math.max(selected.opened, selected.resolved), activeIndex);
  const tooltipLeft = activeIndex === null ? 0 : Math.max(0, Math.min(76, (activeIndex / Math.max(1, trend.length - 1)) * 100 - 7));
  function selectMonthFromPointer(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    setActiveIndex(Math.round(ratio * (trend.length - 1)));
  }
  return <section className="panel trend-panel">
    <div className="panel-title"><h2>Evolução dos Chamados Mensal</h2></div>
    {trend.every(item => item.opened === 0 && item.resolved === 0) ? <div className="chart-empty">Sem dados nos últimos 12 meses.</div> : <>
      <div className="trend-plot">
        <div className="y-axis"><span>{peak}</span><span>{Math.round(peak * .75)}</span><span>{Math.round(peak * .5)}</span><span>{Math.round(peak * .25)}</span><span>0</span></div>
        <svg viewBox="0 0 720 160" preserveAspectRatio="none" role="group" aria-label="Evolução mensal dos chamados" onMouseMove={selectMonthFromPointer} onMouseLeave={() => setActiveIndex(null)}>
          <polyline points={openedPoints} fill="none" className="trend-line trend-line-opened" vectorEffect="non-scaling-stroke"/>
          <polyline points={resolvedPoints} fill="none" className="trend-line trend-line-resolved" vectorEffect="non-scaling-stroke"/>
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

export default function ReportsPage() {
  const { tickets, loading, error } = useTickets();
  if (loading) return <div className="panel loading-state" role="status">Carregando relatórios…</div>;
  const summary = getReportSummary(tickets);
  const trend = getMonthlyTrend(tickets);
  const rating = summary.rating === null ? null : summary.rating.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const firstResponse = summary.firstResponseMinutes === null ? null : Math.round(summary.firstResponseMinutes);
  return <>
    <PageHeading/>
    {error && <div className="data-warning" role="status">{error}</div>}
    <div className="metric-grid">
      <MetricCard icon={<Star size={21} fill="currentColor"/>} value={rating} label="Avaliação média do atendimento" tone="metric-yellow"/>
      <MetricCard icon={<Clock3 size={21}/>} value={firstResponse} suffix={firstResponse === null ? '' : ' min'} label="Tempo médio de primeira resposta" tone="metric-blue"/>
      <MetricCard icon={<Check size={21}/>} value={summary.slaPercent} suffix={summary.slaPercent === null ? '' : '%'} label="SLAs cumpridos no prazo" tone="metric-green"/>
    </div>
    <div className="charts-grid"><CategoryChart categories={summary.categories}/><PriorityChart priorities={summary.priorities}/></div>
    <TrendChart trend={trend}/>
  </>;
}
