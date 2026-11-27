export async function carregarFotoPerfil(cliente, caminho, signal) {
  const { data } = await cliente.get(caminho, { responseType: 'blob', signal });
  if (!(data instanceof Blob) || !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(data.type) || !data.size) {
    throw new Error('A API nao retornou uma foto valida.');
  }
  return data;
}
