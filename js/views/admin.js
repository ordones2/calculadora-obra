// Painel do arquiteto (CMS, sem banco): edita a tabela de preços ativa
// (persistida em localStorage) e permite exportar/importar/restaurar.

import { esc, qs } from "../dom.js";
import { formatBRL } from "../format.js";
import { exportConfig, importConfig } from "../config.js";

export function renderAdmin(root, app) {
  const c = app.config;

  root.innerHTML = `
    <div class="stack-lg">
      <div>
        <h1>Painel de configuração</h1>
        <p class="muted">Ajuste os valores-base usados na calculadora. As alterações ficam salvas neste navegador. Exporte o JSON para publicar como nova tabela oficial.</p>
      </div>

      <div id="msg" class="msg hidden"></div>

      <div class="actions">
        <button id="exportar" class="btn-primary">Exportar JSON</button>
        <button id="importar" class="btn-secondary">Importar JSON</button>
        <input id="file" type="file" accept="application/json" class="hidden" />
        <button id="restaurar" class="btn-secondary">Restaurar padrão</button>
      </div>

      <section class="card">
        <h2>Marca (usada na proposta em PDF)</h2>
        <div class="grid-2">
          <label class="field"><span>Nome do escritório</span><input data-marca="nome" value="${esc(c.marca.nome)}" /></label>
          <label class="field"><span>E-mail</span><input data-contato="email" value="${esc(c.marca.contato.email)}" /></label>
          <label class="field"><span>Telefone</span><input data-contato="telefone" value="${esc(c.marca.contato.telefone)}" /></label>
          <label class="field"><span>WhatsApp (só dígitos)</span><input data-contato="whatsapp" value="${esc(c.marca.contato.whatsapp)}" /></label>
          <label class="field"><span>Logo (URL da imagem)</span><input data-marca="logoUrl" value="${esc(c.marca.logoUrl)}" placeholder="https://..." /></label>
          <label class="field"><span>Cor da marca</span><input id="marca-cor" type="color" value="${esc(c.marca.cor || "#b08d57")}" /></label>
        </div>
      </section>

      <section class="card">
        <h2>Padrões de acabamento (R$/m²)</h2>
        <div class="stack">
          ${c.padroes
            .map(
              (p, i) => `
            <div class="linha-padrao">
              <span class="nome">${esc(p.nome)}</span>
              <input type="number" data-padrao-idx="${i}" value="${p.valorM2}" />
              <span class="muted preview" data-preview="${i}">${formatBRL(p.valorM2)}/m²</span>
            </div>`
            )
            .join("")}
        </div>
      </section>

      <section class="card">
        <h2>BDI / margem (%)</h2>
        <input type="number" id="bdi" value="${c.bdi.percentual}" class="w-sm" />
      </section>

      <details class="card">
        <summary>Editor avançado (JSON completo: ambientes, serviços, fatores, cronograma)</summary>
        <textarea id="json" class="json" spellcheck="false">${esc(JSON.stringify(c, null, 2))}</textarea>
        <button id="aplicarJson" class="btn-primary">Aplicar JSON</button>
      </details>
    </div>
  `;

  const msg = qs(root, "#msg");
  const showMsg = (text) => {
    msg.textContent = text;
    msg.classList.remove("hidden");
  };

  // Edições de campo: persistem sem re-render (preserva o foco).
  root.querySelectorAll("[data-marca]").forEach((inp) => {
    inp.addEventListener("input", () => {
      const next = structuredClone(app.config);
      next.marca[inp.dataset.marca] = inp.value;
      app.setConfigSilent(next);
    });
  });
  root.querySelectorAll("[data-contato]").forEach((inp) => {
    inp.addEventListener("input", () => {
      const next = structuredClone(app.config);
      next.marca.contato[inp.dataset.contato] = inp.value;
      app.setConfigSilent(next);
    });
  });
  root.querySelectorAll("[data-padrao-idx]").forEach((inp) => {
    inp.addEventListener("input", () => {
      const idx = Number(inp.dataset.padraoIdx);
      const next = structuredClone(app.config);
      next.padroes[idx].valorM2 = Number(inp.value) || 0;
      app.setConfigSilent(next);
      qs(root, `[data-preview="${idx}"]`).textContent = `${formatBRL(next.padroes[idx].valorM2)}/m²`;
    });
  });
  qs(root, "#bdi").addEventListener("input", (e) => {
    const next = structuredClone(app.config);
    next.bdi.percentual = Number(e.target.value) || 0;
    app.setConfigSilent(next);
  });
  qs(root, "#marca-cor").addEventListener("input", (e) => {
    const next = structuredClone(app.config);
    next.marca.cor = e.target.value;
    app.setConfigSilent(next);
    // prévia de tema ao vivo
    document.documentElement.style.setProperty("--accent", e.target.value);
  });

  // Ações
  qs(root, "#exportar").addEventListener("click", () => exportConfig(app.config));
  qs(root, "#importar").addEventListener("click", () => qs(root, "#file").click());
  qs(root, "#file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      app.setConfig(await importConfig(file));
    } catch (err) {
      showMsg(err.message || "Falha ao importar.");
    }
  });
  qs(root, "#restaurar").addEventListener("click", () => app.restoreDefault());
  qs(root, "#aplicarJson").addEventListener("click", () => {
    try {
      app.setConfig(JSON.parse(qs(root, "#json").value));
    } catch {
      showMsg("JSON inválido.");
    }
  });
}
