export async function carregarFotoPerfil(cliente, caminho, signal) {
  const { data } = await cliente.get(caminho, { responseType: 'blob', signal });
  if (!(data instanceof Blob) || !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(data.type) || !data.size) {
    throw new Error('A API nao retornou uma foto valida.');
  }
  return data;
}

export async function enviarEConfirmarFoto(cliente, foto) {
  if (!(foto instanceof Blob) || !foto.size) throw new Error('Aguarde a preparacao da foto antes de salvar.');
  const dados = new FormData();
  dados.append('foto', foto, 'perfil.png');
  const { data: enviado } = await cliente.post('/usuarios/me/foto', dados, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  if (!enviado?.id || typeof enviado.fotoPerfil !== 'string'
      || !enviado.fotoPerfil.startsWith(`/api/usuarios/${enviado.id}/foto?v=`)) {
    throw new Error('A API nao confirmou o envio da foto. Tente novamente.');
  }
  const { data: persistido } = await cliente.get('/usuarios/me');
  if (String(persistido?.id) !== String(enviado.id) || persistido?.fotoPerfil !== enviado.fotoPerfil) {
    throw new Error('A foto enviada nao foi confirmada no perfil. Tente salvar novamente.');
  }
  try {
    await carregarFotoPerfil(cliente, enviado.fotoPerfil);
  } catch (causa) {
    throw new Error('A foto foi enviada, mas nao foi possivel carregar a imagem salva. Tente novamente.', { cause: causa });
  }
  return persistido;
}
