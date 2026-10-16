export type CivilDateValue = string | Date | null | undefined;

export type CivilDateParts = {
  year: number;
  month: number;
  day: number;
};

export const DEFAULT_CIVIL_TIME_ZONE = "America/Sao_Paulo";

/**
 * Retorna a parte YYYY-MM-DD sem interpretar a data civil como um instante local.
 * Aniversários, escalas e datas de calendário não representam horários.
 */
export function civilDateKey(value: CivilDateValue): string | null {
  if (!value) return null;
  const raw = typeof value === "string" ? value.trim() : value.toISOString();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

export function civilDateParts(value: CivilDateValue): CivilDateParts | null {
  const key = civilDateKey(value);
  if (!key) return null;
  const [year, month, day] = key.split("-").map(Number);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

export function formatCivilDate(value: CivilDateValue, options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" }) {
  const parts = civilDateParts(value);
  if (!parts) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", options).format(new Date(parts.year, parts.month - 1, parts.day));
}

export function formatCivilDateKeyForInput(value: CivilDateValue) {
  return civilDateKey(value) ?? "";
}

/**
 * Retorna hoje no calendário da igreja. Não usa toISOString().slice(0, 10),
 * porque isso pode considerar o dia UTC e mostrar o dia anterior no Brasil.
 */
export function currentCivilDateKey(timeZone = DEFAULT_CIVIL_TIME_ZONE, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function currentCivilDateParts(timeZone = DEFAULT_CIVIL_TIME_ZONE, now = new Date()) {
  return civilDateParts(currentCivilDateKey(timeZone, now));
}
