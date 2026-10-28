import { useState } from 'react';
import { Check, Clock3, Star } from 'lucide-react';
import { useTickets } from '../hooks/useTickets';
import { getMonthlyTrend, getReportSummary } from '../utils/reportMetrics';

function PageHeading() {
  return <div className="page-heading reports-heading"><div><h1>Relatórios</h1><p>Indicadores de desempenho do atendimento.</p></div></div>;
}

function MetricCard({ icon, value, label, tone, suffix = '' }) {
  return <article className={`metric-card ${tone}`}><span className="metric-icon">{icon}</span><strong>{value === null ? 'Sem dados' : `${value}${suffix}`}</strong><span>{label}</span></article>;
}

function CategoryChart({ categories }) {
  const [tooltip, setTooltip] = useState(null);
  const max = Math.max(1, ...categories.map(item => item.count));
  return <section className="panel chart-panel category-panel">
    <h2>Chamados por Categoria</h2>
    {categories.every(item => item.count === 0) ? <div className="chart-empty">Sem dados no período.</div> : <>
      <div className="bar-chart">{categories.map(item => <div className="bar-row" key={item.name} tabIndex="0" aria-label={`${item.name}: ${item.count} chamados`} title={`${item.name}: ${item.count} chamados`} onFocus={() => setTooltip(item.name)} onBlur={() => setTooltip(null)} onMouseEnter={() => setTooltip(item.name)} onMouseLeave={() => setTooltip(null)}>
        <span>{item.name}</span><i><b style={{ width: `${(item.count / max) * 100}%` }}/></i><small>{item.count}</small>
      </div>)}</div>
      <div className="axis">{Array.from({ length: 5 }, (_, index) => <span key={index}>{(max * index / 4).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</span>)}</div>
      {tooltip && <span className="chart-hint" role="status">{tooltip}: {categories.find(item => item.name === tooltip)?.count} chamados</span>}
    </>}
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

function PriorityChart({ priorities }) {
  const [active, setActive] = useState(null);
  const total = priorities.reduce((sum, item) => sum + item.count, 0);
  const slices = priorities.reduce((result, item) => {
    const end = result.angle + (total ? item.count / total * 360 : 0);
    return { angle: end, items: [...result.items, { ...item, start: result.angle, end }] };
  }, { angle: -90, items: [] }).items;
  return <section className="panel chart-panel priority-panel">
    <h2>Chamados por Prioridade</h2>
    {total === 0 ? <div className="chart-empty">Sem dados no período.</div> : <>
      <div className="pie-wrap"><svg className="pie-chart" viewBox="0 0 140 140" role="group" aria-label="Chamados por prioridade">
        {slices.filter(item => item.count > 0).map(item => {
          const shared = { fill: item.color, className: 'pie-slice', tabIndex: 0, role: 'img', 'aria-label': `${item.name}: ${item.count} chamado(s)`, onFocus: () => setActive(item), onBlur: () => setActive(null), onMouseEnter: () => setActive(item), onMouseLeave: () => setActive(null) };
          return item.end - item.start >= 359.9
            ? <circle key={item.name} cx="70" cy="70" r="47" {...shared}><title>{item.name}: {item.count}</title></circle>
            : <path key={item.name} d={wedgePath(item.start, item.end)} {...shared}><title>{item.name}: {item.count}</title></path>;
        })}
      </svg></div>
      {active && <div className="priority-tooltip" role="status">{active.name}: {active.count} ({Math.round(active.count / total * 100)}%)</div>}
      <div className="legend">{priorities.map(item => <span key={item.name}><i style={{ backgroundColor: item.color }}/>{item.name} <b>{item.count}</b></span>)}</div>
    </>}
  </section>;
}

function TrendChart({ trend }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const peak = Math.max(1, ...trend.flatMap(item => [item.opened, item.resolved]));
  const pointAt = (value, index) => ({ x: 10 + index / Math.max(1, trend.length - 1) * 700, y: 145 - value / peak * 130 });
  const openedPoints = trend.map((item, index) => { const point = pointAt(item.opened, index); return `${point.x},${point.y}`; }).join(' ');
  const resolvedPoints = trend.map((item, index) => { const point = pointAt(item.resolved, index); return `${point.x},${point.y}`; }).join(' ');
  const selected = activeIndex === null ? null : trend[activeIndex];
  return <section className="panel trend-panel">
    <div className="panel-title"><h2>Evolução dos Chamados Mensal</h2></div>
    {trend.every(item => item.opened === 0 && item.resolved === 0) ? <div className="chart-empty">Sem dados nos últimos 12 meses.</div> : <>
      <div className="trend-plot">
        <div className="y-axis"><span>{peak}</span><span>{Math.round(peak * .75)}</span><span>{Math.round(peak * .5)}</span><span>{Math.round(peak * .25)}</span><span>0</span></div>
        <svg viewBox="0 0 720 160" preserveAspectRatio="none" role="group" aria-label="Evolução mensal dos chamados">
          <polyline points={openedPoints} fill="none" className="trend-line trend-line-opened" vectorEffect="non-scaling-stroke"/>
          <polyline points={resolvedPoints} fill="none" className="trend-line trend-line-resolved" vectorEffect="non-scaling-stroke"/>
          {trend.map((item, index) => {
            const opened = pointAt(item.opened, index);
            const resolved = pointAt(item.resolved, index);
            return <g key={`${item.year}-${item.month}`} className="trend-month-point" tabIndex="0" aria-label={`${item.month} ${item.year}: ${item.opened} abertos e ${item.resolved} resolvidos`} onFocus={() => setActiveIndex(index)} onBlur={() => setActiveIndex(null)} onMouseEnter={() => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)}>
              <circle cx={opened.x} cy={opened.y} r="4" className="trend-point-opened"/><circle cx={resolved.x} cy={resolved.y} r="4" className="trend-point-resolved"/>
            </g>;
          })}
        </svg>
        {selected && <div className="trend-tooltip"><strong>{selected.month} {selected.year}</strong><span className="opened-value">Abertos: {selected.opened}</span><span className="resolved-value">Resolvidos: {selected.resolved}</span></div>}
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
