import api from './api';
export const EVENTO_NOTIFICACOES = 'labware-notificacoes-atualizadas';
export async function consultarNotificacoes(page = 0, size = 20) {
  const [lista, contador] = await Promise.all([api.get('/notificacoes', { params: { page, size } }), api.get('/notificacoes/contador-nao-lidas')]);
  return { ...lista.data, naoLidas: contador.data.naoLidas };
}
export async function marcarNotificacao(id) {
  await api.put(id == null ? '/notificacoes/marcar-todas-lidas' : '/notificacoes/' + id + '/lida');
  window.dispatchEvent(new Event(EVENTO_NOTIFICACOES));
}
export async function consultarPreferencias() { return (await api.get('/usuarios/me/configuracoes-notificacao')).data; }
export async function salvarPreferencias(dados) { return (await api.put('/usuarios/me/configuracoes-notificacao', dados)).data; }
