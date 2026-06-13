// Guarda a última entrada do wizard em sessionStorage para a tela de resultado
// recalcular (inclusive após refresh), sem backend.

const KEY = "calculadora-obra:input";

export function saveInput(input) {
  sessionStorage.setItem(KEY, JSON.stringify(input));
}

export function loadInput() {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
