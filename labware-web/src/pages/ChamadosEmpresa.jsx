import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAuth';
import { obterChamadosDaEmpresa } from '../services/ticketService';
import TabelaChamados from '../components/ticket/TabelaChamados';
import '../css/ChamadosEmpresa.css';

export default function ChamadosEmpresa() {
  const { usuario } = useAutenticacao();
  const empresaId = usuario?.empresaId;
  const nomeEmpresa = typeof usuario?.empresa === 'object' ? usuario.empresa?.nome : usuario?.empresa;
  const [dados, definirDados] = useState({ chamados: [], carregando: true, erro: '' });
  const [busca, definirBusca] = useState('');
  const [situacao, definirSituacao] = useState('ativos');
  const [tentativa, definirTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      definirDados({ chamados: [], carregando: true, erro: '' });
      try {
        const chamados = await obterChamadosDaEmpresa(empresaId);
        if (ativo) definirDados({ chamados, carregando: false, erro: '' });
      } catch (erro) {
        if (ativo) definirDados({ chamados: [], carregando: false, erro: erro.message });
      }
    }
    carregar();
    return () => { ativo = false; };
  }, [empresaId, tentativa]);

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
    {dados.carregando ? <p className="panel loading-state" role="status">Carregando chamados da empresa…</p>
      : dados.erro ? <div className="panel empresa-erro"><p role="alert">{dados.erro}</p><button type="button" className="secondary-button" onClick={() => definirTentativa(valor => valor + 1)}>Tentar novamente</button></div>
        : <TabelaChamados key={situacao} tickets={chamados} query={busca} onSearch={definirBusca}
          titulo="Chamados da empresa" historico={historico} rotaBase="/chamados-empresa"/>}
  </div>;
}
