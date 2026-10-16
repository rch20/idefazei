export function toggleJourneyNoteStage<Stage extends string>(
  currentStage: Stage | null,
  stage: Stage,
  existingNote: string
): { stage: Stage | null; note: string } {
  if (currentStage === stage) {
    return { stage: null, note: "" };
  }

  return { stage, note: existingNote };
}
