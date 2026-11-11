const codigosStatus = {
  Aberto: 'ABERTO',
  'Em análise': 'EM_ANALISE',
  'Em andamento': 'EM_ATENDIMENTO',
  'Em atendimento': 'EM_ATENDIMENTO',
  'Aguardando cliente': 'AGUARDANDO_CLIENTE',
  Resolvido: 'RESOLVIDO',
  Fechado: 'FECHADO',
};

const transicoes = {
  ABERTO: ['EM_ANALISE', 'EM_ATENDIMENTO'],
  EM_ANALISE: ['EM_ATENDIMENTO', 'AGUARDANDO_CLIENTE', 'RESOLVIDO'],
  EM_ATENDIMENTO: ['EM_ANALISE', 'AGUARDANDO_CLIENTE', 'RESOLVIDO'],
  AGUARDANDO_CLIENTE: ['EM_ATENDIMENTO', 'EM_ANALISE', 'RESOLVIDO'],
  RESOLVIDO: ['FECHADO', 'EM_ATENDIMENTO'],
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
  const chave = codigosStatus[statusAtual] || String(statusAtual || '').toUpperCase();
  const opcoes = transicoes[chave] || [];
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
