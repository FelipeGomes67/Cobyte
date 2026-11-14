import { useEffect, useState } from 'react';
import { listarEmpresas } from '../services/perfilService';
import { listarUsuariosPendentes, aprovarUsuario } from '../services/usuarioService';
import '../css/UsuariosPendentes.css';

export default function UsuariosPendentes() {
  const [usuarios, setUsuarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [selecoes, setSelecoes] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState({});
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    let ativo = true;
    Promise.all([listarUsuariosPendentes(), listarEmpresas()])
      .then(([pendentes, oficiais]) => {
        if (ativo) { setUsuarios(pendentes); setEmpresas(oficiais); }
      })
      .catch(falha => { if (ativo) setErro(falha.message); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, []);

  async function aprovar(usuario) {
    setErro('');
    setMensagem('');
    setSalvando(atual => ({ ...atual, [usuario.id]: true }));
    try {
      await aprovarUsuario(usuario.id, Number(selecoes[usuario.id]));
      setUsuarios(atual => atual.filter(item => item.id !== usuario.id));
      setMensagem(`${usuario.nome} foi aprovado e vinculado à empresa.`);
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setSalvando(atual => ({ ...atual, [usuario.id]: false }));
    }
  }

  return <div className="pending-users-page">
    <div className="page-heading"><div><h1>Usuários pendentes</h1>
      <p>Confira a empresa informada e selecione o cadastro oficial para liberar o cliente.</p></div></div>
    {erro && <p role="alert" className="form-error">{erro}</p>}
    {mensagem && <p role="status">{mensagem}</p>}
    {carregando ? <p role="status">Carregando usuários e empresas...</p> : <section className="panel">
      {usuarios.length === 0 ? <p className="empty-state">Nenhum usuário aguardando vinculação.</p> :
        <div className="pending-users-table"><table>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Empresa informada pelo cliente</th><th>Empresa oficial</th><th>Ação</th></tr></thead>
          <tbody>{usuarios.map(usuario => <tr key={usuario.id}>
            <td>{usuario.nome}</td><td>{usuario.email}</td><td>{usuario.empresaInformada || 'Não informada'}</td>
            <td><select aria-label={`Empresa para ${usuario.nome}`} value={selecoes[usuario.id] || ''}
              disabled={salvando[usuario.id]} onChange={evento => setSelecoes(atual => ({ ...atual, [usuario.id]: evento.target.value }))}>
              <option value="">Selecione uma empresa</option>
              {empresas.map(empresa => <option key={empresa.id} value={empresa.id}>{empresa.nome}</option>)}
            </select></td>
            <td><button className="primary-button" disabled={!selecoes[usuario.id] || salvando[usuario.id]}
              onClick={() => aprovar(usuario)}>{salvando[usuario.id] ? 'Vinculando...' : 'Aprovar e Vincular'}</button></td>
          </tr>)}</tbody>
        </table></div>}
      {empresas.length === 0 && <p className="empty-state">Cadastre uma empresa oficial para aprovar os clientes.</p>}
    </section>}
  </div>;
}
