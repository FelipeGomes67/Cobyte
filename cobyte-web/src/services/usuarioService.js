import api from './api';
export async function listarUsuariosPendentes() {
  const { data } = await api.get('/api/usuarios/pendentes');
  return data;
}
export async function aprovarUsuario(id, empresaId) {
  const { data } = await api.patch(`/api/usuarios/${id}/aprovar`, { empresaId });
  return data;
}
