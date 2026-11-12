import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import ChamadoBadge from './ChamadoBadge';
import { PRIORIDADE_VISUAL, STATUS_VISUAL } from '../../utils/chamadoVisual';
import '../../css/ListaChamados.css';

function resumirTitulo(valor = '') {
  const titulo = valor.trim();
  if (titulo.length <= 45) return titulo;
  const trecho = titulo.slice(0, 45);
  const ultimoEspaco = trecho.lastIndexOf(' ');
  return (ultimoEspaco > 20 ? trecho.slice(0, ultimoEspaco) : trecho).trimEnd() + '...';
}

const texto = valor => typeof valor === 'object' ? valor?.nome || '—' : valor || '—';
const origem = chamado => ['VOZ', 'AUDIO_VOZ'].includes(chamado.origem) ? 'Voz' : chamado.origem ? 'Texto' : '—';
const data = valor => valor && !Number.isNaN(new Date(valor).getTime()) ? new Date(valor).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

function faixaSla(chamado) {
  const prazo = chamado.slaTempoRestanteFormatado || '';
  if (!prazo.includes('restantes') || prazo.includes('-')) return null;
  const horas = Number(prazo.match(/(\d+)h/)?.[1] || 0);
  const minutos = Number(prazo.match(/(\d+)min/)?.[1] || 0);
  const total = horas * 60 + minutos;
  return [1, 2, 3, 4, 6, 8, 12, 24, 48, 72].find(limite => total <= limite * 60) ?? null;
}

