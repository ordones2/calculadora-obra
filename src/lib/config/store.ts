// Gerenciamento da Config sem backend:
// - seed oficial vem de src/data/config.default.json (versionado no git)
// - edições do arquiteto ficam em localStorage (não destroem o seed)
// - exportar/importar JSON permite "publicar" uma nova tabela (commitar o arquivo)

import defaultConfig from "../../data/config.default.json";
import type { Config } from "../../types/config";

const STORAGE_KEY = "calculadora-obra:config";

/** Seed imutável (cópia profunda para evitar mutação acidental). */
export function getSeedConfig(): Config {
  return structuredClone(defaultConfig) as Config;
}

/** Config ativa: localStorage se existir, senão o seed. */
export function loadConfig(): Config {
  if (typeof localStorage === "undefined") return getSeedConfig();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return getSeedConfig();
  try {
    return JSON.parse(raw) as Config;
  } catch {
    return getSeedConfig();
  }
}

/** Persiste a config editada no localStorage. */
export function saveConfig(config: Config): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/** Remove a edição local e volta ao seed. */
export function resetConfig(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/** Dispara o download do JSON da config (para commitar como novo seed). */
export function exportConfig(config: Config): void {
  const blob = new Blob([JSON.stringify(config, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `config.${config.meta.versaoTabela || "tabela"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Faz o parse de um arquivo JSON importado (validação mínima). */
export async function importConfig(file: File): Promise<Config> {
  const text = await file.text();
  const parsed = JSON.parse(text) as Config;
  if (!parsed.padroes || !parsed.fatores || !parsed.cronograma) {
    throw new Error("Arquivo de configuração inválido.");
  }
  return parsed;
}
