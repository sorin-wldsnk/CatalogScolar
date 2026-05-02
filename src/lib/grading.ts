export function getGradingScale(gradeLevel: number): "QUALITATIVE" | "NUMERIC" {
  if (gradeLevel >= 0 && gradeLevel <= 4) return "QUALITATIVE";
  if (gradeLevel >= 5 && gradeLevel <= 12) return "NUMERIC";
  return "NUMERIC";
}

export function validateGrade(
  value: number | string,
  scale: "QUALITATIVE" | "NUMERIC"
): boolean {
  if (scale === "QUALITATIVE") {
    return ["I", "S", "B", "FB"].includes(value as string);
  }
  const num = Number(value);
  return !isNaN(num) && num >= 1 && num <= 10;
}

export function computeAverage(
  grades: Array<{ valueNumeric: string | null; gradeType: string; weight: string }>
): number | null {
  const relevant = grades.filter(
    (g) => g.valueNumeric !== null && g.gradeType !== "THESIS"
  );
  const thesis = grades.filter((g) => g.valueNumeric !== null && g.gradeType === "THESIS");

  if (relevant.length === 0 && thesis.length === 0) return null;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const g of relevant) {
    const w = Number(g.weight);
    weightedSum += Number(g.valueNumeric) * w;
    totalWeight += w;
  }

  if (thesis.length > 0) {
    const thesisAvg =
      thesis.reduce((s, g) => s + Number(g.valueNumeric), 0) / thesis.length;
    weightedSum += thesisAvg * 2;
    totalWeight += 2;
  }

  if (totalWeight === 0) return null;
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

export const GRADE_TYPE_LABELS: Record<string, string> = {
  REGULAR: "Curentă",
  THESIS: "Teză",
  ORAL: "Orală",
  PRACTICAL: "Practică",
};
