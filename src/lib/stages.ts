// Construction project phases, in typical execution order. Used to guide the
// "stage" field toward a consistent vocabulary (so tasks can be grouped by
// phase) while staying backward-compatible: the stored value IS the Hebrew
// label, so any pre-existing free-text stage remains valid.

export const STAGES: string[] = [
  "הכנה ואתר",
  "עבודות עפר",
  "יסודות",
  "שלד",
  "מעטפת ואיטום",
  "מערכות",
  "גמר",
  "פיתוח חוץ",
  "מסירה",
];

// Returns the standard stages plus `current` if it is a legacy custom value,
// so a controlled <select> can still show an existing out-of-list stage.
export function stageOptions(current?: string | null): string[] {
  if (current && !STAGES.includes(current)) {
    return [current, ...STAGES];
  }
  return STAGES;
}
