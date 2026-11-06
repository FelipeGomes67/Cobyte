import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import AnimatedChartLine from './AnimatedChartLine';
import ChartLegend from './ChartLegend';
import ChartSummary from './ChartSummary';
import ChartTooltip from './ChartTooltip';
import useChartSize from '../../hooks/useChartSize';
import useHorizontalScroll from '../../hooks/useHorizontalScroll';
import { getPendingCount } from '../../utils/reportMetrics';
import { createAreaPath, createMonotonePath, formatChartNumber, getNiceScale } from '../../utils/chartUtils';

const CHART_HEIGHT = 280;
const DEFAULT_CHART_WIDTH = 1100;
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const SERIES = ['opened', 'resolved', 'pending'];
function getMonthPending(item) {
  return Number.isFinite(item.pending)
    ? Math.max(0, item.pending)
    : getPendingCount(item.opened, item.resolved);
}

function getTooltipPosition(point, viewportWidth, chartHeight, scrollLeft) {
  const width = Math.min(220, Math.max(160, viewportWidth - 16));
  const left = Math.max(
    scrollLeft + 8,
    Math.min(point.x - width / 2, scrollLeft + viewportWidth - width - 8),
  );
  const above = point.y > chartHeight - 150;
  const arrowLeft = Math.max(12, Math.min(point.x - left, width - 12));
  return {
    left,
    top: above ? point.y - 12 : point.y + 12,
    above,
    arrowLeft: `${arrowLeft}px`,
  };
}

function interpolateValues(previous, next, progress) {
  return next.map((value, seriesIndex) => {
    const from = previous?.[seriesIndex] ?? 0;
    return from + (value - from) * progress;
  });
}

function ChartMarker({ series, point, selected }) {
  const size = selected ? 6 : 5;
  if (series === 'opened') {
    return <circle cx={point.x} cy={point.y} r={size} className="trend-point-opened"/>;
  }
  if (series === 'resolved') {
    return <polygon
      points={`${point.x},${point.y - size} ${point.x + size},${point.y} ${point.x},${point.y + size} ${point.x - size},${point.y}`}
      className="trend-point-resolved"
    />;
  }
  return <polygon
    points={`${point.x},${point.y - size} ${point.x + size},${point.y + size / 2} ${point.x - size},${point.y + size / 2}`}
    className="trend-point-pending"
  />;
}

