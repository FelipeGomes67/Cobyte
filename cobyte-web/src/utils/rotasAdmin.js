const rotasAdmin = new Set([
  '/admin/usuarios', '/admin/empresas', '/admin/chamados',
  '/usuarios-pendentes', '/perfil', '/configuracoes',
]);

export function rotaPermitidaAdmin(caminho) {
  const rota = caminho.replace(/\/$/, '');
  if (rotasAdmin.has(rota)) return true;
  // Os links da tabela e das notificacoes abrem as rotas compartilhadas de detalhes.
  return /^\/(chamado|chamados)\/[^/]+$/.test(rota) && rota !== '/chamados/novo';
}
