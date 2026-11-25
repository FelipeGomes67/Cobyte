export function urlHttpSegura(valor, base) {
  if (typeof valor !== 'string' || !valor.trim()) return '';
  try {
    const url = new URL(valor, base);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}
