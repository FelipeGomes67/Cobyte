import { useEffect, useState } from 'react';
import { useAutenticacao } from '../../hooks/useAuth';
import { ativarPush, desativarPush, inscricaoAtual, suportaPush } from '../../services/webPushService';
export default function AtivarWebPush() {
  const { usuario } = useAutenticacao();
  const [ativo, setAtivo] = useState(false);
  const [ocupado, setOcupado] = useState(true);
  const [mensagem, setMensagem] = useState('');
  useEffect(() => {
    let montado = true;
    inscricaoAtual().then(i => { if (montado) setAtivo(Boolean(i) && localStorage.getItem('labware-push-usuario') === String(usuario.id)); })
      .catch(() => { if (montado) setMensagem('Não foi possível consultar este dispositivo.'); })
      .finally(() => { if (montado) setOcupado(false); });
    return () => { montado = false; };
  }, [usuario.id]);
  async function alternar() {
    setOcupado(true); setMensagem('');
    try {
      if (ativo) await desativarPush(); else await ativarPush(usuario.id);
      setAtivo(!ativo);
      setMensagem(ativo ? 'Notificações desativadas neste dispositivo.' : 'Notificações ativadas neste dispositivo.');
    } catch (e) { setMensagem(e.response?.data?.message || e.message || 'Não foi possível atualizar o Web Push.'); }
    finally { setOcupado(false); }
  }
  return <section className="web-push-config">
    <h3>Notificações neste dispositivo</h3>
    <p>Receba avisos mesmo com a aba fechada. Os filtros abaixo também se aplicam a esses avisos.</p>
    {!suportaPush() && <p>Disponível em navegadores compatíveis usando HTTPS (ou localhost).</p>}
    <button type="button" className="secondary-button" disabled={ocupado || !suportaPush()} onClick={alternar}>{ocupado ? 'Aguarde...' : ativo ? 'Desativar neste dispositivo' : 'Ativar neste dispositivo'}</button>
    {mensagem && <p role="status">{mensagem}</p>}
  </section>;
}
