export const NOTE_VERSION_CONFLICT = "NOTE_VERSION_CONFLICT" as const;
export const NOTE_VERSION_REQUIRED = "NOTE_VERSION_REQUIRED" as const;
export type FoundationNoteSaveResult = {
  success: true;
  reflection: string | null;
  reflectionVersion: number;
  unchanged: boolean;
};
/** O banco mantém os campos opcionais vazios como NULL, sem conteúdo inventado. */
export function normalizeFoundationNoteText(
  text: string | null | undefined
): string | null {
  if (text == null) return null;
  return text.trim() || null;
}
