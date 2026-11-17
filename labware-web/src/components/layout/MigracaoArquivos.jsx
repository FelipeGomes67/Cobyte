import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';

export default function MigracaoArquivos() {
  const [executando, setExecutando] = useState(false);
  const [itens, setItens] = useState([]);
  const [mensagem, setMensagem] = useState('');
  const cancelar = useRef(false);
  useEffect(() => () => { cancelar.current = true; }, []);
  async function copiar() {
    cancelar.current = false;
    setExecutando(true); setItens([]); setMensagem('');
    let aposAnexo = 0, aposUsuario = 0;
    try {
      let temMais = true;
      while (temMais && !cancelar.current) {
        const { data } = await api.post('/armazenamento/migrar-local', null, {
          params: { aposAnexo, aposUsuario }, timeout: 120000,
        });
        if (cancelar.current) break;
        setItens(anteriores => [...anteriores, ...data.itens]);
        if (data.temMais && data.proximoAnexo === aposAnexo && data.proximoUsuario === aposUsuario)
          throw new Error('A transferência não avançou. Tente novamente.');
        aposAnexo = data.proximoAnexo; aposUsuario = data.proximoUsuario; temMais = data.temMais;
      }
      if (!cancelar.current) setMensagem('Verificação concluída. Confira os resultados abaixo. Os arquivos locais foram preservados.');
    } catch (erro) {
      if (!cancelar.current) setMensagem(erro.response?.data?.mensagem || erro.message || 'Não foi possível concluir a transferência.');
    } finally { if (!cancelar.current) setExecutando(false); }
  }
  return <div className="migracao-arquivos">
    <h2>Arquivos compartilhados</h2>
    <p>Novas evidências e fotos são salvas no banco compartilhado. Para disponibilizar os arquivos antigos, execute a cópia na máquina que possui os uploads originais.</p>
    <p>As pastas locais devem corresponder aos diretórios de uploads configurados nesta API. A cópia preserva os arquivos originais e pode ser executada novamente.</p>
    <button className="primary-button" onClick={copiar} disabled={executando}>{executando ? 'Copiando arquivos...' : 'Copiar arquivos locais para o banco'}</button>
    {executando && <p role="status">{itens.length} registros verificados. Aguarde a conclusão.</p>}
    {mensagem && <p role="status">{mensagem}</p>}
    {itens.length > 0 && <div className="ticket-table-wrap"><table><thead><tr><th>Tipo</th><th>ID</th><th>Resultado</th></tr></thead><tbody>
      {itens.map(item => <tr key={item.tipo + item.id}><td>{item.tipo}</td><td>{item.id}</td><td>{item.resultado}</td></tr>)}
    </tbody></table></div>}
  </div>;
}
