import { formatChartNumber } from '../../utils/chartUtils';

export default function ChartTooltip({ month, year, opened, resolved, pending, left, top, above, arrowLeft }) {
  if (!month) return null;

  return <div
    className={`trend-tooltip ${above ? 'trend-tooltip--above' : 'trend-tooltip--below'}`}
    style={{ left, top, '--tooltip-arrow-left': arrowLeft }}
    role="status"
    aria-live="polite"
  >
    <strong>{month} {year}</strong>
    <span className="opened-value">Abertos: {formatChartNumber(opened)}</span>
    <span className="resolved-value">Resolvidos: {formatChartNumber(resolved)}</span>
    <span className="pending-value">Pendentes: {formatChartNumber(pending)}</span>
    <small>Entre os chamados criados no mês</small>
  </div>;
}
