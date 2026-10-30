export default function ChartLegend({ visible, onToggle, showFuture }) {
  return <div className="trend-legend" aria-label="Legenda do gráfico">
    <button
      type="button"
      className={`trend-legend-toggle ${visible.opened ? '' : 'is-hidden'}`}
      aria-pressed={visible.opened}
      onClick={() => onToggle('opened')}
    >
      <i className="trend-legend-opened" aria-hidden="true"/>Abertos
    </button>
    <button
      type="button"
      className={`trend-legend-toggle ${visible.resolved ? '' : 'is-hidden'}`}
      aria-pressed={visible.resolved}
      onClick={() => onToggle('resolved')}
    >
      <i className="trend-legend-resolved" aria-hidden="true"/>Resolvidos
    </button>
    <button
      type="button"
      className={`trend-legend-toggle ${visible.pending ? '' : 'is-hidden'}`}
      aria-pressed={visible.pending}
      onClick={() => onToggle('pending')}
    >
      <i className="trend-legend-pending" aria-hidden="true"/>Pendentes
    </button>
    {showFuture && <span className="trend-future-legend"><i aria-hidden="true"/>Meses sem dados</span>}
  </div>;
}
