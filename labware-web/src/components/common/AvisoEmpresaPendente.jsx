import { useState } from 'react';
import { useAutenticacao } from '../../hooks/useAuth';
import { obterUsuarioDaSessao } from '../../services/authService';

export default function AvisoEmpresaPendente() {
  const { atualizarUsuario } = useAutenticacao();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  async function verificar() {
    setCarregando(true);
    setErro('');
    try {
      atualizarUsuario(await obterUsuarioDaSessao());
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setCarregando(false);
    }
  }
  return <section className="panel pending-company-notice" role="status">
    <h2>Aguardando vinculação de empresa</h2>
    <p>Aguardando aprovação e vinculação de empresa pelo suporte. Você poderá abrir e acompanhar chamados assim que seu vínculo for concluído.</p>
    <button type="button" className="secondary-button" onClick={verificar} disabled={carregando}>
      {carregando ? 'Verificando...' : 'Verificar vinculação'}
    </button>
    {erro && <p role="alert">{erro}</p>}
  </section>;
}
