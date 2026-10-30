import { useState } from 'react';
import { Check, Clock3, Star } from 'lucide-react';
import { useTickets } from '../hooks/useTickets';
import { getAxisScale, getMonthlyTrend, getReportSummary, getReportYears } from '../utils/reportMetrics';

function linePath(points) {
  if (!points.length) return '';
  return points.map((point, index) => `${index ? 'L' : 'M'} ${point.x},${point.y}`).join(' ');
}

function areaPath(points, baseline) {
  if (!points.length) return '';
  return `${linePath(points)} L ${points[points.length - 1].x},${baseline} L ${points[0].x},${baseline} Z`;
}

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
    {categories.every(item => item.count === 0) ? <div className="chart-empty">Sem dados no período</div> : <div className="category-chart-content"><HorizontalBars items={categories}/></div>}
  </section>;
}

function PriorityChart({ priorities }) {
  return <section className="panel chart-panel priority-panel">
    <div className="priority-panel-heading"><div><h2>Chamados por Prioridade</h2><p>Distribuição por nível de atendimento</p></div><span>6 níveis</span></div>
    {priorities.every(item => item.count === 0) ? <div className="chart-empty">Sem dados no período</div> : <HorizontalBars items={priorities} variant="priority"/>}
  </section>;
}

function TrendChart({ trend, years, selectedYear, onYearChange }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const [pinnedIndex, setPinnedIndex] = useState(null);
  const availableMonths = trend.filter(item => item.available);
  const lastAvailableIndex = trend.map(item => item.available).lastIndexOf(true);
  const peak = Math.max(1, ...availableMonths.flatMap(item => [item.opened, item.resolved]));
  const { axisMax, ticks } = getAxisScale(peak);
  const chartWidth = 1100;
  const chartHeight = 220;
  const chartLeft = 22;
  const chartRight = chartWidth - chartLeft;
  const chartTop = 18;
  const chartBottom = chartHeight - 18;
  const pointAt = (value, index) => ({
    x: chartLeft + index / Math.max(1, trend.length - 1) * (chartRight - chartLeft),
    y: chartBottom - value / axisMax * (chartBottom - chartTop),
  });
  const openedPoints = trend.flatMap((item, index) => item.available ? [pointAt(item.opened, index)] : []);
  const resolvedPoints = trend.flatMap((item, index) => item.available ? [pointAt(item.resolved, index)] : []);
  const openedPath = linePath(openedPoints);
  const resolvedPath = linePath(resolvedPoints);
  const openedArea = areaPath(openedPoints, chartBottom);
  const resolvedArea = areaPath(resolvedPoints, chartBottom);
  const selected = activeIndex === null ? null : trend[activeIndex];
  const activePoint = activeIndex === null ? null : pointAt(Math.max(selected.opened, selected.resolved), activeIndex);
  const tooltipLeft = activeIndex === null ? 50 : activeIndex / Math.max(1, trend.length - 1) * 100;
  function getMonthIndex(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const dataRatio = Math.max(0, Math.min(1, (ratio * chartWidth - chartLeft) / (chartRight - chartLeft)));
    return Math.min(lastAvailableIndex, Math.round(dataRatio * (trend.length - 1)));
  }
  function selectMonthFromPointer(event) {
    if (pinnedIndex === null && event.pointerType !== 'touch') {
      setActiveIndex(getMonthIndex(event));
    }
  }
  function togglePinnedMonth(event) {
    const index = getMonthIndex(event);
    const nextIndex = pinnedIndex === index ? null : index;
    setPinnedIndex(nextIndex);
    setActiveIndex(nextIndex);
  }
  function selectYear(year) {
    setPinnedIndex(null);
    setActiveIndex(null);
    onYearChange(year);
  }
  function selectMonth(event) {
    const index = event.target.value === '' ? null : Number(event.target.value);
    setPinnedIndex(index);
    setActiveIndex(index);
  }
  const periodLabel = String(selectedYear);
  return <section className="panel trend-panel">
    <div className="panel-title trend-heading"><div><h2>Evolução mensal dos chamados</h2><p>Chamados abertos e resolvidos por mês</p></div><span className="trend-cutoff">Dados até {availableMonths[availableMonths.length - 1]?.month}.</span></div>
    <div className="trend-filters" aria-label="Filtros do gráfico">
      <label className="trend-select-group"><span>Ano</span><select value={selectedYear} onChange={event => selectYear(Number(event.target.value))} aria-label="Selecionar ano">{years.map(year => <option key={year} value={year}>{year}</option>)}</select></label>
      <label className="trend-select-group"><span>Mês</span><select value={pinnedIndex ?? ''} onChange={selectMonth} aria-label={`Selecionar mês de ${periodLabel}`}><option value="">Todos os meses</option>{trend.map((item, index) => <option key={`${item.year}-${item.month}`} value={index} disabled={!item.available}>{item.month.replace(/^./, char => char.toUpperCase())}.</option>)}</select></label>
    </div>
    {availableMonths.every(item => item.opened === 0 && item.resolved === 0) ? <div className="chart-empty">Sem dados em {periodLabel}.</div> : <>
      <div className="trend-plot">
        <div className="y-axis">{[...ticks].reverse().map(tick => {
          const y = chartBottom - tick / axisMax * (chartBottom - chartTop);
          return <span key={tick} style={{ top: `${(y / chartHeight) * 100}%` }}>{tick.toLocaleString('pt-BR')}</span>;
        })}</div>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" role="group" aria-label="Evolução mensal dos chamados. Toque ou clique para fixar os detalhes; selecione o mesmo mês novamente para fechar." onPointerMove={selectMonthFromPointer} onPointerLeave={() => {
          if (pinnedIndex === null) setActiveIndex(null);
        }} onClick={togglePinnedMonth} onKeyDown={event => {
          if (event.key === 'Escape') {
            setPinnedIndex(null);
            setActiveIndex(null);
          }
        }}>
          <defs>
            <linearGradient id="opened-trend-gradient" x1="0" x2="1">
              <stop offset="0%" stopColor="#78a7ff"/><stop offset="100%" stopColor="#2463eb"/>
            </linearGradient>
            <linearGradient id="resolved-trend-gradient" x1="0" x2="1">
              <stop offset="0%" stopColor="#53d98a"/><stop offset="100%" stopColor="#159447"/>
            </linearGradient>
            <linearGradient id="opened-trend-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3478f6" stopOpacity=".18"/><stop offset="100%" stopColor="#3478f6" stopOpacity="0"/>
            </linearGradient>
            <linearGradient id="resolved-trend-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#18a957" stopOpacity=".14"/><stop offset="100%" stopColor="#18a957" stopOpacity="0"/>
            </linearGradient>
          </defs>
          {ticks.map(tick => {
            const y = chartBottom - tick / axisMax * (chartBottom - chartTop);
            return <line key={tick} x1={chartLeft} x2={chartRight} y1={y} y2={y} className="trend-gridline"/>;
          })}
          <path d={resolvedArea} className="trend-area trend-area-resolved"/>
          <path d={openedArea} className="trend-area trend-area-opened"/>
          <path d={resolvedPath} pathLength="1" className="trend-line trend-line-resolved" vectorEffect="non-scaling-stroke"/>
          <path d={openedPath} pathLength="1" className="trend-line trend-line-opened" vectorEffect="non-scaling-stroke"/>
          {activePoint && <line className="trend-guide" x1={activePoint.x} x2={activePoint.x} y1={chartTop} y2={chartBottom}/>}
          {trend.map((item, index) => {
            if (!item.available) return null;
            const opened = pointAt(item.opened, index);
            const resolved = pointAt(item.resolved, index);
            return <g key={`${item.year}-${item.month}`} className="trend-month-point" role="button" tabIndex="0" aria-label={`${item.month} ${item.year}: ${item.opened} abertos, ${item.resolved} resolvidos e ${item.pending} ainda pendentes entre os chamados criados no mês`} onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setPinnedIndex(pinnedIndex === index ? null : index);
                setActiveIndex(pinnedIndex === index ? null : index);
              }
            }} onFocus={() => {
              setPinnedIndex(null);
              setActiveIndex(index);
            }} onBlur={() => {
              if (pinnedIndex === null) setActiveIndex(null);
            }} onMouseEnter={() => {
              if (pinnedIndex === null) setActiveIndex(index);
            }}>
              <circle cx={opened.x} cy={opened.y} r="5" className="trend-point-opened"/><circle cx={resolved.x} cy={resolved.y} r="3.5" className="trend-point-resolved"/>
            </g>;
          })}
        </svg>
        {selected && <div className="trend-tooltip" style={{ left: `clamp(92px, ${tooltipLeft}%, calc(100% - 92px))` }} role="status"><strong>{selected.month} {selected.year}</strong><span className="opened-value">Abertos: {selected.opened}</span><span className="resolved-value">Resolvidos: {selected.resolved}</span><span className="pending-value">Pendentes: {selected.pending}</span><small>Entre os chamados criados no mês</small></div>}
      </div>
      <div className="month-axis">{trend.map((item, index) => <span key={`${item.year}-${item.month}`} aria-label={`${item.month} ${item.year}${item.available ? '' : ', período futuro sem dados'}`} className={`${item.available ? '' : 'future'} ${pinnedIndex === index ? 'selected' : ''}`}>{item.month}.</span>)}</div>
      <div className="trend-legend"><span><i/>Abertos</span><span><i/>Resolvidos</span></div>
    </>}
  </section>;
}

export default function ReportsPage() {
  const { tickets, loading, error } = useTickets();
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  if (loading) return <div className="panel loading-state" role="status">Carregando relatórios…</div>;
  const summary = getReportSummary(tickets);
  const trend = getMonthlyTrend(tickets, new Date(), selectedYear);
  const years = getReportYears();
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
    <TrendChart trend={trend} years={years} selectedYear={selectedYear} onYearChange={setSelectedYear}/>
  </>;
}
