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
    .map(
      (f) => `
      <li>
        <span>${esc(f.nome)} <span class="muted">· dias ${f.inicioDia}–${f.fimDia}</span></span>
        <span class="valor">${formatBRL(f.custo)}</span>
      </li>`
    )
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

      <div class="grid-2">
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
          <h2>Cronograma e desembolso</h2>
          <ul class="lista">${fasesHtml}</ul>
        </section>
      </div>

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
