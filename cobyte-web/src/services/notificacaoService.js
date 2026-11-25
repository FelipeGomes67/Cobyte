import api from './api';
export const EVENTO_NOTIFICACOES = 'cobyte-notificacoes-atualizadas';
export async function consultarNotificacoes(page = 0, size = 20, filtro = 'todas') {
  const [lista, contador] = await Promise.all([api.get('/notificacoes', { params: { page, size, filtro } }), api.get('/notificacoes/contador-nao-lidas')]);
  if (!Array.isArray(lista.data?.content) || !Number.isInteger(lista.data?.totalPages)
      || lista.data.totalPages < 0 || !Number.isInteger(contador.data?.naoLidas) || contador.data.naoLidas < 0) {
    throw new Error('Não foi possível carregar as notificações: resposta inválida da API.');
  }
  return { ...lista.data, naoLidas: contador.data.naoLidas };
}
export async function marcarNotificacao(id) {
  await api.put(id == null ? '/notificacoes/marcar-todas-lidas' : '/notificacoes/' + id + '/lida');
  window.dispatchEvent(new CustomEvent(EVENTO_NOTIFICACOES, { detail: { id } }));
}
export async function consultarPreferencias() { return (await api.get('/usuarios/me/configuracoes-notificacao')).data; }
export async function salvarPreferencias(dados) { return (await api.put('/usuarios/me/configuracoes-notificacao', dados)).data; }
