import test from 'node:test';
import assert from 'node:assert/strict';
import { getMonthlyTrend, getReportSummary, getAxisScale } from '../src/utils/reportMetrics.js';

const agora = new Date('2026-11-18T12:00:00Z');

test('fechar um chamado não apaga sua resolução do gráfico', () => {
  const chamado = { createdAt: '2026-10-01', resolvedAt: '2026-11-02', status: 'Fechado' };
  assert.equal(getMonthlyTrend([chamado], agora)[10].resolved, 1);
});

test('chamado reaberto não conta como resolução atual', () => {
  assert.equal(getMonthlyTrend([{ status: 'Em atendimento', resolvedAt: '2026-11-02' }], agora)[10].resolved, 0);
});

test('datas inválidas não derrubam o gráfico e meses futuros ficam sem dados', () => {
  const meses = getMonthlyTrend([{ createdAt: 'inválida', resolvedAt: 'inválida', status: 'Resolvido' }], agora);
  assert.equal(meses.length, 12);
  assert.equal(meses[10].opened, 0);
  assert.equal(meses[11].opened, null);
});

test('virada de mês respeita o fuso de São Paulo', () => {
  const meses = getMonthlyTrend([{ createdAt: '2026-11-01T01:00:00Z' }], agora);
  assert.equal(meses[9].opened, 1);
  assert.equal(meses[10].opened, 0);
});

test('relatório vazio não inventa médias nem porcentagens', () => {
  const resumo = getReportSummary([]);
  assert.equal(resumo.rating, null);
  assert.equal(resumo.slaPercent, null);
  assert.equal(resumo.firstResponseMinutes, null);
});

test('prioridades desconhecidas não fazem chamados desaparecerem da distribuição', () => {
  const chamados = [{ priority: 'desconhecida' }, {}, { priority: 'Crítica' }, { foraDoEscopo: true }];
  assert.equal(getReportSummary(chamados).priorities.reduce((s, p) => s + p.count, 0), 4);
});

test('escala suporta zero e valores não finitos', () => {
  for (const valor of [0, -1, NaN, Infinity, 999]) {
    const escala = getAxisScale(valor);
    assert.ok(Number.isFinite(escala.axisMax));
    assert.ok(escala.step > 0);
    assert.equal(escala.ticks[0], 0);
    assert.ok(escala.axisMax >= (Number.isFinite(valor) ? valor : 0));
  }
});
