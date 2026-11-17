import EstadoConteudo from '../components/common/EstadoConteudo';
import { useEffect, useState } from 'react';
import { listarEmpresas } from '../services/perfilService';
import { useAutenticacao } from '../hooks/useAuth';
import api from '../services/api';
import '../css/Administracao.css';

export default function Administracao({ tipo }) {
  const { usuario } = useAutenticacao();
  const [edicao, setEdicao] = useState(null);
  const [opcoesEmpresas, setOpcoesEmpresas] = useState([]);
  const [erroEmpresas, setErroEmpresas] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  useEffect(() => {
    let ativo = true;
    listarEmpresas().then(lista => { if (ativo) setOpcoesEmpresas(lista); })
      .catch(() => { if (ativo) setErroEmpresas('Não foi possível carregar as empresas. Atualize a página para tentar novamente.'); });
    return () => { ativo = false; };
  }, []);
  const empresas = tipo === 'empresas';
  const [busca, setBusca] = useState('');
  const [perfil, setPerfil] = useState('');
  const [page, setPage] = useState(0);
  const [versao, setVersao] = useState(0);
  const [estado, setEstado] = useState({ carregando: true, dados: null, erro: '' });
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState('');
  useEffect(() => {
    let ativo = true;
    const timer = setTimeout(async () => {
      setEstado({ carregando: true, dados: null, erro: '' });
      try {
        const { data } = await api.get('/admin/' + tipo, { params: { page, ...(!empresas && { busca, perfil: perfil || undefined }) } });
        if (ativo) setEstado({ carregando: false, dados: data, erro: '' });
      } catch (erro) {
        if (ativo) setEstado({ carregando: false, dados: null, erro: erro.message || 'Não foi possível carregar a lista.' });
      }
    }, 250);
    return () => { ativo = false; clearTimeout(timer); };
  }, [tipo, empresas, page, busca, perfil, versao]);
  async function cadastrar(event) {
    event.preventDefault();
    setSalvando(true); setAviso('');
    try {
      await api.post('/empresas', { nome: nome.trim(), cnpj: cnpj.trim() });
      setNome(''); setCnpj(''); setPage(0); setVersao(v => v + 1);
      setAviso('Empresa cadastrada com sucesso.');
    } catch (erro) { setAviso(erro.message || 'Não foi possível cadastrar a empresa.'); }
    finally { setSalvando(false); }
  }
  async function salvarUsuario(event) {
    event.preventDefault();
    if (!confirmando) { setConfirmando(true); return; }
    if (salvando) return;
    setSalvando(true); setAviso('');
    try {
      await api.patch('/admin/usuarios/' + edicao.id, {
        perfil: edicao.perfil,
        empresaId: edicao.perfil === 'CLIENTE' && edicao.empresaId ? Number(edicao.empresaId) : null,
      });
      setEdicao(null); setConfirmando(false); setVersao(v => v + 1);
      setAviso('Perfil e empresa atualizados com sucesso.');
    } catch (erro) { setAviso(erro.message || 'Não foi possível salvar as alterações.'); }
    finally { setSalvando(false); }
  }
  const dados = estado.dados;
  return <div className="admin-page">
    <header><p>ADMINISTRAÇÃO</p><h1>{empresas ? 'Empresas' : 'Usuários'}</h1>
      <p>{empresas ? 'Consulte as empresas e cadastre novos vínculos para atendimento.' : 'Consulte as contas, os perfis de acesso e os vínculos de empresa.'}</p>
    </header>
    {empresas ? <form className="admin-card admin-form" onSubmit={cadastrar}>
      <h2>Cadastrar empresa</h2>
      <label>Nome<input required maxLength={255} value={nome} onChange={e => setNome(e.target.value)} /></label>
      <label>CNPJ<input required maxLength={18} value={cnpj} onChange={e => setCnpj(e.target.value)} /></label>
      <button disabled={salvando}>{salvando ? 'Salvando...' : 'Cadastrar empresa'}</button>
      {aviso && <p role="status">{aviso}</p>}
    </form> : <section className="admin-card admin-filters" aria-label="Filtros de usuários">
      <label>Buscar por nome ou e-mail<input type="search" value={busca} onChange={e => { setBusca(e.target.value); setPage(0); }} placeholder="Pesquisar usuários" /></label>
      <label>Perfil<select value={perfil} onChange={e => { setPerfil(e.target.value); setPage(0); }}>
        <option value="">Todos os perfis</option><option value="CLIENTE">Cliente</option><option value="SUPORTE">Suporte</option><option value="ADMIN">Admin</option>
      </select></label>
    </section>}
    {!empresas && aviso && <p role="status">{aviso}</p>}
    {edicao && <form className="admin-card admin-form" onSubmit={salvarUsuario}>
      <h2>Editar usuário: {edicao.nome}</h2>
      <p>{edicao.email}</p>
      <label>Perfil<select disabled={salvando || String(edicao.id) === String(usuario?.id)} value={edicao.perfil} onChange={e => { setEdicao({ ...edicao, perfil: e.target.value, empresaId: '' }); setConfirmando(false); }}>
        <option value="CLIENTE">Cliente</option><option value="SUPORTE">Suporte</option><option value="ADMIN">Admin</option>
      </select></label>
      {edicao.perfil === 'CLIENTE' ? <label>Empresa<select disabled={salvando || !!erroEmpresas} value={edicao.empresaId} onChange={e => { setEdicao({ ...edicao, empresaId: e.target.value }); setConfirmando(false); }}>
        <option value="">Sem empresa — aguardando vínculo</option>
        {edicao.empresaId && !opcoesEmpresas.some(e => String(e.id) === String(edicao.empresaId)) && <option value={edicao.empresaId} disabled>{edicao.empresaNome} (indisponível)</option>}
        {opcoesEmpresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
      </select></label> : <p>Suporte e ADMIN não possuem empresa vinculada.</p>}
      {erroEmpresas && <p role="alert">{erroEmpresas}</p>}
      {confirmando && <p role="alert">Confirme a alteração de perfil e empresa de {edicao.nome}. As permissões serão atualizadas; alterar a empresa muda o acesso aos chamados da empresa.</p>}
      <button disabled={salvando || (edicao.perfil === 'CLIENTE' && !!erroEmpresas)}>{salvando ? 'Salvando...' : confirmando ? 'Confirmar alterações' : 'Salvar alterações'}</button>
      <button type="button" disabled={salvando} onClick={() => { setEdicao(null); setConfirmando(false); setAviso(''); }}>Cancelar</button>
    </form>}
    <section className="admin-card" aria-label={empresas ? 'Lista de empresas' : 'Lista de usuários'} aria-busy={estado.carregando}>
      {estado.carregando ? <EstadoConteudo tipo="carregando" mensagem="Carregando registros..." /> : estado.erro ? <EstadoConteudo tipo="erro" mensagem={estado.erro} onTentar={() => setVersao(v => v + 1)} /> : <>
        <p>{dados?.totalElements || 0} {empresas ? 'empresas cadastradas' : 'usuários encontrados'}</p>
        <div className="admin-table" role="region" tabIndex={0} aria-label="Registros administrativos; role horizontalmente para ver todas as colunas"><table><thead><tr><th scope="col">Nome</th>{empresas ? <><th scope="col">CNPJ</th><th scope="col">Situação</th></> : <><th scope="col">E-mail</th><th scope="col">Perfil</th><th scope="col">Empresa</th><th scope="col">Ações</th></>}</tr></thead>
          <tbody>{dados?.content.map(item => <tr key={item.id}><td>{item.nome}</td>{empresas ? <><td>{item.cnpj}</td><td>{item.ativa ? 'Ativa' : 'Inativa'}</td></> : <><td>{item.email}</td><td>{item.perfil}</td><td>{item.empresaNome || (item.perfil === 'CLIENTE' ? 'Aguardando vínculo' + (item.empresaInformada ? ' — ' + item.empresaInformada : '') : 'Não se aplica')}</td><td><button disabled={salvando} onClick={() => { setEdicao({ ...item, empresaId: item.empresaId == null ? '' : String(item.empresaId) }); setConfirmando(false); setAviso(''); }}>Editar</button></td></>}</tr>)}</tbody>
        </table></div>
        {!dados?.content.length && <EstadoConteudo mensagem="Nenhum registro encontrado para os filtros selecionados." />}
        <footer className="admin-pagination"><button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</button>
          <span>Página {page + 1} de {Math.max(1, dados?.totalPages || 0)}</span>
          <button disabled={!dados || page + 1 >= dados.totalPages} onClick={() => setPage(p => p + 1)}>Próxima</button></footer>
      </>}
    </section>
  </div>;
}
