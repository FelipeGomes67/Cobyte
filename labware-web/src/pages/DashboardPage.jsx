import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAuth';
import { useTickets } from '../hooks/useTickets';
import { calcularDashboard, formatarDuracao, formatarRestanteSla, obterDuracaoSla, obterRestanteSla, obterStatus } from '../utils/dashboard';
import '../css/Dashboard.css';

function Etiqueta({ children, tom = '' }) {
  return <span className={`dash-tag ${tom ? `dash-tag--${tom}` : ''}`}>{children}</span>;
}

function Indicadores({ dados }) {
  const dentroMeta = dados.cumprimentoSla !== null && dados.cumprimentoSla >= 90;
  return <section className="dash-metrics" aria-label="Indicadores dos chamados">
    <article className="dash-card dash-metric">
      <div className="dash-metric-heading"><h2>Chamados Ativos na Fila</h2><Etiqueta>{dados.total} no total</Etiqueta></div>
      <strong className="dash-value">{dados.ativos}</strong>
      <ul className="dash-status-summary">{dados.status.filter(item => !['RESOLVIDO', 'FECHADO'].includes(item.chave)).map(item =>
        <li key={item.chave}><i style={{ '--cor': item.cor }} aria-hidden="true"/>{item.nome}: <span>{item.quantidade}</span></li>)}</ul>
    </article>
    <article className="dash-card dash-metric">
      <div className="dash-metric-heading"><h2>Cumprimento de SLA</h2><Etiqueta tom="verde">Meta: 90%</Etiqueta></div>
      <strong className="dash-value">{dados.cumprimentoSla === null ? '—' : `${dados.cumprimentoSla.toFixed(1)}%`}</strong>
      <p>{dados.cumprimentoSla === null ? 'Sem chamados concluídos com SLA' : dentroMeta ? 'Excelente · Dentro da meta' : 'Atenção · Abaixo da meta'}</p>
      <div className={`dash-progress dash-sla-progress ${dentroMeta ? '' : 'dash-progress--alerta'}`} role="meter" aria-label="Cumprimento de SLA" aria-valuemin={0} aria-valuemax={100} aria-valuenow={dados.cumprimentoSla ?? 0} aria-valuetext={dados.cumprimentoSla === null ? 'Sem dados' : `${dados.cumprimentoSla.toFixed(1)}%`}>
        <span style={{ width: `${dados.cumprimentoSla ?? 0}%` }}/>
      </div>
    </article>
    <article className="dash-card dash-metric">
      <div className="dash-metric-heading"><h2>Tempo Médio de Resolução</h2><Etiqueta>{dados.resolvidos} {dados.resolvidos === 1 ? 'resolvido' : 'resolvidos'}</Etiqueta></div>
      <strong className="dash-value">{formatarDuracao(dados.tempoResolucao)}</strong>
      <p className="dash-metric-bottom">1ª resposta média: {formatarDuracao(dados.tempoResposta)}</p>
    </article>
    <article className="dash-card dash-metric">
      <div className="dash-metric-heading"><h2>SLA em Risco / Críticos</h2><Etiqueta tom="vermelho">&lt; 1h p/ estourar</Etiqueta></div>
      <strong className="dash-value dash-value--danger">{dados.emRisco}</strong>
      <p className="dash-metric-bottom">Incidentes críticos ativos: <span className="dash-danger">{dados.criticos}</span></p>
    </article>
  </section>;
}

function CabecalhoGrafico({ contexto, titulo, etiqueta }) {
  return <div className="dash-chart-heading"><div><p className="dash-eyebrow">{contexto}</p><h2>{titulo}</h2></div>{etiqueta && <Etiqueta>{etiqueta}</Etiqueta>}</div>;
}

function DistribuicaoStatus({ itens, total }) {
  const segmentos = itens.reduce((resultado, item) => {
    const inicio = resultado.length ? resultado.at(-1).fim : 0;
    return [...resultado, { ...item, inicio, fim: inicio + (total ? item.quantidade / total * 100 : 0) }];
  }, []);
  return <section className="dash-card dash-distribution dash-distribution--status">
    <CabecalhoGrafico contexto="FLUXO OPERACIONAL" titulo="Distribuição por Status" etiqueta={`${total} chamados`}/>
    <div className="dash-donut-wrap">
      <svg className="dash-donut" viewBox="0 0 220 220" role="img" aria-label={`Distribuição de ${total} chamados por status; quantidades na legenda abaixo`}>
        <circle cx="110" cy="110" r="84" fill="none" stroke="#e8edf3" strokeWidth="28"/>
        <g transform="rotate(-90 110 110)">{segmentos.filter(item => item.quantidade > 0).map(item =>
          <circle key={item.chave} cx="110" cy="110" r="84" fill="none" stroke={item.cor} strokeWidth="28" pathLength="100" strokeDasharray={`${item.fim - item.inicio} ${100 - (item.fim - item.inicio)}`} strokeDashoffset={-item.inicio}/>)}</g>
        <text x="110" y="107" className="dash-donut-total">{total}</text><text x="110" y="130" className="dash-donut-label">NO TOTAL</text>
      </svg>
    </div>
    <ul className="dash-status-legend">{itens.map(item => <li key={item.chave}>
      <span><i style={{ '--cor': item.cor }} aria-hidden="true"/>{item.nome}</span>
      <strong>{item.quantidade}</strong><span className="dash-percentage">{(total ? item.quantidade / total * 100 : 0).toFixed(1)}%</span>
    </li>)}</ul>
  </section>;
}

