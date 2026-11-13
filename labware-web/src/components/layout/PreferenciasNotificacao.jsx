import AtivarWebPush from './AtivarWebPush';
import { useEffect, useState } from 'react';
import { consultarPreferencias, salvarPreferencias } from '../../services/notificacaoService';
export default function PreferenciasNotificacao() {
  const [preferencias, setPreferencias] = useState(null);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    let ativo = true;
    consultarPreferencias().then(dados => { if (ativo) { setPreferencias(dados); setErro(''); } })
      .catch(() => { if (ativo) setErro('Não foi possível carregar suas preferências.'); });
    return () => { ativo = false; };
  }, [tentativa]);
  async function salvar(e) {
    e.preventDefault(); setSalvando(true); setErro(''); setSucesso('');
    try { setPreferencias(await salvarPreferencias(preferencias)); setSucesso('Preferências salvas na sua conta.'); }
    catch { setErro('Não foi possível salvar as preferências.'); }
    finally { setSalvando(false); }
  }
  return <div className="preferencias-reais"><h2>Preferências de notificação</h2>
    <p>Escolha quais avisos deseja receber no sistema, por e-mail e nos dispositivos ativados.</p><AtivarWebPush />
    {erro && <p role="alert">{erro}</p>}{sucesso && <p role="status">{sucesso}</p>}
    {!preferencias ? <><p>Carregando preferências...</p>{erro && <button onClick={() => setTentativa(t => t + 1)}>Tentar novamente</button>}</> :
    <form onSubmit={salvar}>
      {[['novasMensagens', 'Novas mensagens', 'Respostas e atualizações na conversa dos chamados.'], ['alteracoesStatus', 'Abertura e mudanças de status', 'Acompanhe o registro e as etapas do atendimento.'], ['atribuicoes', 'Atribuição de chamados', 'Saiba quando um chamado for atribuído a você.']].map(([chave, nome, descricao]) =>
        <label className="preferencia-linha" key={chave}><span><strong>{nome}</strong><small>{descricao}</small></span><input type="checkbox" checked={preferencias[chave]} disabled={salvando} onChange={e => { setSucesso(''); setPreferencias(p => ({ ...p, [chave]: e.target.checked })); }} /></label>)}
      <button className="primary-button" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar preferências'}</button>
    </form>}
  </div>;
}
