const codigosStatus = {
  Aberto: 'ABERTO',
  'Em análise': 'EM_ANALISE',
  'Em andamento': 'EM_ATENDIMENTO',
  'Em atendimento': 'EM_ATENDIMENTO',
  'Aguardando cliente': 'AGUARDANDO_SOLICITANTE',
  'Aguardando solicitante': 'AGUARDANDO_SOLICITANTE',
  Cancelado: 'CANCELADO',
  Resolvido: 'RESOLVIDO',
  Fechado: 'FECHADO',
};

const transicoes = {
  ABERTO: ['EM_ANALISE', 'CANCELADO'],
  EM_ANALISE: ['EM_ATENDIMENTO', 'AGUARDANDO_SOLICITANTE', 'CANCELADO'],
  EM_ATENDIMENTO: ['RESOLVIDO', 'AGUARDANDO_SOLICITANTE', 'EM_ANALISE'],
  AGUARDANDO_SOLICITANTE: ['EM_ATENDIMENTO', 'CANCELADO'],
  RESOLVIDO: ['FECHADO', 'EM_ATENDIMENTO'],
  FECHADO: [],
  CANCELADO: [],
};

const nomesStatus = {
  ABERTO: 'Aberto',
  EM_ANALISE: 'Em análise',
  EM_ATENDIMENTO: 'Em atendimento',
  AGUARDANDO_SOLICITANTE: 'Aguardando solicitante',
  CANCELADO: 'Cancelado',
  RESOLVIDO: 'Resolvido',
  FECHADO: 'Fechado',
};

export default function SelectStatus({
  statusAtual,
  valor,
  aoAlterar,
  desabilitado = false,
  somenteCancelamento = false,
}) {
  const chave = codigosStatus[statusAtual] || String(statusAtual || '').toUpperCase().replace('AGUARDANDO_CLIENTE', 'AGUARDANDO_SOLICITANTE');
  const opcoes = (transicoes[chave] || []).filter(status => !somenteCancelamento || status === 'CANCELADO');
  const labelAtual = nomesStatus[chave] || nomesStatus[statusAtual] || statusAtual || 'Selecione um status';

  return (
    <label className="select-status">
      <span className="select-status-label">Alterar status</span>
      <span className="select-status-control">
      <select
        className="select-status-input"
        name="status"
        value={valor}
        onChange={evento => aoAlterar(evento.target.value)}
        disabled={desabilitado || !opcoes.length}
      >
        <option value="">{`Status atual: ${labelAtual}`}</option>
        {opcoes.map(status => (
          <option key={status} value={status}>
            {nomesStatus[status]}
          </option>
        ))}
      </select>
      <svg className="select-status-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      </span>
    </label>
  );
}
