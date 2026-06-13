// Gerenciamento da "tabela de preços" (config) sem backend:
// - seed oficial vem de data/config.default.json (versionado no git)
// - edições do arquiteto ficam em localStorage (não destroem o seed)
// - exportar/importar JSON permite "publicar" uma nova tabela

const STORAGE_KEY = "calculadora-obra:config";
let seedCache = null;

/** Carrega o seed (cacheado) e devolve uma cópia. */
export async function loadSeed() {
  if (!seedCache) {
    const res = await fetch("./data/config.default.json");
    seedCache = await res.json();
  }
  return structuredClone(seedCache);
}

/** Config ativa: localStorage se existir, senão o seed. */
export async function loadConfig() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      /* cai para o seed */
    }
  }
  return loadSeed();
}

/** Persiste a config editada no localStorage. */
export function saveConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/** Remove a edição local e volta ao seed. */
export async function resetConfig() {
  localStorage.removeItem(STORAGE_KEY);
  return loadSeed();
}

/** Dispara o download do JSON da config (para commitar como novo seed). */
export function exportConfig(config) {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `config.${(config.meta && config.meta.versaoTabela) || "tabela"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Faz o parse de um arquivo JSON importado (validação mínima). */
export async function importConfig(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!parsed.padroes || !parsed.fatores || !parsed.cronograma) {
    throw new Error("Arquivo de configuração inválido.");
  }
  return parsed;
}
