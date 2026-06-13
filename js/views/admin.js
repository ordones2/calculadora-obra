// Painel do arquiteto (CMS, sem banco): edita a tabela de preços ativa
// (persistida em localStorage) e permite exportar/importar/restaurar.
// Fase 2: edição estruturada de ambientes e serviços (sem editar JSON cru).

import { esc, qs } from "../dom.js";
import { formatBRL } from "../format.js";
import { exportConfig, importConfig } from "../config.js";

const UNIDADES = ["m2", "m", "ponto", "un", "vb"];

function unidadeOptions(sel) {
  return UNIDADES.map(
    (u) => `<option value="${u}" ${u === sel ? "selected" : ""}>${u}</option>`
  ).join("");
}

function ambientesSection(c) {
  const cols = c.padroes.map((p) => `<th>${esc(p.nome)}</th>`).join("");
  const linhas = c.ambientes
    .map((a, i) => {
      const precos = c.padroes
        .map(
          (p) =>
            `<td><input type="number" data-amb-idx="${i}" data-padrao-id="${esc(p.id)}" value="${a.valorM2PorPadrao[p.id] ?? 0}" /></td>`
        )
        .join("");
      return `
        <tr>
          <td><input data-amb-idx="${i}" data-amb-field="nome" value="${esc(a.nome)}" /></td>
          ${precos}
          <td><button class="btn-link" data-amb-remove="${i}" title="Remover">✕</button></td>
        </tr>`;
    })
    .join("");

  return `
    <section class="card">
      <h2>Ambientes (R$/m² por padrão)</h2>
      <div class="tabela-wrap">
        <table class="tabela">
          <thead><tr><th>Ambiente</th>${cols}<th></th></tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
      <button id="add-ambiente" class="btn-secondary">+ Adicionar ambiente</button>
    </section>`;
}

function servicosSection(c) {
  const linhas = c.servicos
    .map(
      (s, i) => `
      <tr>
        <td><input data-serv-idx="${i}" data-serv-field="nome" value="${esc(s.nome)}" /></td>
        <td><input data-serv-idx="${i}" data-serv-field="categoria" value="${esc(s.categoria)}" /></td>
        <td><select data-serv-idx="${i}" data-serv-field="unidade">${unidadeOptions(s.unidade)}</select></td>
        <td><input type="number" data-serv-idx="${i}" data-serv-field="valorUnitario" value="${s.valorUnitario}" /></td>
        <td><button class="btn-link" data-serv-remove="${i}" title="Remover">✕</button></td>
      </tr>`
    )
    .join("");

  return `
    <section class="card">
      <h2>Serviços / composições</h2>
      <p class="muted small">Preço unitário base. Preços por padrão de acabamento (opcional) seguem no editor avançado.</p>
      <div class="tabela-wrap">
        <table class="tabela">
          <thead><tr><th>Serviço</th><th>Categoria</th><th>Unid.</th><th>Valor unit.</th><th></th></tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
      <button id="add-servico" class="btn-secondary">+ Adicionar serviço</button>
    </section>`;
}

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

      ${ambientesSection(c)}
      ${servicosSection(c)}

      <section class="card">
        <h2>BDI / margem (%)</h2>
        <input type="number" id="bdi" value="${c.bdi.percentual}" class="w-sm" />
      </section>

      <details class="card">
        <summary>Editor avançado (JSON completo: fatores, cronograma, preços por padrão)</summary>
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

  // --- Edições de campo: persistem sem re-render (preservam o foco). ---
  const editSilent = (mutate) => {
    const next = structuredClone(app.config);
    mutate(next);
    app.setConfigSilent(next);
  };

  root.querySelectorAll("[data-marca]").forEach((inp) =>
    inp.addEventListener("input", () =>
      editSilent((n) => (n.marca[inp.dataset.marca] = inp.value))
    )
  );
  root.querySelectorAll("[data-contato]").forEach((inp) =>
    inp.addEventListener("input", () =>
      editSilent((n) => (n.marca.contato[inp.dataset.contato] = inp.value))
    )
  );
  root.querySelectorAll("[data-padrao-idx]").forEach((inp) =>
    inp.addEventListener("input", () => {
      const idx = Number(inp.dataset.padraoIdx);
      editSilent((n) => (n.padroes[idx].valorM2 = Number(inp.value) || 0));
      qs(root, `[data-preview="${idx}"]`).textContent = `${formatBRL(Number(inp.value) || 0)}/m²`;
    })
  );

  // Ambientes (nome e preço por padrão)
  root.querySelectorAll("[data-amb-idx]").forEach((inp) =>
    inp.addEventListener("input", () => {
      const idx = Number(inp.dataset.ambIdx);
      editSilent((n) => {
        if (inp.dataset.ambField === "nome") n.ambientes[idx].nome = inp.value;
        else if (inp.dataset.padraoId)
          n.ambientes[idx].valorM2PorPadrao[inp.dataset.padraoId] = Number(inp.value) || 0;
      });
    })
  );

  // Serviços
  root.querySelectorAll("[data-serv-idx]").forEach((inp) =>
    inp.addEventListener("input", () => {
      const idx = Number(inp.dataset.servIdx);
      const field = inp.dataset.servField;
      editSilent((n) => {
        n.servicos[idx][field] = field === "valorUnitario" ? Number(inp.value) || 0 : inp.value;
      });
    })
  );

  qs(root, "#bdi").addEventListener("input", (e) =>
    editSilent((n) => (n.bdi.percentual = Number(e.target.value) || 0))
  );
  qs(root, "#marca-cor").addEventListener("input", (e) => {
    editSilent((n) => (n.marca.cor = e.target.value));
    document.documentElement.style.setProperty("--accent", e.target.value);
  });

  // --- Add/remove: re-renderizam. ---
  qs(root, "#add-ambiente").addEventListener("click", () => {
    const next = structuredClone(app.config);
    const valorM2PorPadrao = {};
    next.padroes.forEach((p) => (valorM2PorPadrao[p.id] = 0));
    next.ambientes.push({
      id: `amb-${Date.now()}`,
      nome: "Novo ambiente",
      valorM2PorPadrao,
      servicosSugeridos: [],
    });
    app.setConfig(next);
  });
  root.querySelectorAll("[data-amb-remove]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const next = structuredClone(app.config);
      next.ambientes.splice(Number(btn.dataset.ambRemove), 1);
      app.setConfig(next);
    })
  );
  qs(root, "#add-servico").addEventListener("click", () => {
    const next = structuredClone(app.config);
    next.servicos.push({
      id: `serv-${Date.now()}`,
      nome: "Novo serviço",
      categoria: "Geral",
      unidade: "un",
      valorUnitario: 0,
    });
    app.setConfig(next);
  });
  root.querySelectorAll("[data-serv-remove]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const next = structuredClone(app.config);
      next.servicos.splice(Number(btn.dataset.servRemove), 1);
      app.setConfig(next);
    })
  );

  // --- Ações de tabela inteira. ---
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
