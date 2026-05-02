const CEDILLA_TO_COMMA: Record<string, string> = {
  "ş": "ș", // ş → ș
  "Ş": "Ș", // Ş → Ș
  "ţ": "ț", // ţ → ț
  "Ţ": "Ț", // Ţ → Ț
};

export function normalizeDiacritics(input: string): string {
  return input.replace(/[şŞţŢ]/g, (ch) => CEDILLA_TO_COMMA[ch] ?? ch);
}
