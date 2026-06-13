// Wizard do cliente: projeto + padrão + ambientes (opcional) -> resultado.
// Fase 1: validações inline + prévia da estimativa ao vivo.

import { esc, qs, qsa } from "../dom.js";
import { formatBRL, formatFaixa } from "../format.js";
import { saveInput } from "../inputStore.js";
import { calcular } from "../engine.js";

function selectOptions(opcoes, selectedId) {
  return opcoes
    .map(
      (o) =>
        `<option value="${esc(o.id)}" ${o.id === selectedId ? "selected" : ""}>${esc(o.nome)}</option>`
    )
    .join("");
}

export function renderHome(root, app) {
  const c = app.config;
  const padraoInicial = c.padroes[1]?.id || c.padroes[0]?.id;

  root.innerHTML = `
    <div class="stack-lg">
      <div>
        <h1>Quanto vai custar sua reforma?</h1>
        <p class="muted">Responda algumas perguntas e receba uma faixa de investimento, orçamento e cronograma.</p>
      </div>

      <section class="card">
        <h2>1. Sobre o projeto</h2>
        <div class="grid-2">
          <label class="field">
            <span>Área total (m²)</span>
            <input id="areaTotal" type="number" min="1" value="80" />
            <small class="erro hidden" data-erro="areaTotal">Informe uma área maior que zero.</small>
          </label>
          <label class="field">
            <span>Tipo de reforma</span>
            <select id="tipoReformaId">${selectOptions(c.fatores.tipoReforma, c.fatores.tipoReforma[1]?.id)}</select>
          </label>
          <label class="field">
            <span>Complexidade</span>
            <select id="complexidadeId">${selectOptions(c.fatores.complexidade, c.fatores.complexidade[1]?.id)}</select>
          </label>
          <label class="field">
            <span>Condição do imóvel</span>
            <select id="condicaoImovelId">${selectOptions(c.fatores.condicaoImovel, c.fatores.condicaoImovel[1]?.id)}</select>
          </label>
          <label class="field">
            <span>Região</span>
            <select id="regiaoId">${selectOptions(c.fatores.regiao, c.fatores.regiao[0]?.id)}</select>
          </label>
        </div>
      </section>

      <section class="card">
        <h2>2. Padrão de acabamento</h2>
        <div class="grid-4" id="padroes">
          ${c.padroes
            .map(
              (p) => `
            <button type="button" class="padrao ${p.id === padraoInicial ? "selected" : ""}" data-padrao="${esc(p.id)}">
              <span class="padrao-nome">${esc(p.nome)}</span>
              <span class="padrao-valor">${formatBRL(p.valorM2)}/m²</span>
              ${p.descricao ? `<span class="padrao-desc">${esc(p.descricao)}</span>` : ""}
            </button>`
            )
            .join("")}
        </div>
      </section>

      <section class="card">
        <h2>3. Ambientes <span class="muted small">(opcional — melhora a precisão)</span></h2>
        <div class="grid-3" id="ambientes">
          ${c.ambientes
            .map(
              (a) => `
            <div class="ambiente" data-ambiente="${esc(a.id)}">
              <label class="check">
                <input type="checkbox" class="amb-check" />
                <span>${esc(a.nome)}</span>
              </label>
              <div class="amb-area hidden">
                <span class="muted small">Área</span>
                <input type="number" class="amb-input" min="1" value="10" /> <span class="muted small">m²</span>
              </div>
            </div>`
            )
            .join("")}
        </div>
      </section>

      <section class="card preview">
        <div>
          <p class="muted small">Prévia da estimativa</p>
          <p class="preview-faixa" id="preview-faixa">—</p>
          <p class="muted small" id="preview-detalhe"></p>
        </div>
        <button id="calcular" class="btn-primary">Ver estimativa completa</button>
      </section>
    </div>
  `;

  let padraoId = padraoInicial;

  function readInput() {
    const ambientes = qsa(root, ".ambiente")
      .filter((row) => qs(row, ".amb-check").checked)
      .map((row) => ({
        ambienteId: row.dataset.ambiente,
        area: Number(qs(row, ".amb-input").value) || 0,
      }));

    return {
      areaTotal: Number(qs(root, "#areaTotal").value) || 0,
      padraoId,
      tipoReformaId: qs(root, "#tipoReformaId").value,
      complexidadeId: qs(root, "#complexidadeId").value,
      condicaoImovelId: qs(root, "#condicaoImovelId").value,
      regiaoId: qs(root, "#regiaoId").value,
      ambientes: ambientes.length ? ambientes : undefined,
    };
  }

  function validar(input) {
    const erros = {};
    if (!input.areaTotal || input.areaTotal < 1) erros.areaTotal = true;
    return erros;
  }

  function atualizarPreview() {
    const input = readInput();
    const erros = validar(input);
    const faixaEl = qs(root, "#preview-faixa");
    const detalheEl = qs(root, "#preview-detalhe");

    if (Object.keys(erros).length > 0) {
      faixaEl.textContent = "—";
      detalheEl.textContent = "Preencha a área para ver a prévia.";
      return;
    }
    const r = calcular(c, input);
    faixaEl.textContent = formatFaixa(r.faixa.min, r.faixa.max);
    detalheEl.textContent = `valor central ${formatBRL(r.total)} · prazo aprox. ${r.cronograma.prazoDias} dias`;
  }

  qsa(root, ".padrao").forEach((btn) => {
    btn.addEventListener("click", () => {
      qsa(root, ".padrao").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      padraoId = btn.dataset.padrao;
      atualizarPreview();
    });
  });

  qsa(root, ".ambiente").forEach((row) => {
    const check = qs(row, ".amb-check");
    const area = qs(row, ".amb-area");
    check.addEventListener("change", () => {
      area.classList.toggle("hidden", !check.checked);
      row.classList.toggle("selected", check.checked);
      atualizarPreview();
    });
  });

  // Recalcula a prévia a cada mudança de campo.
  qsa(root, "input, select").forEach((inp) =>
    inp.addEventListener("input", atualizarPreview)
  );

  qs(root, "#areaTotal").addEventListener("input", () => {
    const erro = qs(root, '[data-erro="areaTotal"]');
    erro.classList.toggle("hidden", Number(qs(root, "#areaTotal").value) >= 1);
  });

  qs(root, "#calcular").addEventListener("click", () => {
    const input = readInput();
    const erros = validar(input);
    if (erros.areaTotal) {
      qs(root, '[data-erro="areaTotal"]').classList.remove("hidden");
      qs(root, "#areaTotal").focus();
      return;
    }
    saveInput(input);
    app.navigate("#/resultado");
  });

  atualizarPreview();
}
