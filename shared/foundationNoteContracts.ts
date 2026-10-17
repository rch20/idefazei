import { z } from "zod";
import {
  NOTE_VERSION_CONFLICT,
  NOTE_VERSION_REQUIRED,
} from "./foundationNoteValues";
export * from "./foundationNoteValues";

export const foundationNoteVersionSchema = z
  .number()
  .int()
  .nonnegative()
  .refine(
    Number.isSafeInteger,
    "A versão da anotação deve ser um inteiro seguro."
  );

export function isValidFoundationNoteVersion(value: unknown): value is number {
  return foundationNoteVersionSchema.safeParse(value).success;
}

export function assertFoundationNoteVersion(value: unknown): number {
  if (value === undefined || value === null) {
    throw new FoundationNoteVersionRequiredError();
  }
  const parsed = foundationNoteVersionSchema.safeParse(value);
  if (!parsed.success) throw new FoundationNoteVersionInvalidError();
  return parsed.data;
}

export class FoundationNoteVersionConflictError extends Error {
  readonly code = NOTE_VERSION_CONFLICT;

  constructor() {
    super(NOTE_VERSION_CONFLICT);
    this.name = "FoundationNoteVersionConflictError";
  }
}

export class FoundationNoteVersionRequiredError extends Error {
  readonly code = NOTE_VERSION_REQUIRED;

  constructor() {
    super(NOTE_VERSION_REQUIRED);
    this.name = "FoundationNoteVersionRequiredError";
  }
}

export class FoundationNoteVersionInvalidError extends Error {
  constructor() {
    super("Invalid foundation note version");
    this.name = "FoundationNoteVersionInvalidError";
  }
}
