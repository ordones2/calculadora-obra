import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Config } from "../types/config";
import { loadConfig, resetConfig, saveConfig } from "../lib/config/store";

interface ConfigContextValue {
  config: Config;
  /** Atualiza a config ativa e persiste no localStorage. */
  updateConfig: (next: Config) => void;
  /** Volta ao seed (config.default.json). */
  restoreDefault: () => void;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Config>(() => loadConfig());

  const value = useMemo<ConfigContextValue>(
    () => ({
      config,
      updateConfig: (next) => {
        saveConfig(next);
        setConfig(next);
      },
      restoreDefault: () => {
        resetConfig();
        setConfig(loadConfig());
      },
    }),
    [config]
  );

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig deve ser usado dentro de <ConfigProvider>");
  return ctx;
}
