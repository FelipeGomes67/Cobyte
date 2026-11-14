import { BarrasResumo } from '../components/reports/ResumoEmpresa';
import { useState } from 'react';
import { Check, Clock3, Star } from 'lucide-react';
import { useTickets } from '../hooks/useTickets';
import EvolucaoMensalChart from '../components/reports/EvolucaoMensalChart';
import { getAxisScale, getMonthlyTrend, getReportSummary, getReportYears } from '../utils/reportMetrics';

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

export default function ReportsPage() {
  const { tickets: todos, loading, error } = useTickets();
  const [empresa, setEmpresa] = useState('');
  const [tecnico, setTecnico] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const empresas = [...new Set(todos.map(t => t.empresa).filter(Boolean))].sort();
  const tecnicos = [...new Set(todos.map(t => t.assigneeName).filter(Boolean))].sort();
  const tickets = todos.filter(t => (!empresa || t.empresa === empresa) && (!tecnico || t.assigneeName === tecnico) &&
    (!inicio || t.createdAt?.slice(0,10) >= inicio) && (!fim || t.createdAt?.slice(0,10) <= fim));
  const agrupar = campo => Object.entries(tickets.reduce((acc,t)=>{const nome=t[campo] || 'Não informado';acc[nome]=(acc[nome]||0)+1;return acc;},{})).map(([nome,quantidade])=>({nome,quantidade})).sort((a,b)=>b.quantidade-a.quantidade || a.nome.localeCompare(b.nome, 'pt-BR'));
  const years = getReportYears();
  const [selectedYear, setSelectedYear] = useState(() => years[0]);
  if (loading) return <div className="panel loading-state" role="status">Carregando relatórios...</div>;
  const summary = getReportSummary(tickets);
  const trend = getMonthlyTrend(tickets, new Date(), selectedYear);
  const rating = summary.rating === null ? null : summary.rating.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const firstResponse = summary.firstResponseMinutes === null ? null : Math.round(summary.firstResponseMinutes);
  return <>
    <PageHeading/>
    <div className="panel relatorio-filtros">
      <label>Empresa<select value={empresa} onChange={e=>setEmpresa(e.target.value)}><option value="">Todas</option>{empresas.map(n=><option key={n}>{n}</option>)}</select></label>
      <label>Técnico responsável<select value={tecnico} onChange={e=>setTecnico(e.target.value)}><option value="">Todos</option>{tecnicos.map(n=><option key={n}>{n}</option>)}</select></label>
      <label>Abertos a partir de<input type="date" value={inicio} max={fim || undefined} onChange={e=>setInicio(e.target.value)}/></label>
      <label>Abertos até<input type="date" value={fim} min={inicio || undefined} onChange={e=>setFim(e.target.value)}/></label>
      <button className="secondary-button" onClick={()=>{setEmpresa('');setTecnico('');setInicio('');setFim('');}}>Limpar filtros</button>
      <span>{tickets.length} chamados no recorte</span>
    </div>
    {error && <div className="data-warning" role="status">{error}</div>}
    <div className="metric-grid">
      <MetricCard icon={<Star size={21} fill="currentColor"/>} value={rating} label="Avaliação média do atendimento" tone="metric-yellow"/>
      <MetricCard icon={<Clock3 size={21}/>} value={firstResponse} suffix={firstResponse === null ? '' : ' min'} label="Tempo médio de primeira resposta" tone="metric-blue"/>
      <MetricCard icon={<Check size={21}/>} value={summary.slaPercent} suffix={summary.slaPercent === null ? '' : '%'} label="SLAs cumpridos no prazo" tone="metric-green"/>
    </div>
    <div className="charts-grid"><CategoryChart categories={summary.categories}/><PriorityChart priorities={summary.priorities}/></div>
    <div className="empresa-graficos" style={{ marginBottom: 20 }}><BarrasResumo titulo="Chamados por empresa" itens={agrupar('empresa')}/><BarrasResumo titulo="Chamados por técnico responsável" itens={agrupar('assigneeName')}/></div>
    <EvolucaoMensalChart
      trend={trend}
      years={years}
      selectedYear={selectedYear}
      onYearChange={setSelectedYear}
    />
  </>;
}