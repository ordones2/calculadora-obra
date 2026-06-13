// Controlador da aplicação: carrega a config, faz o roteamento por hash e
// renderiza a view correspondente. Sem framework, sem build.

import { loadConfig, saveConfig, resetConfig } from "./config.js";
import { renderHome } from "./views/home.js";
import { renderResultado } from "./views/resultado.js";
import { renderAdmin } from "./views/admin.js";

const state = { config: null };

const app = {
  get config() {
    return state.config;
  },
  /** Persiste e re-renderiza (uso em import/restaurar). */
  setConfig(config) {
    state.config = config;
    saveConfig(config);
    render();
  },
  /** Persiste sem re-renderizar (uso em edições de campo, evita perder foco). */
  setConfigSilent(config) {
    state.config = config;
    saveConfig(config);
  },
  async restoreDefault() {
    state.config = await resetConfig();
    render();
  },
  navigate(hash) {
    location.hash = hash;
  },
};

function currentRoute() {
  const h = location.hash.replace(/^#\/?/, "");
  if (h.startsWith("resultado")) return "resultado";
  if (h.startsWith("admin")) return "admin";
  return "home";
}

function render() {
  const route = currentRoute();
  const root = document.getElementById("view");

  // Cabeçalho / rodapé dinâmicos
  document.getElementById("brand").textContent =
    state.config?.marca?.nome || "Calculadora de Obras";
  document.getElementById("tabela-versao").textContent =
    state.config?.meta?.versaoTabela || "";

  // Tema: aplica a cor da marca como destaque do app (e do PDF)
  const cor = state.config?.marca?.cor;
  if (cor && /^#[0-9a-fA-F]{3,8}$/.test(cor)) {
    document.documentElement.style.setProperty("--accent", cor);
  }

  // Estado ativo da navegação
  document.querySelectorAll("[data-nav]").forEach((a) => {
    a.classList.toggle("active", a.dataset.nav === route);
  });

  if (route === "resultado") renderResultado(root, app);
  else if (route === "admin") renderAdmin(root, app);
  else renderHome(root, app);

  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", render);

(async () => {
  state.config = await loadConfig();
  render();
})();
