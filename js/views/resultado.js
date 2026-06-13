// Tela de resultado (gate de lead), no estilo "dossiê": saudação com o nome,
// custo em destaque e "para onde vai o investimento" (barras por ambiente). A
// quebra de custo/BDI e o escopo detalhado vão só para o PDF (.print-only).

import { esc, qs } from "../dom.js";
import { icon } from "../icons.js";
import { formatBRL, formatFaixa } from "../format.js";
import { loadInput } from "../inputStore.js";
import { loadLead } from "../leadStore.js";
import { calcular } from "../engine.js";

export function renderResultado(root, app) {
  const c = app.config;
  const input = loadInput();
  const lead = loadLead();

  // Gate: o preço só é acessível após completar o funil + contato.
  if (!input || !lead) {
    app.navigate("#/");
    return;
  }

  const r = calcular(c, input);
  const primeiroNome = (lead.nome || "").split(" ")[0];

  // "Para onde vai o investimento": agrupa porAmbiente por rótulo.
  const grupos = new Map();
  for (const l of r.porAmbiente) grupos.set(l.rotulo, (grupos.get(l.rotulo) || 0) + l.valor);
  const investidos = [...grupos.entries()].sort((a, b) => b[1] - a[1]);
  const base = r.subtotalDireto || 1;
  const investHtml = investidos
    .map(([rotulo, valor]) => {
      const pct = Math.round((valor / base) * 100);
      return `
      <div class="invest-row">
        <span class="invest-name">${esc(rotulo)}</span>
        <span class="invest-track"><span class="invest-fill" style="width:${pct}%"></span></span>
        <span class="invest-pct">${pct}%</span>
      </div>`;
    })
    .join("");

  // Cronograma (barras) e fases.
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

  // Detalhe por ambiente (PDF).
  const porAmbHtml = r.porAmbiente
    .map(
      (l) => `<li><span>${esc(l.rotulo)}${l.detalhe ? ` <span class="muted">· ${esc(l.detalhe)}</span>` : ""}</span><span class="valor">${formatBRL(l.valor)}</span></li>`
    )
    .join("");

  // Escopo de serviços por ambiente (PDF).
  const nomeServico = (id) => (c.servicos.find((s) => s.id === id) || {}).nome || id;
  const escopoHtml = (input.ambientes || [])
    .map((a) => {
      const servs = (a.servicos || []).map(nomeServico);
      return `<li><span>${esc(a.nome || "Ambiente")} <span class="muted">· ${a.area} m²</span></span><span class="muted small">${servs.length ? esc(servs.join(", ")) : "—"}</span></li>`;
    })
    .join("");

  const whatsMsg = `Olá! Sou ${lead.nome || ""}. Fiz a simulação da minha reforma (${formatFaixa(r.faixa.min, r.faixa.max)}) e gostaria de conversar.`;

  root.innerHTML = `
    <div class="stack-lg">
      <div class="row-between no-print">
        <span></span>
        <a href="#/" class="btn-secondary">${icon("arrow-left", { size: 16 })} Refazer</a>
      </div>

      <div class="result-hero no-print">
        <span class="result-ic">${icon("clipboard-check", { size: 28 })}</span>
        <h1 tabindex="-1">${primeiroNome ? `${esc(primeiroNome)}, sua estimativa está pronta` : "Sua estimativa está pronta"}</h1>
        <p class="muted">Veja o que preparamos com base nos ambientes que você configurou.</p>
      </div>

      <!-- Cabeçalho da proposta (só na impressão/PDF) -->
      <div class="proposta-head print-only">
        ${c.marca.logoUrl ? `<img class="proposta-logo" src="${esc(c.marca.logoUrl)}" alt="${esc(c.marca.nome)}" />` : ""}
        <strong>${esc(c.marca.nome || "Proposta de Reforma")}</strong>
        <span>${esc(c.marca.contato.email)} · ${esc(c.marca.contato.telefone)}</span>
        ${lead.nome ? `<span>Cliente: ${esc(lead.nome)}${lead.whatsapp ? ` · ${esc(lead.whatsapp)}` : ""}</span>` : ""}
      </div>

      <section class="card faixa">
        <span class="result-badge">${icon("check", { size: 14 })} Resultado da sua simulação</span>
        <p class="muted" style="margin:.75rem 0 0">Custo estimado da sua reforma</p>
        <p class="faixa-valor">${formatFaixa(r.faixa.min, r.faixa.max)}</p>
        <p class="faixa-meta">${(input.ambientes || []).length} ambientes · ${input.areaTotal} m² · prazo aprox. ${r.cronograma.prazoDias} dias</p>
        <div class="invest">
          <h3>Para onde vai o investimento</h3>
          ${investHtml}
        </div>
      </section>

      <section class="card no-print">
        <h2>${icon("calendar-days", { size: 18 })} Cronograma e curva de desembolso</h2>
        <p class="muted small">Quanto do investimento é desembolsado ao longo do prazo da obra (acumulado).</p>
        ${curvaSVG(r)}
        <ul class="lista">${fasesHtml}</ul>
      </section>

      <div class="dossie-cards no-print">
        <div class="dossie-card">
          <h3>${icon("monitor", { size: 18 })} Estimativa online</h3>
          <p class="muted small">O que você está vendo agora.</p>
          <ul>
            <li>${icon("check", { size: 14 })} Faixa de investimento por ambiente</li>
            <li>${icon("check", { size: 14 })} Cronograma com curva de desembolso</li>
            <li>${icon("check", { size: 14 })} ${(input.ambientes || []).length} ambientes configurados</li>
          </ul>
        </div>
        <div class="dossie-card">
          <h3>${icon("file-text", { size: 18 })} Proposta em PDF</h3>
          <p class="muted small">Documento com a marca do escritório.</p>
          <ul>
            <li>${icon("check", { size: 14 })} Detalhamento de custos e BDI</li>
            <li>${icon("check", { size: 14 })} Escopo de serviços por ambiente</li>
            <li>${icon("check", { size: 14 })} Pronto para compartilhar</li>
          </ul>
        </div>
      </div>

      <div class="cta-final no-print">
        <p>Quer transformar essa estimativa em um projeto? Fale com o arquiteto.</p>
        <div class="actions">
          ${
            c.marca.contato.whatsapp
              ? `<a class="btn-primary" target="_blank" rel="noreferrer"
                   href="https://wa.me/${esc(c.marca.contato.whatsapp)}?text=${encodeURIComponent(whatsMsg)}">${icon("message-circle", { size: 18 })} Falar com o arquiteto</a>`
              : ""
          }
          <button id="imprimir" class="btn-secondary">${icon("download", { size: 18 })} Baixar proposta (PDF)</button>
        </div>
      </div>

      <!-- Detalhamento: só no PDF / uso interno -->
      <section class="card print-only">
        <h2>Investimento por ambiente</h2>
        <ul class="lista">${porAmbHtml}</ul>
        <div class="totais">
          <div><span>Custo direto</span><span>${formatBRL(r.subtotalDireto)}</span></div>
          <div><span>BDI (${c.bdi.percentual}%)</span><span>${formatBRL(r.bdiValor)}</span></div>
          <div class="total"><span>Total estimado</span><span>${formatBRL(r.total)}</span></div>
        </div>
      </section>

      <section class="card print-only">
        <h2>Escopo de serviços por ambiente</h2>
        <ul class="lista">${escopoHtml}</ul>
      </section>

      <p class="muted small disclaimer">
        Estimativa orientativa baseada em valores médios de mercado (tabela ${esc(c.meta.versaoTabela)}).
        Não substitui orçamento executivo. Valores podem variar conforme escopo, especificações e condições da obra.
      </p>
    </div>
  `;

  qs(root, "#imprimir").addEventListener("click", () => window.print());
  // Foco no título: anuncia o resultado a leitores de tela / teclado.
  qs(root, ".result-hero h1")?.focus?.({ preventScroll: true });
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
