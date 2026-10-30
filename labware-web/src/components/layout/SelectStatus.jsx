const transicoes = {
  ABERTO: ['EM_ANALISE'],
  EM_ANALISE: ['EM_ATENDIMENTO', 'AGUARDANDO_CLIENTE'],
  EM_ATENDIMENTO: ['AGUARDANDO_CLIENTE', 'RESOLVIDO'],
  AGUARDANDO_CLIENTE: ['EM_ATENDIMENTO', 'RESOLVIDO'],
  RESOLVIDO: ['FECHADO'],
  FECHADO: [],
};

const nomesStatus = {
  ABERTO: 'Aberto',
  EM_ANALISE: 'Em análise',
  EM_ATENDIMENTO: 'Em atendimento',
  AGUARDANDO_CLIENTE: 'Aguardando cliente',
  RESOLVIDO: 'Resolvido',
  FECHADO: 'Fechado',
};

export default function SelectStatus({
  statusAtual,
  valor,
  aoAlterar,
  desabilitado = false,
}) {
  const opcoes = transicoes[statusAtual] || [];

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
        <option value="">{nomesStatus[statusAtual] || 'Selecione um status'}</option>
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
