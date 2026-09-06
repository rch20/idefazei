export type CivilDateValue = string | Date | null | undefined;

/**
 * Retorna a parte YYYY-MM-DD sem interpretar a data civil como um instante local.
 * Escalas e aniversários representam dias do calendário, não horários.
 */
export function civilDateKey(value: CivilDateValue): string | null {
  if (!value) return null;
  const raw = typeof value === "string" ? value.trim() : value.toISOString();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

export function formatCivilDate(value: CivilDateValue, options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" }) {
  const key = civilDateKey(value);
  if (!key) return "Data não informada";
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", options).format(new Date(year, month - 1, day));
}

export function formatCivilDateKeyForInput(value: CivilDateValue) {
  return civilDateKey(value) ?? "";
}