function DistribuicaoBarras({ contexto, titulo, etiqueta, itens, total, tipo }) {
  return <section className={`dash-card dash-distribution dash-distribution--${tipo}`}>
    <CabecalhoGrafico contexto={contexto} titulo={titulo} etiqueta={etiqueta}/>
    <ul className="dash-bars">{itens.map(item => {
      const percentual = total ? item.quantidade / total * 100 : 0;
      return <li key={item.chave || item.nome} style={{ '--cor': item.cor }}>
        <div className="dash-bar-label"><span className="dash-bar-name">{item.nome}</span><strong>{item.quantidade}</strong><span className="dash-percentage">{percentual.toFixed(1)}%</span></div>
        <div className="dash-progress" role="meter" aria-label={item.nome} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentual} aria-valuetext={`${item.quantidade} chamados, ${percentual.toFixed(1)}%`}><span style={{ width: `${percentual}%` }}/></div>
      </li>;
    })}</ul>
  </section>;
}

function GraficoVolume({ dias }) {
  const [selecionado, definirSelecionado] = useState(null);
  const maximo = Math.max(4, ...dias.flatMap(dia => [dia.abertos, dia.fechados]));
  const passo = Math.ceil(maximo / 4);
  const teto = passo * 4;
  const ponto = (valor, indice) => ({ x: 20 + indice / (dias.length - 1) * 960, y: 250 - valor / teto * 230 });
  const linha = campo => dias.map((dia, indice) => { const { x, y } = ponto(dia[campo], indice); return `${x},${y}`; }).join(' ');
  return <section className="dash-card dash-volume">
    <div className="dash-volume-heading"><h2><span>Volume Diário: </span>Criados vs Resolvidos</h2><div className="dash-line-legend"><span><i/>Abertos</span><span><i/>Fechados</span></div></div>
    <div className="dash-plot">
      <div className="dash-y-axis" aria-hidden="true">{[4, 3, 2, 1, 0].map(indice => <span key={indice} style={{ top: `${(20 + (4 - indice) / 4 * 230) / 270 * 100}%` }}>{indice * passo}</span>)}</div>
      <div className="dash-plot-area">
        <svg viewBox="0 0 1000 270" preserveAspectRatio="none" role="group" aria-label="Chamados criados e resolvidos por dia nos últimos 30 dias">
          {[0, 1, 2, 3, 4].map(indice => <line key={indice} className="dash-grid-line" x1="20" x2="980" y1={20 + indice * 57.5} y2={20 + indice * 57.5}/>)}
          <polyline points={linha('abertos')} className="dash-line dash-line--opened" vectorEffect="non-scaling-stroke"/>
          <polyline points={linha('fechados')} className="dash-line dash-line--closed" vectorEffect="non-scaling-stroke"/>
          {dias.map((dia, indice) => <g key={dia.chave} tabIndex={0} role="img" aria-label={`${dia.data}: ${dia.abertos} abertos, ${dia.fechados} fechados`} onFocus={() => definirSelecionado(indice)} onBlur={() => definirSelecionado(null)} onMouseEnter={() => definirSelecionado(indice)} onMouseLeave={() => definirSelecionado(null)}>
            <rect x={ponto(0, indice).x - 12} y="0" width="24" height="270" fill="transparent"/>
            <circle cx={ponto(dia.abertos, indice).x} cy={ponto(dia.abertos, indice).y} r="4" className="dash-point--opened"/>
            <circle cx={ponto(dia.fechados, indice).x} cy={ponto(dia.fechados, indice).y} r="4" className="dash-point--closed"/>
          </g>)}
        </svg>
        <div className="dash-x-axis" aria-hidden="true">{dias.map((dia, indice) => (indice % 5 === 0 || indice === dias.length - 1) && <span key={dia.chave} style={{ left: `${ponto(0, indice).x / 10}%` }}>{dia.data}</span>)}</div>
        {selecionado !== null && <div className="dash-chart-tooltip" role="status"><strong>{dias[selecionado].data}</strong><span>Abertos: {dias[selecionado].abertos}</span><span>Fechados: {dias[selecionado].fechados}</span></div>}
      </div>
    </div>
  </section>;
}

