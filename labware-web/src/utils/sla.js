const finalizados = new Set(['Resolvido', 'Fechado', 'Cancelado', 'RESOLVIDO', 'FECHADO', 'CANCELADO']);
export function restanteSlaMs(chamado, agora = Date.now()) {
  if (chamado.slaStatus === 'NAO_APLICAVEL' || chamado.foraDoEscopo || chamado.priority === 'Melhoria') return null;
  const segundos = chamado.slaResolucaoRestanteSegundos;
  if (segundos != null && Number.isFinite(Number(segundos))) {
    const parado = chamado.slaPausado || finalizados.has(chamado.statusRaw || chamado.status);
    const decorrido = parado ? 0 : Math.max(0, agora - (chamado.slaConsultadoEm ?? agora));
    return Number(segundos) * 1000 - decorrido;
  }
  // Compatibilidade durante atualização gradual da API.
  if (chamado.slaPausado) return null;
  const prazo = Date.parse(chamado.slaDueAt || chamado.prazoResolucao);
  return Number.isFinite(prazo) ? prazo - agora : null;
}
export function correspondeFiltroSla(chamado, filtro, agora = Date.now()) {
  if (!filtro) return true;
  const restante = restanteSlaMs(chamado, agora);
  if (filtro === 'pausado') return Boolean(chamado.slaPausado);
  if (filtro === 'sem-sla') return !chamado.slaPausado && restante == null;
  if (filtro === 'vencido') return chamado.slaStatus === 'VIOLADO' || (restante != null && restante < 0);
  if (finalizados.has(chamado.statusRaw || chamado.status) || chamado.slaPausado) return false;
  const limite = Number(filtro);
  return limite > 0 && restante != null && restante >= 0 && restante <= limite * 3600000;
}
