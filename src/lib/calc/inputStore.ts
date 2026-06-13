// Guarda a última entrada do wizard em sessionStorage para a tela de resultado
// poder recalcular (inclusive após refresh), sem precisar de backend.

import type { CalcInput } from "../../types/calc";

const KEY = "calculadora-obra:input";

export function saveInput(input: CalcInput): void {
  sessionStorage.setItem(KEY, JSON.stringify(input));
}

export function loadInput(): CalcInput | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CalcInput;
  } catch {
    return null;
  }
}
