import { formatChartNumber } from '../../utils/chartUtils';

export default function ChartSummary({ totals }) {
  return <div
    className="trend-annual-summary"
    aria-label={`Totais anuais: ${totals.opened} criados, ${totals.resolved} resolvidos e ${totals.pending} pendentes`}
  >
    <span className="trend-summary-opened"><i/> <strong>{formatChartNumber(totals.opened)}</strong> criados no ano</span>
    <span className="trend-summary-resolved"><i/> <strong>{formatChartNumber(totals.resolved)}</strong> resolvidos no ano</span>
    <span className="trend-summary-pending"><i/> <strong>{formatChartNumber(totals.pending)}</strong> pendentes*</span>
  </div>;
}