function ChamadosPrioritarios({ chamados, agora }) {
  return <section className="dash-card dash-urgent">
    <div className="dash-urgent-heading"><div><p className="dash-eyebrow">AÇÃO IMEDIATA DO SUPORTE</p><h2>Chamados Críticos &amp; SLA em Risco</h2></div><Etiqueta tom="vermelho">{chamados.length} {chamados.length === 1 ? 'chamado prioritário' : 'chamados prioritários'}</Etiqueta></div>
    <p className="dash-description">Lista priorizada dos chamados com maior urgência ou mais próximos do estouro de prazo.</p>
    {chamados.length === 0 ? <p className="dash-empty">Nenhum chamado crítico ou com SLA em risco.</p> : <div className="dash-table-wrap"><table className="dash-table" aria-label="Chamados que precisam de atenção imediata">
      <thead><tr><th scope="col">Chamado</th><th scope="col">Empresa / Solicitante</th><th scope="col">Prioridade</th><th scope="col">Status</th><th scope="col">Tempo Restante SLA</th><th scope="col">Responsável</th><th scope="col"><span className="dash-sr-only">Ação</span></th></tr></thead>
      <tbody>{chamados.map(chamado => {
        const status = obterStatus(chamado);
        const restante = obterRestanteSla(chamado, agora);
        const duracao = obterDuracaoSla(chamado);
        const data = new Date(chamado.createdAt);
        return <tr key={chamado.id}>
          <td className="dash-ticket"><strong className="dash-ticket-title">{chamado.title}</strong><span className="dash-ticket-code">{chamado.id}</span><small className="dash-ticket-date">{Number.isNaN(data.getTime()) ? 'Data não informada' : data.toLocaleString('pt-BR')}</small></td>
          <td data-label="Empresa / Solicitante"><span>{chamado.companyName || 'Não informada'}</span><small>{chamado.requesterName || chamado.ownerId || 'Não informado'}</small></td>
          <td data-label="Prioridade"><span className="dash-priority">{chamado.priority}</span></td>
          <td className="dash-ticket-status" data-label="Status"><span className="dash-status-badge" style={{ '--cor': status.cor }}>{status.nome}</span></td>
          <td data-label="Tempo Restante SLA"><span className={restante !== null && restante < 3600000 ? 'dash-danger' : ''}>{formatarRestanteSla(restante)}</span><small>{duracao ? `SLA de ${duracao}` : 'SLA não informado'}</small></td>
          <td data-label="Responsável"><span>{chamado.assigneeName || 'Não atribuído'}</span></td>
          <td className="dash-ticket-action"><Link to={`/chamado/${encodeURIComponent(chamado.id)}`} aria-label={`Ver chamado ${chamado.id}`}>Ver Chamado</Link></td>
        </tr>;
      })}</tbody>
    </table></div>}
  </section>;
}

export default function DashboardPage() {
  const { usuario } = useAutenticacao();
  const { tickets: chamados, loading: carregando, error: erro } = useTickets();
  const [agora, definirAgora] = useState(() => Date.now());
  useEffect(() => {
    const intervalo = window.setInterval(() => definirAgora(Date.now()), 1000);
    return () => window.clearInterval(intervalo);
  }, []);
  const chamadosUsuario = usuario?.role === 'support' ? chamados : chamados.filter(chamado => chamado.ownerId === usuario?.id);
  const dados = calcularDashboard(chamadosUsuario, agora);

  return <div className="dashboard-page">
    <h1 className="dash-sr-only">Dashboard de chamados</h1>
    {erro && <p className="dash-notice" role="alert">{erro}</p>}
    {carregando ? <div className="dash-card dash-empty" role="status">Carregando indicadores…</div> : <>
      <Indicadores dados={dados}/>
      <div className="dash-distributions">
        <DistribuicaoStatus itens={dados.status} total={dados.total}/>
        <DistribuicaoBarras contexto="Severidade" titulo="Chamados por Prioridade" etiqueta={`${dados.prioridades.length} níveis`} itens={dados.prioridades} total={dados.total} tipo="priority"/>
        <DistribuicaoBarras contexto="RECORRÊNCIA POR CATEGORIA" titulo="Chamados por Módulo" itens={dados.categorias} total={dados.total} tipo="category"/>
      </div>
      <GraficoVolume dias={dados.evolucao}/>
      <ChamadosPrioritarios chamados={dados.prioritarios} agora={agora}/>
    </>}
  </div>;
}
