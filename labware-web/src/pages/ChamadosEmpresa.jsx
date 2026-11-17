import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAuth';
import { useTickets } from '../hooks/useTickets';
import { useEstadoUrl } from '../hooks/useEstadoUrl';
import TabelaChamados from '../components/ticket/TabelaChamados';
import '../css/ChamadosEmpresa.css';

export default function ChamadosEmpresa() {
  const { usuario } = useAutenticacao();
  const nomeEmpresa = typeof usuario?.empresa === 'object' ? usuario.empresa?.nome : usuario?.empresa;
  const [busca, definirBusca] = useEstadoUrl('busca', '');
  const [situacao, definirSituacao] = useEstadoUrl('situacao', 'ativos');
  const [tentativa, definirTentativa] = useState(0);
  const { tickets: lista, loading, error } = useTickets('empresa', tentativa);
  const dados = { chamados: lista, carregando: loading, erro: error };

  const encerrados = ['Resolvido', 'Fechado', 'Cancelado'];
  const historico = situacao === 'encerrados';
  const chamados = dados.chamados.filter(chamado => encerrados.includes(chamado.status) === historico);

  return <div className="chamados-empresa-page">
    <div className="page-heading">
      <div><div className="eyebrow">Central de Suporte</div><h1>Chamados da empresa</h1>
        <p>{nomeEmpresa ? `Acompanhe os chamados da empresa ${nomeEmpresa}.` : 'Acompanhe os chamados da sua empresa.'}</p></div>
      <Link className="primary-button" to="/chamados/novo">Novo chamado</Link>
    </div>
    <div className="empresa-situacao" role="group" aria-label="Situação dos chamados">
      <button type="button" aria-pressed={!historico} onClick={() => definirSituacao('ativos')}>Em andamento</button>
      <button type="button" aria-pressed={historico} onClick={() => definirSituacao('encerrados')}>Encerrados</button>
    </div>
    {dados.erro && dados.chamados.length > 0 && <p className="data-warning" role="alert">{dados.erro}</p>}
    {dados.carregando ? <p className="panel loading-state" role="status">Carregando chamados da empresa...</p>
      : dados.erro && !dados.chamados.length ? <div className="panel empresa-erro"><p role="alert">{dados.erro}</p><button type="button" className="secondary-button" onClick={() => definirTentativa(valor => valor + 1)}>Tentar novamente</button></div>
        : <TabelaChamados ocultarEmpresa key={situacao} tickets={chamados} query={busca} onSearch={definirBusca}
          titulo="Chamados da empresa" historico={historico} rotaBase="/chamados-empresa"/>}
  </div>;
}
