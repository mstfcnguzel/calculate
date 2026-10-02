export function formatResult(value: number): string {
  if (value === 0) return '0';
  const magnitude = Math.abs(value);
  if (magnitude >= 1e12 || magnitude < 1e-6) {
    const rounded = Number(value.toPrecision(15));
    // Rounding near float64's maximum can overflow; preserve the finite original instead.
    return Number.isFinite(rounded) ? rounded.toString() : value.toString();
  }
  return new Intl.NumberFormat('en-US', { maximumSignificantDigits: 15 }).format(value);
}

export function presentResult(value: number) {
  const formatted = formatResult(value);
  const copyValue = formatted.replaceAll(',', '');
  return { formatted, copyValue, approximate: Number(copyValue) !== value };
}
