export function getNiceScale(maxValue, targetIntervals = 4) {
  const maximum = Number.isFinite(maxValue) ? Math.max(0, maxValue) : 0;
  const safeIntervals = Number.isFinite(targetIntervals) && targetIntervals > 0
    ? targetIntervals
    : 4;
  const roughStep = Math.max(maximum / safeIntervals, 1);
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const niceFactor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = niceFactor * magnitude;
  let axisMax = Math.max(step, Math.ceil(maximum / step) * step);

  if (axisMax <= maximum) axisMax += step;

  const ticks = Array.from({ length: Math.round(axisMax / step) + 1 }, (_, index) => index * step);
  return { axisMax, step, ticks };
}

export function createMonotonePath(points) {
  if (!Array.isArray(points) || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

  const intervals = points.slice(0, -1).map((point, index) => {
    const next = points[index + 1];
    return {
      width: next.x - point.x,
      slope: (next.y - point.y) / (next.x - point.x),
    };
  });
  const tangents = Array(points.length);
  tangents[0] = intervals[0].slope;
  tangents[points.length - 1] = intervals[intervals.length - 1].slope;

  for (let index = 1; index < points.length - 1; index += 1) {
    const before = intervals[index - 1].slope;
    const after = intervals[index].slope;
    tangents[index] = before * after <= 0 ? 0 : (before + after) / 2;
  }

  for (let index = 0; index < intervals.length; index += 1) {
    const slope = intervals[index].slope;
    if (slope === 0) {
      tangents[index] = 0;
      tangents[index + 1] = 0;
      continue;
    }

    const alpha = tangents[index] / slope;
    const beta = tangents[index + 1] / slope;
    const magnitude = alpha ** 2 + beta ** 2;
    if (magnitude > 9) {
      const factor = 3 / Math.sqrt(magnitude);
      tangents[index] = factor * alpha * slope;
      tangents[index + 1] = factor * beta * slope;
    }
  }

  return intervals.reduce((path, interval, index) => {
    const current = points[index];
    const next = points[index + 1];
    const controlWidth = interval.width / 3;
    return `${path} C ${current.x + controlWidth},${current.y + tangents[index] * controlWidth} ${next.x - controlWidth},${next.y - tangents[index + 1] * controlWidth} ${next.x},${next.y}`;
  }, `M ${points[0].x},${points[0].y}`);
}

export function createAreaPath(points, baseline) {
  const line = createMonotonePath(points);
  if (!line) return '';
  if (points.length === 1) return `${line} L ${points[0].x},${baseline} Z`;
  return `${line} L ${points[points.length - 1].x},${baseline} L ${points[0].x},${baseline} Z`;
}

export function formatChartNumber(value) {
  return Number.isFinite(value) ? value.toLocaleString('pt-BR') : '0';
}
