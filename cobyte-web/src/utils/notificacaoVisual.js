import { AlertTriangle, ClockAlert, Siren, ArrowLeftRight, Bell, CircleCheck, Flag, MessageCircle, UserRoundPlus } from 'lucide-react';

const tipos = {
  CHAMADO_CRITICO: { Icone: Siren, cor: '#b91c1c', fundo: '#fee2e2', destaque: 'notificacao-critica' },
  SLA_EM_RISCO: { Icone: ClockAlert, cor: '#92400e', fundo: '#fef3c7', destaque: 'notificacao-sla' },
  MENSAGEM: { Icone: MessageCircle, cor: '#1d4ed8', fundo: '#dbeafe' },
  STATUS: { Icone: ArrowLeftRight, cor: '#6d28d9', fundo: '#ede9fe' },
  ATRIBUICAO: { Icone: UserRoundPlus, cor: '#047857', fundo: '#d1fae5' },
  PRIORIDADE: { Icone: Flag, cor: '#b45309', fundo: '#fef3c7' },
  APROVACAO_CADASTRO: { Icone: CircleCheck, cor: '#047857', fundo: '#d1fae5' },
};
export function obterVisualNotificacao(item) {
  const tipo = String(item.tipo || '').toUpperCase();
  const visual = tipos[tipo] || (tipo.includes('SLA')
    ? { Icone: AlertTriangle, cor: '#b91c1c', fundo: '#fee2e2' }
    : { Icone: Bell, cor: '#475569', fundo: '#f1f5f9' });
  const atribuicaoAntiga = tipo === 'ATRIBUICAO' && item.titulo === 'Chamado atribuído automaticamente';
  return {
    ...visual,
    titulo: atribuicaoAntiga ? 'Novo chamado para você' : item.titulo,
    mensagem: atribuicaoAntiga
      ? 'Você foi selecionado para este atendimento. Confira o relato e inicie a análise quando estiver pronto.'
      : item.mensagem,
  };
}