export default function EvolucaoMensalChart({
  trend = [],
  years = [],
  selectedYear,
  onYearChange = () => {},
}) {
  const safeTrend = useMemo(() => (
    Array.isArray(trend)
      ? trend.filter(item => item && typeof item === 'object').slice(0, 12)
      : []
  ), [trend]);
  const safeYears = Array.isArray(years) ? years.filter(Number.isFinite) : [];
  const updateYear = typeof onYearChange === 'function' ? onYearChange : () => {};
  const availableMonths = useMemo(() => safeTrend.filter(item => item.available), [safeTrend]);
  const lastAvailableIndex = safeTrend.map(item => item.available).lastIndexOf(true);
  const yearLabel = String(selectedYear ?? safeTrend[0]?.year ?? '');
  const [activeIndex, setActiveIndex] = useState(null);
  const [pinnedIndex, setPinnedIndex] = useState(null);
  const [visible, setVisible] = useState({ opened: true, resolved: true, pending: true });
  const { ref: plotRef, width: plotWidth, height: plotHeight, measure } = useChartSize();
  const {
    ref: scrollRef,
    scrollLeft,
    clientWidth: scrollViewportWidth,
    hasLeftOverflow,
    hasRightOverflow,
    hasOverflow,
    showHint,
    measure: measureScroll,
    dismissHint,
  } = useHorizontalScroll({
    activeIndex: pinnedIndex ?? lastAvailableIndex,
    selectedMonth: pinnedIndex,
    year: selectedYear,
    enabled: availableMonths.length > 0,
  });
  const pointButtonRefs = useRef([]);
  const pointerStart = useRef(null);
  const suppressClick = useRef(false);
  const currentValues = useRef(null);
  const chartId = useId().replace(/:/g, '');

  const targetValues = useMemo(() => safeTrend.map(item => (
    item.available
      ? [
        Math.max(0, Number.isFinite(item.opened) ? item.opened : 0),
        Math.max(0, Number.isFinite(item.resolved) ? item.resolved : 0),
        getMonthPending(item),
      ]
      : null
  )), [safeTrend]);
  const [animatedValues, setAnimatedValues] = useState(targetValues);

  useEffect(() => {
    const from = currentValues.current || targetValues;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const duration = reducedMotion ? 0 : 560;
    let frameId;
    let startTime;

    const animate = timestamp => {
      if (startTime === undefined) startTime = timestamp;
      const progress = duration === 0 ? 1 : Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - ((1 - progress) ** 3);
      const values = targetValues.map((month, index) => (
        month === null ? null : interpolateValues(from[index], month, eased)
      ));
      currentValues.current = values;
      setAnimatedValues(values);
      if (progress < 1) frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [targetValues]);

  const totals = useMemo(() => availableMonths.reduce((result, item) => ({
    opened: result.opened + (Number.isFinite(item.opened) ? item.opened : 0),
    resolved: result.resolved + (Number.isFinite(item.resolved) ? item.resolved : 0),
    pending: result.pending + getMonthPending(item),
  }), { opened: 0, resolved: 0, pending: 0 }), [availableMonths]);

  const peak = availableMonths.reduce((maximum, item) => SERIES.reduce((seriesMaximum, key) => (
    visible[key] ? Math.max(seriesMaximum, Number.isFinite(item[key]) ? item[key] : key === 'pending' ? getMonthPending(item) : 0) : seriesMaximum
  ), maximum), 0);
  const { axisMax, ticks } = getNiceScale(peak);
  const chartWidth = Math.max(1, Math.round(plotWidth || DEFAULT_CHART_WIDTH));
  const chartHeight = Math.max(1, Math.round(plotHeight || CHART_HEIGHT));
  const chartTop = 22;
  const chartBottom = chartHeight - 26;
  const plotLeft = 10;
  const plotRight = chartWidth - 10;
  const plotWidthUnits = plotRight - plotLeft;
  const yAxisWidth = Math.max(42, formatChartNumber(ticks[ticks.length - 1]).length * 7 + 12);

  const pointAt = useCallback((value, index, visualOffset = 0) => ({
    x: plotLeft + ((index + 0.5) / safeTrend.length) * plotWidthUnits,
    y: chartBottom - (value / axisMax) * (chartBottom - chartTop) + visualOffset,
  }), [axisMax, chartBottom, chartTop, plotLeft, plotWidthUnits, safeTrend.length]);

  const pointData = safeTrend.map((item, index) => {
    if (!item.available) return null;
    const values = animatedValues[index] || [0, 0, 0];
    const zeroOverlap = values.every(value => value === 0);
    const visualOffsets = zeroOverlap ? [1.5, 0, -1.5] : [0, 0, 0];
    return {
      item,
      index,
      values,
      actual: targetValues[index] || [0, 0, 0],
      zeroOverlap,
      points: {
        opened: pointAt(values[0], index, visualOffsets[0]),
        resolved: pointAt(values[1], index, visualOffsets[1]),
        pending: pointAt(values[2], index, visualOffsets[2]),
      },
    };
  });
  const selectedIndex = pinnedIndex ?? activeIndex;
  const selectedPoint = selectedIndex === null ? null : pointData[selectedIndex];
  const selectedMonth = selectedPoint?.item;
  const selectedValues = selectedPoint?.actual;
  const anchorValue = selectedValues ? Math.max(...selectedValues) : 0;
  const tooltipAnchor = selectedPoint
    ? pointAt(anchorValue, selectedIndex)
    : null;
  const viewportWidth = Math.max(1, scrollViewportWidth || plotWidth);
  const tooltipPosition = tooltipAnchor
    ? getTooltipPosition({
      x: (tooltipAnchor.x / chartWidth) * chartWidth,
      y: (tooltipAnchor.y / chartHeight) * chartHeight,
    }, viewportWidth, chartHeight, scrollLeft)
    : null;
  const futureStartX = lastAvailableIndex >= 0 && lastAvailableIndex < safeTrend.length - 1
    ? plotLeft + ((lastAvailableIndex + 1) / safeTrend.length) * plotWidthUnits
    : null;
  const seriesPoints = Object.fromEntries(SERIES.map(key => [
    key,
    pointData.flatMap(point => point ? [point.points[key]] : []),
  ]));
  const seriesPaths = Object.fromEntries(SERIES.map(key => [key, createMonotonePath(seriesPoints[key])]));
  const seriesAreas = Object.fromEntries(SERIES.map(key => [key, createAreaPath(seriesPoints[key], chartBottom)]));
  const hasVisibleSeries = SERIES.some(key => visible[key]);

  const handleYearChange = event => {
    setPinnedIndex(null);
    setActiveIndex(null);
    updateYear(Number(event.target.value));
  };

  const handleMonthChange = event => {
    measure();
    const index = event.target.value === '' ? null : Number(event.target.value);
    setPinnedIndex(index);
    setActiveIndex(index);
  };

  const handlePointClick = index => {
    measure();
    const next = pinnedIndex === index ? null : index;
    setPinnedIndex(next);
    setActiveIndex(next);
  };

  const handlePointKeyDown = (event, index) => {
    let nextIndex = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = Math.min(lastAvailableIndex, index + 1);
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = Math.max(0, index - 1);
    if (nextIndex !== index) {
      event.preventDefault();
      pointButtonRefs.current[nextIndex]?.focus();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handlePointClick(index);
    } else if (event.key === 'Escape') {
      setPinnedIndex(null);
      setActiveIndex(null);
    }
  };

  const handlePointerDownCapture = event => {
    if (!event.target.closest('.trend-hit-target')) {
      setPinnedIndex(null);
      setActiveIndex(null);
    }
    if (event.target.closest('.trend-scroll-viewport')) {
      pointerStart.current = { x: event.clientX, y: event.clientY, pointerType: event.pointerType };
      dismissHint();
    }
  };

  const handlePointerUpCapture = event => {
    const start = pointerStart.current;
    if (!start) return;
    const horizontalDistance = Math.abs(event.clientX - start.x);
    const verticalDistance = Math.abs(event.clientY - start.y);
    suppressClick.current = horizontalDistance > 8 && horizontalDistance > verticalDistance;
    if (suppressClick.current && pinnedIndex === null) setActiveIndex(null);
    pointerStart.current = null;
    measureScroll();
  };

  const handlePointerCancelCapture = () => {
    pointerStart.current = null;
    suppressClick.current = false;
  };

  const handleClickCapture = event => {
    if (!suppressClick.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick.current = false;
  };

  const toggleSeries = key => setVisible(previous => ({ ...previous, [key]: !previous[key] }));

  return <section
    className="panel trend-panel"
    onPointerDownCapture={handlePointerDownCapture}
    onPointerUpCapture={handlePointerUpCapture}
    onPointerCancelCapture={handlePointerCancelCapture}
    onClickCapture={handleClickCapture}
  >
    <div className="panel-title trend-heading">
      <div>
        <h2>Evolução mensal dos chamados</h2>
        <p>Chamados abertos, resolvidos e pendentes por mês</p>
      </div>
      <span className="trend-cutoff">
        Dados até {availableMonths[availableMonths.length - 1]?.month
          ? `${availableMonths[availableMonths.length - 1].month}.`
          : '—'}
      </span>
    </div>

    <div className="trend-filters" aria-label="Filtros do gráfico">
      <label className="trend-select-group">
        <span>Ano</span>
        <select value={selectedYear ?? ''} onChange={handleYearChange} aria-label="Selecionar ano">
          {safeYears.map(year => <option key={year} value={year}>{year}</option>)}
        </select>
      </label>
      <label className="trend-select-group">
        <span>Mês</span>
        <select
          value={pinnedIndex ?? ''}
          onChange={handleMonthChange}
          aria-label={`Selecionar mês de ${yearLabel}`}
        >
          <option value="">Todos os meses</option>
          {safeTrend.map((item, index) => <option
            key={`${item.year}-${item.month}-${index}`}
            value={index}
            disabled={!item.available}
          >
            {typeof item.month === 'string' && item.month
              ? `${item.month[0].toUpperCase()}${item.month.slice(1)}.`
              : MONTHS[index]}
          </option>)}
        </select>
      </label>
    </div>

    <ChartSummary totals={totals}/>

    {availableMonths.length === 0
      ? <div className="chart-empty" role="status">Sem dados em {yearLabel}.</div>
      : <>
        <div className="trend-visual" style={{ gridTemplateColumns: `${yAxisWidth}px minmax(0, 1fr)` }}>
          <div className="trend-y-axis" aria-hidden="true">
            {[...ticks].reverse().map(tick => {
              const y = chartBottom - (tick / axisMax) * (chartBottom - chartTop);
              return <span key={tick} style={{ top: `${(y / chartHeight) * 100}%` }}>
                {formatChartNumber(tick)}
              </span>;
            })}
          </div>
          <div className="trend-chart-column">
            <div className={`trend-scroll-frame ${hasLeftOverflow ? 'has-left-overflow' : ''} ${hasRightOverflow ? 'has-right-overflow' : ''}`}>
              <div
                className="trend-scroll-viewport"
                ref={scrollRef}
                onScroll={measureScroll}
                onWheel={dismissHint}
                onTouchStart={dismissHint}
                aria-label="Gráfico mensal; deslize horizontalmente para ver os meses"
              >
                <div className="trend-scroll-content">
                  <div className="trend-plot" ref={plotRef}>
                    <svg
                      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                      preserveAspectRatio="none"
                      role="img"
                      aria-label={`Gráfico de linhas da evolução mensal dos chamados em ${yearLabel}. Linha azul representa chamados abertos, linha verde representa chamados resolvidos e linha laranja representa chamados pendentes.${futureStartX === null ? '' : ' A área sombreada identifica meses sem dados.'}`}
                    >
                      <defs>
                        <linearGradient id={`${chartId}-opened-line`} x1="0" x2="1">
                          <stop offset="0%" stopColor="#78a7ff"/><stop offset="100%" stopColor="#2563eb"/>
                        </linearGradient>
                        <linearGradient id={`${chartId}-resolved-line`} x1="0" x2="1">
                          <stop offset="0%" stopColor="#4ade80"/><stop offset="100%" stopColor="#15803d"/>
                        </linearGradient>
                        <linearGradient id={`${chartId}-pending-line`} x1="0" x2="1">
                          <stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#b45309"/>
                        </linearGradient>
                        {SERIES.map(key => <linearGradient
                          key={key}
                          id={`${chartId}-${key}-area`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor={key === 'opened' ? '#2563eb' : key === 'resolved' ? '#15803d' : '#f59e0b'} stopOpacity=".14"/>
                          <stop offset="100%" stopColor={key === 'opened' ? '#2563eb' : key === 'resolved' ? '#15803d' : '#f59e0b'} stopOpacity="0"/>
                        </linearGradient>)}
                      </defs>
                      {futureStartX !== null && <rect
                        className="trend-future-zone"
                        x={futureStartX}
                        y={chartTop}
                        width={Math.max(0, plotRight - futureStartX)}
                        height={chartBottom - chartTop}
                      />}
                      {ticks.map(tick => {
                        const y = chartBottom - (tick / axisMax) * (chartBottom - chartTop);
                        return <line
                          key={tick}
                          className="trend-gridline"
                          x1={plotLeft}
                          x2={plotRight}
                          y1={y}
                          y2={y}
                        />;
                      })}
                      {SERIES.map(key => <path
                        key={`${key}-area`}
                        d={seriesAreas[key]}
                        className={`trend-area trend-area-${key} ${visible[key] ? '' : 'is-hidden'}`}
                        style={{ fill: `url(#${chartId}-${key}-area)` }}
                      />)}
                      {SERIES.map((key, index) => <AnimatedChartLine
                        key={`${key}-line`}
                        d={seriesPaths[key]}
                        className={`trend-line trend-line-${key} ${visible[key] ? '' : 'is-hidden'}`}
                        stroke={`url(#${chartId}-${key}-line)`}
                        duration={650 + index * 45}
                        layoutVersion={chartWidth}
                      />)}
                      {selectedPoint && <line
                        className="trend-guide"
                        x1={selectedPoint.points.opened.x}
                        x2={selectedPoint.points.opened.x}
                        y1={chartTop}
                        y2={chartBottom}
                      />}
                      {futureStartX !== null && <line
                        className="trend-cutoff-line"
                        x1={futureStartX}
                        x2={futureStartX}
                        y1={chartTop}
                        y2={chartBottom}
                      />}
                      {pointData.map((point, index) => point && <g
                        key={`${point.item.year}-${point.item.month}`}
                        className="trend-point"
                        style={{ '--point-index': index }}
                      >
                        {point.zeroOverlap
                          ? <circle
                            cx={pointAt(0, index).x}
                            cy={pointAt(0, index).y}
                            r={selectedIndex === index ? 6 : 5}
                            className={`trend-point-zero ${selectedIndex === index ? 'is-selected' : ''}`}
                          />
                          : SERIES.map(key => visible[key] && <ChartMarker
                            key={`${key}-${point.item.month}`}
                            series={key}
                            point={point.points[key]}
                            selected={selectedIndex === index}
                          />)}
                        {selectedIndex === index && <circle
                          cx={pointAt(anchorValue, index).x}
                          cy={pointAt(anchorValue, index).y}
                          r="10"
                          className="trend-point-active-halo"
                        />}
                      </g>)}
                    </svg>
                    <div className="trend-hit-targets">
                      {safeTrend.map((item, index) => item.available && <button
                        key={`${item.year}-${item.month}-hit`}
                        ref={element => { pointButtonRefs.current[index] = element; }}
                        className="trend-hit-target"
                        style={{ left: `${(index / safeTrend.length) * 100}%`, width: `${100 / safeTrend.length}%` }}
                        type="button"
                        aria-label={`${item.month} ${item.year}: ${formatChartNumber(Number.isFinite(item.opened) ? item.opened : 0)} abertos, ${formatChartNumber(Number.isFinite(item.resolved) ? item.resolved : 0)} resolvidos e ${formatChartNumber(getMonthPending(item))} pendentes. Ative para fixar os detalhes.`}
                        aria-pressed={pinnedIndex === index}
                        onPointerEnter={event => {
                          if (event.pointerType !== 'touch' && !pointerStart.current && !suppressClick.current) {
                            setActiveIndex(index);
                          }
                        }}
                        onPointerLeave={event => {
                          if (event.pointerType !== 'touch' && pinnedIndex === null && !pointerStart.current) {
                            setActiveIndex(null);
                          }
                        }}
                        onFocus={() => {
                          if (pointerStart.current?.pointerType !== 'touch' && !suppressClick.current) {
                            setActiveIndex(index);
                          }
                        }}
                        onBlur={() => {
                          if (pinnedIndex === null) setActiveIndex(null);
                        }}
                        onClick={() => handlePointClick(index)}
                        onKeyDown={event => handlePointKeyDown(event, index)}
                      />)}
                    </div>
                    {selectedPoint && tooltipPosition && <ChartTooltip
                      month={selectedMonth.month}
                      year={selectedMonth.year}
                      opened={selectedPoint.actual[0]}
                      resolved={selectedPoint.actual[1]}
                      pending={selectedPoint.actual[2]}
                      {...tooltipPosition}
                    />}
                    {!hasVisibleSeries && <div className="trend-series-empty">
                      Selecione uma série na legenda para exibir os dados.
                    </div>}
                  </div>
                  <div className="month-axis">
                    {safeTrend.map((item, index) => <span
                      key={`${item.month}-${index}-label`}
                      className={`${item.available ? '' : 'future'} ${selectedIndex === index ? 'selected' : ''}`}
                    >
                      {item.month ? `${item.month}.` : `${MONTHS[index]}.`}
                    </span>)}
                  </div>
                </div>
              </div>
              {showHint && hasOverflow && <span className="trend-scroll-hint">Arraste para o lado</span>}
            </div>
          </div>
        </div>
        <ChartLegend
          visible={visible}
          onToggle={toggleSeries}
          showFuture={futureStartX !== null}
        />
        <p className="trend-footnote">* Pendentes = chamados criados no mês menos resolvidos no mesmo mês, limitado a zero.</p>
        <table className="sr-only">
          <caption>Evolução mensal dos chamados em {yearLabel}</caption>
          <thead><tr><th scope="col">Mês</th><th scope="col">Abertos</th><th scope="col">Resolvidos</th><th scope="col">Pendentes</th></tr></thead>
          <tbody>{safeTrend.map((item, index) => <tr key={`accessible-${item.month}-${index}`}>
            <th scope="row">{item.month ? `${item.month} ${item.year}` : MONTHS[index]}</th>
            <td>{item.available ? formatChartNumber(Number.isFinite(item.opened) ? item.opened : 0) : 'Sem dados'}</td>
            <td>{item.available ? formatChartNumber(Number.isFinite(item.resolved) ? item.resolved : 0) : 'Sem dados'}</td>
            <td>{item.available ? formatChartNumber(getMonthPending(item)) : 'Sem dados'}</td>
          </tr>)}</tbody>
        </table>
      </>}
  </section>;
}
