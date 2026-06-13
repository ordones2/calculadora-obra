// Tela de resultado: faixa min–max, orçamento, cronograma e proposta (PDF via
// impressão do navegador).

import { esc, qs } from "../dom.js";
import { formatBRL, formatFaixa } from "../format.js";
import { loadInput } from "../inputStore.js";
import { calcular } from "../engine.js";

const NIVEL_LABEL = {
  estimativaRapida: "Estimativa rápida (por m²)",
  porAmbiente: "Detalhada por ambiente",
  detalhado: "Detalhada por itens",
};

export function renderResultado(root, app) {
  const c = app.config;
  const input = loadInput();

  if (!input) {
    root.innerHTML = `
      <div class="empty">
        <p class="muted">Nenhuma simulação encontrada.</p>
        <a href="#/" class="btn-primary">Fazer uma simulação</a>
      </div>`;
    return;
  }

  const r = calcular(c, input);
  const linhas = r.nivel === "porAmbiente" ? r.porAmbiente : r.porCategoria;
  const tituloLista = r.nivel === "porAmbiente" ? "Por ambiente" : "Por categoria";

  const linhasHtml = linhas
    .map(
      (l) => `
      <li>
        <span>${esc(l.rotulo)}${l.detalhe ? ` <span class="muted">· ${esc(l.detalhe)}</span>` : ""}</span>
        <span class="valor">${formatBRL(l.valor)}</span>
      </li>`
    )
    .join("");

  const fasesHtml = r.cronograma.fases
    .map((f) => {
      const share = r.total > 0 ? f.custo / r.total : 0;
      return `
      <li class="fase">
        <div class="fase-top">
          <span>${esc(f.nome)} <span class="muted">· dias ${f.inicioDia}–${f.fimDia}</span></span>
          <span class="valor">${formatBRL(f.custo)}</span>
        </div>
        <div class="barra"><span style="width:${(share * 100).toFixed(1)}%"></span></div>
      </li>`;
    })
    .join("");

  root.innerHTML = `
    <div class="stack-lg">
      <div class="row-between no-print">
        <h1>Sua estimativa</h1>
        <a href="#/" class="btn-secondary">← Refazer</a>
      </div>

      <!-- Cabeçalho da proposta (aparece na impressão/PDF) -->
      <div class="proposta-head print-only">
        ${c.marca.logoUrl ? `<img class="proposta-logo" src="${esc(c.marca.logoUrl)}" alt="${esc(c.marca.nome)}" />` : ""}
        <strong>${esc(c.marca.nome || "Proposta de Reforma")}</strong>
        <span>${esc(c.marca.contato.email)} · ${esc(c.marca.contato.telefone)}</span>
      </div>

      <section class="card faixa">
        <p class="muted">Faixa estimada de investimento</p>
        <p class="faixa-valor">${formatFaixa(r.faixa.min, r.faixa.max)}</p>
        <p class="muted small">${NIVEL_LABEL[r.nivel]} · valor central ${formatBRL(r.total)} · prazo aprox. ${r.cronograma.prazoDias} dias</p>
      </section>

      <section class="card">
        <h2>${tituloLista}</h2>
        <ul class="lista">${linhasHtml}</ul>
        <div class="totais">
          <div><span>Custo direto</span><span>${formatBRL(r.subtotalDireto)}</span></div>
          <div><span>BDI (${c.bdi.percentual}%)</span><span>${formatBRL(r.bdiValor)}</span></div>
          <div class="total"><span>Total estimado</span><span>${formatBRL(r.total)}</span></div>
        </div>
      </section>

      <section class="card">
        <h2>Cronograma e curva de desembolso</h2>
        <p class="muted small">Quanto do investimento é desembolsado ao longo do prazo da obra (acumulado).</p>
        ${curvaSVG(r)}
        <ul class="lista">${fasesHtml}</ul>
      </section>

      <div class="actions-end no-print">
        <button id="imprimir" class="btn-primary">Baixar proposta (PDF)</button>
        ${
          c.marca.contato.whatsapp
            ? `<a class="btn-secondary" target="_blank" rel="noreferrer"
                 href="https://wa.me/${esc(c.marca.contato.whatsapp)}?text=${encodeURIComponent(
                "Olá! Fiz uma simulação de reforma e gostaria de conversar."
              )}">Falar com o arquiteto</a>`
            : ""
        }
      </div>

      <p class="muted small disclaimer">
        Estimativa orientativa baseada em valores médios de mercado (tabela ${esc(c.meta.versaoTabela)}).
        Não substitui orçamento executivo. Valores podem variar conforme escopo, especificações e condições da obra.
      </p>
    </div>
  `;

  qs(root, "#imprimir").addEventListener("click", () => window.print());
}

// Curva "S" de desembolso acumulado (SVG inline, sem dependências).
function curvaSVG(r) {
  const W = 640, H = 260, L = 44, R = 16, T = 16, B = 44;
  const iW = W - L - R, iH = H - T - B;
  const xMax = r.cronograma.prazoDias || 1;
  const X = (d) => L + (d / xMax) * iW;
  const Y = (a) => T + iH * (1 - a);

  const pts = [{ dia: 0, ac: 0 }, ...r.curvaDesembolso.map((p) => ({ dia: p.diaFim, ac: p.acumulado }))];
  const line = pts.map((p, i) => `${i ? "L" : "M"}${X(p.dia).toFixed(1)},${Y(p.ac).toFixed(1)}`).join(" ");
  const area = `M${L},${(T + iH).toFixed(1)} ` +
    pts.map((p) => `L${X(p.dia).toFixed(1)},${Y(p.ac).toFixed(1)}`).join(" ") +
    ` L${X(xMax).toFixed(1)},${(T + iH).toFixed(1)} Z`;

  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map(
      (a) => `
      <line x1="${L}" y1="${Y(a).toFixed(1)}" x2="${W - R}" y2="${Y(a).toFixed(1)}" class="grid" />
      <text x="${L - 6}" y="${(Y(a) + 3).toFixed(1)}" class="axis" text-anchor="end">${Math.round(a * 100)}%</text>`
    )
    .join("");

  const dots = r.curvaDesembolso
    .map(
      (p) => `
      <circle cx="${X(p.diaFim).toFixed(1)}" cy="${Y(p.acumulado).toFixed(1)}" r="3.5" class="dot">
        <title>${esc(p.fase)}: ${Math.round(p.acumulado * 100)}% (dia ${p.diaFim})</title>
      </circle>`
    )
    .join("");

  return `
    <svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Curva de desembolso acumulado ao longo da obra">
      ${grid}
      <path d="${area}" class="area" />
      <path d="${line}" class="curve" />
      ${dots}
      <text x="${L}" y="${H - 14}" class="axis">dia 0</text>
      <text x="${L + iW / 2}" y="${H - 14}" class="axis" text-anchor="middle">prazo da obra →</text>
      <text x="${W - R}" y="${H - 14}" class="axis" text-anchor="end">dia ${xMax}</text>
    </svg>`;
}
