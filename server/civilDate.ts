/**
 * Datas de evento são datas civis, não instantes. Persistimos em meio-dia UTC
 * para evitar que a conversão automática para o fuso do navegador mude o dia.
 */
export function parseCivilDateAsUtcNoon(value: string | null | undefined): Date | null {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return null;
  return date;
}

export function formatCivilDateInput(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function normalizeCivilTime(value: string | null | undefined): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(text) ? text : null;
}

export function currentCivilDateAsUtcNoon(timeZone = "America/Sao_Paulo", now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return parseCivilDateAsUtcNoon(`${values.year}-${values.month}-${values.day}`) ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12));
}
