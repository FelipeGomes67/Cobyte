import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularDashboard, formatarDuracao, formatarRestanteSla, obterStatus } from '../src/utils/dashboard.js';

const agora = new Date('2026-11-06T12:00:00Z').getTime();
const chamado = { id: '1', status: 'Aberto', priority: 'Alta', category: 'Acesso', createdAt: '2026-11-06T10:00:00Z' };

test('base vazia não inventa cumprimento de SLA nem tempos médios', () => {
  const dados = calcularDashboard([], agora);
  assert.equal(dados.total, 0);
  assert.equal(dados.cumprimentoSla, null);
  assert.equal(dados.tempoResolucao, null);
  assert.equal(dados.tempoResposta, null);
  assert.equal(dados.evolucao.length, 30);
  assert.ok(dados.evolucao.every(dia => dia.abertos === 0 && dia.fechados === 0));
});

test('status em português e enum usam a mesma distribuição e excluem finalizados da fila', () => {
  const dados = calcularDashboard([
    chamado,
    { ...chamado, id: '2', status: 'Em andamento' },
    { ...chamado, id: '3', status: 'EM_ATENDIMENTO' },
    { ...chamado, id: '4', status: 'Resolvido' },
    { ...chamado, id: '5', status: 'FECHADO' },
  ], agora);
  assert.equal(dados.ativos, 3);
  assert.equal(dados.resolvidos, 2);
  assert.equal(dados.status.find(item => item.chave === 'EM_ATENDIMENTO').quantidade, 2);
  assert.equal(dados.status.reduce((soma, item) => soma + item.quantidade, 0), dados.total);
  assert.equal(obterStatus({ status: 'Aguardando cliente' }).chave, 'AGUARDANDO_CLIENTE');
});

test('fila de atenção inclui vencidos e críticos ativos sem duplicar ou incluir resolvidos', () => {
  const dados = calcularDashboard([
    { ...chamado, id: 'vencido', slaDueAt: '2026-11-06T11:00:00Z' },
    { ...chamado, id: 'critico', priority: 'Crítica', slaDueAt: '2026-11-06T12:30:00Z' },
    { ...chamado, id: 'no-limite', slaDueAt: '2026-11-06T13:00:00Z' },
    { ...chamado, id: 'resolvido', priority: 'Crítica', status: 'Resolvido', slaDueAt: '2026-11-06T11:00:00Z' },
    { ...chamado, id: 'sem-sla' },
  ], agora);
  assert.equal(dados.emRisco, 2);
  assert.equal(dados.criticos, 1);
  assert.deepEqual(dados.prioritarios.map(item => item.id), ['vencido', 'critico']);
});

test('SLA e médias consideram somente dados válidos e aceitam resposta de zero minutos', () => {
  const dados = calcularDashboard([
    { ...chamado, status: 'Resolvido', resolvedAt: '2026-11-06T11:00:00Z', slaDueAt: '2026-11-06T12:00:00Z', firstResponseMinutes: 0 },
    { ...chamado, id: '2', status: 'FECHADO', resolvedAt: '2026-11-06T12:00:00Z', slaDueAt: '2026-11-06T11:00:00Z', firstResponseMinutes: 20 },
    { ...chamado, id: '3', status: 'Resolvido', resolvedAt: 'inválida' },
  ], agora);
  assert.equal(dados.cumprimentoSla, 50);
  assert.equal(dados.tempoResolucao, 90);
  assert.equal(dados.tempoResposta, 10);
  assert.equal(dados.evolucao.at(-1).abertos, 3);
  assert.equal(dados.evolucao.at(-1).fechados, 2);
});

test('valores adicionais continuam representados nas legendas', () => {
  const dados = calcularDashboard([{ ...chamado, priority: 'Urgente', category: 'Módulo adicional', status: 'Triagem' }], agora);
  for (const itens of [dados.status, dados.categorias, dados.prioridades]) {
    assert.equal(itens.reduce((soma, item) => soma + item.quantidade, 0), 1);
  }
});

test('formatos de duração preservam zero, ausência de dados e prazo vencido', () => {
  assert.equal(formatarDuracao(null), '—');
  assert.equal(formatarDuracao(0), '0min');
  assert.equal(formatarDuracao(75), '1h 15min');
  assert.equal(formatarRestanteSla(null), 'Não definido');
  assert.equal(formatarRestanteSla(-11804000), '-03:16:44');
});
