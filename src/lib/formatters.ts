/**
 * Format a number as Chilean Pesos (CLP): $1.234.567
 */
export function formatCLP(n: number | unknown): string {
  const num = typeof n === "number" ? n : Number(n);
  if (isNaN(num)) return "$0";
  return "$" + Math.round(num).toLocaleString("es-CL");
}

/**
 * Format an ISO date string as DD/MM/YYYY
 */
export function formatDate(date: string): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format a Chilean RUT: 12345678-9 → 12.345.678-9
 */
export function formatRUT(rut: string): string {
  if (!rut) return "";
  // Remove dots and spaces, keep hyphen
  const clean = rut.replace(/\./g, "").replace(/\s/g, "").trim();

  // Split body and check digit
  const hyphenIdx = clean.lastIndexOf("-");
  if (hyphenIdx === -1) {
    // No check digit separator — try to format body only
    const body = clean;
    return body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  const body = clean.slice(0, hyphenIdx);
  const dv = clean.slice(hyphenIdx + 1);

  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${formattedBody}-${dv}`;
}

/**
 * Format a number as percentage: 0.1127 → "11.27%" or 11.27 → "11.27%"
 */
export function formatPercent(n: number): string {
  // If the value is between -1 and 1 (exclusive), treat it as a decimal ratio
  const value = Math.abs(n) < 1 ? n * 100 : n;
  return `${value.toFixed(2)}%`;
}