const filtrosIniciais = { status: '', prioridade: '', origem: '', responsavel: '', empresa: '', inicio: '', fim: '', sla: '', mensagem: '' };
const normalizar = valor => String(valor ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
function diaLocal(valor) {
  const instante = new Date(valor);
  if (!valor || Number.isNaN(instante.getTime())) return '';
  return [instante.getFullYear(), String(instante.getMonth() + 1).padStart(2, '0'), String(instante.getDate()).padStart(2, '0')].join('-');
}

export default function TabelaChamados({ tickets = [], query, onSearch, titulo = 'Solicitações', rotaBase = '/chamados', historico = false, porPrioridade = false }) {
  const [filtros, setFiltros] = useState(filtrosIniciais);
  const [avancado, setAvancado] = useState(false);
  const painelId = useId();
  const empresas = [...new Set(tickets.map(t => texto(t.empresa)))].sort();
  const totalAvancados = ['empresa', 'inicio', 'fim', 'sla', 'mensagem'].filter(c => filtros[c]).length;
  const periodoInvalido = filtros.inicio && filtros.fim && filtros.inicio > filtros.fim;
  const alterar = (campo, valor) => setFiltros(anterior => ({ ...anterior, [campo]: valor }));
  const status = Object.values(STATUS_VISUAL).filter(item => historico === ['Resolvido', 'Fechado', 'Cancelado'].includes(item.nome));
  const prioridades = Object.values(PRIORIDADE_VISUAL);
  const cards = porPrioridade ? prioridades : status;
  const responsaveis = [...new Set(tickets.map(t => texto(t.responsavel)))].sort();
  const filtrados = tickets.filter(t =>
    normalizar([t.protocolo, t.id, t.titulo, t.title].join(' ')).includes(normalizar(query)) &&
    (!filtros.status || t.status === filtros.status) &&
    (!filtros.prioridade || (t.prioridade || t.priority) === filtros.prioridade) &&
    (!filtros.origem || origem(t) === filtros.origem) &&
    (!filtros.responsavel || texto(t.responsavel) === filtros.responsavel) &&
    (!filtros.empresa || texto(t.empresa) === filtros.empresa) &&
    (!filtros.sla || (faixaSla(t) != null && faixaSla(t) <= Number(filtros.sla))) &&
    (!filtros.mensagem || Boolean(t.temNovaMensagem) === (filtros.mensagem === 'sim')) &&
    (!filtros.inicio || diaLocal(historico ? t.canceladoEm || t.resolvidoEm || t.resolvedAt : t.abertoEm || t.createdAt) >= filtros.inicio) &&
    (!filtros.fim || (diaLocal(historico ? t.canceladoEm || t.resolvidoEm || t.resolvedAt : t.abertoEm || t.createdAt) !== '' && diaLocal(historico ? t.canceladoEm || t.resolvidoEm || t.resolvedAt : t.abertoEm || t.createdAt) <= filtros.fim)));
  return <div className="lista-chamados">
    <div className="chamados-contadores">{cards.map(item => <article key={item.nome} style={{ '--contador-cor': item.cor }}>
      <span>{item.nome}</span><strong>{tickets.filter(t => (porPrioridade ? t.prioridade || t.priority : t.status) === item.nome).length}</strong>
    </article>)}</div>
    <div className="chamados-filtros">
      <input aria-label="Buscar chamado" placeholder="Buscar por título ou código #..." value={query} onChange={e => onSearch(e.target.value)} />
      {[['status', 'Status', status.map(s => s.nome)], ['prioridade', 'Prioridade', prioridades.map(p => p.nome)], ['origem', 'Origem', ['Voz', 'Texto']], ['responsavel', 'Responsável', responsaveis]].map(([campo, label, opcoes]) =>
        <select key={campo} aria-label={label} value={filtros[campo]} onChange={e => alterar(campo, e.target.value)}>
          <option value="">{label}: todos</option>{opcoes.map(opcao => <option key={opcao}>{opcao}</option>)}
        </select>)}
      <button type="button" aria-expanded={avancado} aria-controls={painelId} onClick={() => setAvancado(!avancado)}>Filtro avançado{totalAvancados ? ' (' + totalAvancados + ')' : ''}</button>
      <button type="button" onClick={() => { onSearch(''); setFiltros(filtrosIniciais); }}>Limpar filtros</button>
    </div>
    <div id={painelId} hidden={!avancado}>
      <fieldset className="chamados-filtro-avancado">
        <legend>Filtros avançados</legend>
        <label>Empresa<select value={filtros.empresa} onChange={e => alterar('empresa', e.target.value)}><option value="">Todas as empresas</option>{empresas.map(empresa => <option key={empresa}>{empresa}</option>)}</select></label>
        <label>{historico ? 'Finalizado a partir de' : 'Aberto a partir de'}<input type="date" value={filtros.inicio} max={filtros.fim || undefined} onChange={e => alterar('inicio', e.target.value)} /></label>
        <label>{historico ? 'Finalizado até' : 'Aberto até'}<input type="date" value={filtros.fim} min={filtros.inicio || undefined} onChange={e => alterar('fim', e.target.value)} /></label>
        <label>SLA restante<select value={filtros.sla} onChange={e => alterar('sla', e.target.value)}><option value="">Todos os prazos</option>{[1, 2, 3, 4, 6, 8, 12, 24, 48, 72].map(horas => <option key={horas} value={horas}>{'Até ' + horas + 'h'}</option>)}</select></label>
        <label>Nova mensagem<select value={filtros.mensagem} onChange={e => alterar('mensagem', e.target.value)}><option value="">Todos</option><option value="sim">Com nova mensagem</option><option value="nao">Sem nova mensagem</option></select></label>
        {periodoInvalido && <p role="alert">A data final deve ser igual ou posterior à data inicial.</p>}
      </fieldset>
    </div>
    <section className="panel tickets-panel" aria-label={titulo}><div className="ticket-table-wrap"><table>
      <thead><tr><th>Código</th><th>Chamado</th><th>Empresa</th><th>Prioridade</th><th>Origem</th><th>{historico ? 'Finalizado em' : 'Abertura'}</th><th>SLA</th><th>Status</th><th>Ação</th></tr></thead>
      <tbody>{filtrados.map(t => <tr key={t.id}>
        <td><Link to={rotaBase + '/' + encodeURIComponent(t.id)}>{t.protocolo || t.id}</Link></td>
        <td><span className="chamado-titulo-resumido" title={t.titulo || t.title}>{resumirTitulo(t.titulo || t.title)}</span>{t.temNovaMensagem && <small className="chamado-nova-mensagem">Nova mensagem</small>}</td>
        <td>{texto(t.empresa)}</td><td><ChamadoBadge tipo="prioridade" valor={t.prioridade || t.priority} /></td>
        <td>{origem(t)}</td><td>{data(historico ? t.canceladoEm || t.resolvidoEm || t.resolvedAt : t.abertoEm || t.createdAt)}</td>
        <td>{t.slaTempoRestanteFormatado || '—'}</td><td><ChamadoBadge valor={t.status} /></td>
        <td><Link className="chamado-ver-detalhes" to={rotaBase + '/' + encodeURIComponent(t.id)}>Ver detalhes</Link></td>
      </tr>)}</tbody>
    </table></div>{!filtrados.length && <div className="empty-state">Nenhum chamado encontrado.</div>}
    <footer className="chamados-rodape" aria-live="polite">Mostrando {filtrados.length} de {tickets.length} chamados</footer></section>
  </div>;
}
