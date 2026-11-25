import { Ticket, Wrench, CircleCheck, MessageCircleQuestion } from 'lucide-react';
import ChamadoBadge from '../ticket/ChamadoBadge';
import { Link } from 'react-router-dom';
import { STATUS_VISUAL, PRIORIDADE_VISUAL } from '../../utils/chamadoVisual';
import '../../css/ResumoEmpresa.css';
export function BarrasResumo({ titulo, itens }) {
  const max = Math.max(1, ...itens.map(i => i.quantidade));
  return <section className="panel resumo-barras"><h2>{titulo}</h2>
    {!itens.length || itens.every(i => !i.quantidade) ? <p>Sem dados no período.</p> : <ul>{itens.map(item =>
      <li key={item.nome}><span>{item.nome}</span><div className="resumo-trilho"><i style={{ width: item.quantidade / max * 100 + '%', background: item.cor || '#2563eb' }} /></div><strong>{item.quantidade}</strong></li>)}</ul>}
  </section>;
}
export default function ResumoEmpresa({ tickets, usuario }) {
  const aguardando = tickets.filter(t => t.status === 'Aguardando solicitante');
  const indicadores = [
    { nome: 'Total de chamados', quantidade: tickets.length, Icone: Ticket, tom: 'azul' },
    { nome: 'Em aberto e atendimento', quantidade: tickets.filter(t => !['Resolvido', 'Fechado', 'Cancelado'].includes(t.status)).length, Icone: Wrench, tom: 'laranja' },
    { nome: 'Resolvidos e fechados', quantidade: tickets.filter(t => ['Resolvido', 'Fechado'].includes(t.status)).length, Icone: CircleCheck, tom: 'verde' },
    { nome: 'Aguardando solicitante', quantidade: aguardando.length, Icone: MessageCircleQuestion, tom: 'roxo' },
  ];
  const grupos = campo => Object.entries(tickets.reduce((acc,t) => { const k=t[campo] || 'Não informado'; acc[k]=(acc[k] || 0)+1; return acc; },{})).map(([nome,quantidade]) => ({ nome,quantidade }));
  const meses=Array.from({length:6},(_,i)=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-5+i);return {nome:d.toLocaleDateString('pt-BR',{month:'short',year:'numeric'}),quantidade:tickets.filter(t=>{const x=new Date(t.createdAt);return x.getMonth()===d.getMonth()&&x.getFullYear()===d.getFullYear();}).length};});
  return <div className="empresa-dashboard">
    <div className="page-heading"><div><h1>Dashboard da empresa</h1><p>{usuario.empresaNome || usuario.empresa || 'Sua empresa'} · Indicadores de todos os chamados da empresa</p></div><Link className="primary-button" to="/chamados-empresa">Ver chamados</Link></div>
    <div className="empresa-kpis">{indicadores.map(({nome, quantidade, Icone, tom}) =>
      <article className={'panel empresa-indicador ' + tom} key={nome}>
        <div><span>{nome}</span><strong>{quantidade}</strong></div>
        <div className="empresa-indicador-icone"><Icone size={27} strokeWidth={1.8} aria-hidden="true" /></div>
      </article>)}</div>
    <div className="empresa-graficos">
      <BarrasResumo titulo="Situação dos chamados da empresa" itens={Object.values(STATUS_VISUAL).map(v=>({...v,quantidade:tickets.filter(t=>t.status===v.nome).length}))}/>
      <BarrasResumo titulo="Prioridades da empresa" itens={Object.values(PRIORIDADE_VISUAL).map(v=>({...v,quantidade:tickets.filter(t=>t.priority===v.nome).length}))}/>
      <BarrasResumo titulo="Principais problemas da empresa" itens={grupos('category')}/>
      <BarrasResumo titulo="Chamados abertos nos últimos 6 meses" itens={meses}/>
    </div>
    <section className="panel empresa-aguardando">
      <header><div className="empresa-indicador-icone"><MessageCircleQuestion size={24} aria-hidden="true" /></div><div><h2>Aguardando solicitante</h2><p>Chamados que dependem de uma resposta para o atendimento continuar.</p></div><strong>{aguardando.length}</strong></header>
      {aguardando.length ? <div className="ticket-table-wrap"><table>
        <thead><tr><th>Chamado</th><th>Solicitante</th><th>Prioridade</th><th>Responsável</th><th>Ação</th></tr></thead>
        <tbody>{aguardando.map(t => <tr key={t.id}>
          <td><small>{t.protocolo || t.id}</small><span className="empresa-aguardando-titulo" title={t.titulo || t.title}>{t.titulo || t.title}</span></td>
          <td>{typeof t.solicitante === 'object' ? t.solicitante?.nome : t.solicitante || 'Não informado'}</td>
          <td><ChamadoBadge tipo="prioridade" valor={t.prioridade || t.priority} /></td>
          <td>{t.assigneeName || 'Não atribuído'}</td>
          <td><Link className="secondary-button" to={'/chamados-empresa/' + t.id}>Ver chamado</Link></td>
        </tr>)}</tbody>
      </table></div> : <p className="empresa-aguardando-vazio">Nenhum chamado aguardando resposta no momento.</p>}
    </section>
  </div>;
}
