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
    <label>
      Alterar status
      <select
        name="status"
        value={valor}
        onChange={evento => aoAlterar(evento.target.value)}
        disabled={desabilitado || !opcoes.length}
      >
        <option value="">Selecione um status</option>
        {opcoes.map(status => (
          <option key={status} value={status}>
            {nomesStatus[status]}
          </option>
        ))}
      </select>
    </label>
  );
}