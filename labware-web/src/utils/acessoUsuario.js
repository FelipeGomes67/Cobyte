export function empresaPendente(usuario) {
  return usuario?.perfil === 'CLIENTE' && (usuario.empresaId == null || usuario.empresaId === '');
}
