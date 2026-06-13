// Wizard do cliente — faseado e levemente gamificado, pensado como isca de leads.
// Uma pergunta por etapa, barra de progresso, cards selecionáveis e auto-avanço.
// O PREÇO NÃO aparece aqui: ele só é revelado no /resultado, após o contato (gate).

import { esc, qs, qsa } from "../dom.js";
import { icon } from "../icons.js";
import { saveInput } from "../inputStore.js";
import { saveLead } from "../leadStore.js";

const ICONE_TIPO = { cosmetica: "wand-2", parcial: "layers", completa: "hammer" };

export function renderHome(root, app) {
  const c = app.config;

  // Estado acumulado do funil.
  const respostas = {
    tipoReformaId: null,
    areaTotal: 80,
    padraoId: null,
    ambientes: [], // { ambienteId, area }
    complexidadeId: c.fatores.complexidade[1]?.id || c.fatores.complexidade[0]?.id,
    condicaoImovelId: c.fatores.condicaoImovel[1]?.id || c.fatores.condicaoImovel[0]?.id,
    regiaoId: c.fatores.regiao[0]?.id,
    itens: [], // { servicoId, quantidade }
    lead: { nome: "", whatsapp: "", email: "" },
  };

  let idx = 0;

  // ---------- helpers de render ----------
  function cardsUnicos(field, opcoes, iconeDe) {
    return `<div class="option-cards">
      ${opcoes
        .map(
          (o) => `
        <button type="button" class="option-card ${respostas[field] === o.id ? "selected" : ""}" data-value="${esc(o.id)}">
          <span class="oc-icon">${icon(iconeDe(o), { size: 26 })}</span>
          <span class="oc-text">
            <span class="oc-title">${esc(o.nome)}</span>
            ${o.descricao ? `<span class="oc-desc">${esc(o.descricao)}</span>` : ""}
          </span>
          <span class="oc-check">${icon("check", { size: 18 })}</span>
        </button>`
        )
        .join("")}
    </div>`;
  }

  function selectField(field, label, opcoes) {
    return `<label class="field">
      <span>${esc(label)}</span>
      <select data-field="${field}">
        ${opcoes
          .map(
            (o) =>
              `<option value="${esc(o.id)}" ${respostas[field] === o.id ? "selected" : ""}>${esc(o.nome)}</option>`
          )
          .join("")}
      </select>
    </label>`;
  }

  // ---------- definição dos passos ----------
  const steps = [
    {
      hero: true,
      icon: "sparkles",
      avancar: "Começar agora",
      body: () => `
        <div class="hero">
          <p class="hero-eyebrow">Calculadora de reforma</p>
          <h1 class="hero-title">Descubra quanto vai custar a sua reforma</h1>
          <p class="muted hero-sub">Responda algumas perguntas rápidas (leva ~2 minutos) e receba uma faixa de investimento, prazo estimado e uma proposta para conversar com o arquiteto.</p>
          <ul class="hero-list">
            <li>${icon("trending-up", { size: 18 })} Faixa de investimento realista</li>
            <li>${icon("calendar-days", { size: 18 })} Prazo e curva de desembolso</li>
            <li>${icon("download", { size: 18 })} Proposta em PDF</li>
          </ul>
        </div>`,
    },
    {
      icon: "hammer",
      titulo: "Que tipo de reforma você quer fazer?",
      auto: "tipoReformaId",
      body: () => cardsUnicos("tipoReformaId", c.fatores.tipoReforma, (o) => ICONE_TIPO[o.id] || "hammer"),
      validate: () => (respostas.tipoReformaId ? null : "Escolha uma opção para continuar."),
    },
    {
      icon: "ruler",
      titulo: "Qual a área total do imóvel?",
      subtitulo: "Em metros quadrados (m²). Se não souber exato, estime.",
      body: () => `
        <div class="area-wrap">
          <div class="area-input">
            <input id="areaTotal" type="number" min="1" inputmode="numeric" value="${esc(respostas.areaTotal)}" />
            <span class="area-unit">m²</span>
          </div>
          <div class="chips">
            ${[40, 60, 80, 120, 180, 250].map((a) => `<button type="button" class="chip" data-area="${a}">${a} m²</button>`).join("")}
          </div>
        </div>`,
      wire: () => {
        qsa(root, ".chip").forEach((ch) =>
          ch.addEventListener("click", () => {
            qs(root, "#areaTotal").value = ch.dataset.area;
          })
        );
      },
      commit: () => {
        respostas.areaTotal = Number(qs(root, "#areaTotal").value) || 0;
      },
      validate: () => (respostas.areaTotal >= 1 ? null : "Informe uma área maior que zero."),
    },
    {
      icon: "gem",
      titulo: "Qual padrão de acabamento você imagina?",
      subtitulo: "Isso define a qualidade dos materiais e do acabamento.",
      auto: "padraoId",
      body: () => cardsUnicos("padraoId", c.padroes, () => "gem"),
      validate: () => (respostas.padraoId ? null : "Escolha um padrão para continuar."),
    },
    {
      icon: "door-open",
      titulo: "Quais ambientes entram na reforma?",
      subtitulo: "Selecione os ambientes e informe a área de cada um. (Opcional, mas deixa a estimativa mais precisa.)",
      body: () => `
        <div class="amb-cards">
          ${c.ambientes
            .map((a) => {
              const sel = respostas.ambientes.find((x) => x.ambienteId === a.id);
              return `
              <div class="amb-card ${sel ? "selected" : ""}" data-ambiente="${esc(a.id)}">
                <button type="button" class="amb-toggle">
                  <span class="oc-icon">${icon("door-open", { size: 22 })}</span>
                  <span class="oc-title">${esc(a.nome)}</span>
                  <span class="oc-check">${icon("check", { size: 16 })}</span>
                </button>
                <div class="amb-area ${sel ? "" : "hidden"}">
                  <span class="muted small">Área</span>
                  <input type="number" class="amb-input" min="1" value="${sel ? esc(sel.area) : 10}" />
                  <span class="muted small">m²</span>
                </div>
              </div>`;
            })
            .join("")}
        </div>`,
      wire: () => {
        qsa(root, ".amb-card").forEach((card) => {
          const area = qs(card, ".amb-area");
          qs(card, ".amb-toggle").addEventListener("click", () => {
            const on = card.classList.toggle("selected");
            area.classList.toggle("hidden", !on);
          });
        });
      },
      commit: () => {
        respostas.ambientes = qsa(root, ".amb-card")
          .filter((card) => card.classList.contains("selected"))
          .map((card) => ({
            ambienteId: card.dataset.ambiente,
            area: Number(qs(card, ".amb-input").value) || 0,
          }));
      },
    },
    {
      icon: "building-2",
      titulo: "Conte um pouco sobre o imóvel",
      subtitulo: "Esses detalhes ajustam a estimativa à sua realidade.",
      body: () => `
        <div class="grid-2">
          ${selectField("condicaoImovelId", "Condição do imóvel", c.fatores.condicaoImovel)}
          ${selectField("complexidadeId", "Complexidade da obra", c.fatores.complexidade)}
          ${selectField("regiaoId", "Região", c.fatores.regiao)}
        </div>`,
      commit: () => {
        qsa(root, "[data-field]").forEach((sel) => {
          respostas[sel.dataset.field] = sel.value;
        });
      },
    },
    {
      icon: "list-checks",
      titulo: "Quer detalhar por serviço?",
      subtitulo: "Etapa avançada e opcional. Selecione serviços e quantidades para uma estimativa mais precisa — ou pule.",
      canSkip: true,
      body: () => `
        <div class="amb-cards">
          ${c.servicos
            .map((s) => {
              const sel = respostas.itens.find((x) => x.servicoId === s.id);
              return `
              <div class="amb-card ${sel ? "selected" : ""}" data-servico="${esc(s.id)}">
                <button type="button" class="amb-toggle">
                  <span class="oc-icon">${icon("list-checks", { size: 20 })}</span>
                  <span class="oc-title">${esc(s.nome)}</span>
                  <span class="oc-check">${icon("check", { size: 16 })}</span>
                </button>
                <div class="amb-area ${sel ? "" : "hidden"}">
                  <span class="muted small">Qtd</span>
                  <input type="number" class="serv-input" min="0" value="${sel ? esc(sel.quantidade) : 1}" />
                  <span class="muted small">${esc(s.unidade)}</span>
                </div>
              </div>`;
            })
            .join("")}
        </div>`,
      wire: () => {
        qsa(root, ".amb-card").forEach((card) => {
          const area = qs(card, ".amb-area");
          qs(card, ".amb-toggle").addEventListener("click", () => {
            const on = card.classList.toggle("selected");
            area.classList.toggle("hidden", !on);
          });
        });
      },
      commit: () => {
        respostas.itens = qsa(root, ".amb-card")
          .filter((card) => card.classList.contains("selected"))
          .map((card) => ({
            servicoId: card.dataset.servico,
            quantidade: Number(qs(card, ".serv-input").value) || 0,
          }))
          .filter((it) => it.quantidade > 0);
      },
    },
    {
      icon: "user-round",
      titulo: "Falta só 1 passo para ver sua estimativa 🎉",
      subtitulo: "Deixe seu contato para receber a estimativa e a proposta.",
      avancar: "Ver minha estimativa",
      body: () => `
        <div class="form-contato">
          <label class="field">
            <span>${icon("user-round", { size: 16 })} Seu nome</span>
            <input id="lead-nome" value="${esc(respostas.lead.nome)}" placeholder="Como podemos te chamar?" />
          </label>
          <label class="field">
            <span>${icon("phone", { size: 16 })} WhatsApp</span>
            <input id="lead-whatsapp" inputmode="tel" value="${esc(respostas.lead.whatsapp)}" placeholder="(11) 90000-0000" />
          </label>
          <label class="field">
            <span>${icon("mail", { size: 16 })} E-mail <span class="muted small">(opcional)</span></span>
            <input id="lead-email" type="email" value="${esc(respostas.lead.email)}" placeholder="voce@email.com" />
          </label>
          <p class="muted small">Usamos seus dados apenas para enviar a estimativa e entrar em contato sobre o seu projeto.</p>
        </div>`,
      commit: () => {
        respostas.lead = {
          nome: qs(root, "#lead-nome").value.trim(),
          whatsapp: qs(root, "#lead-whatsapp").value.trim(),
          email: qs(root, "#lead-email").value.trim(),
        };
      },
      validate: () => {
        if (!respostas.lead.nome) return "Informe seu nome.";
        if (!respostas.lead.whatsapp) return "Informe um WhatsApp para contato.";
        return null;
      },
    },
  ];

  const totalCount = steps.length - 1; // exclui o hero da contagem

  // ---------- navegação ----------
  function buildInput() {
    return {
      areaTotal: Number(respostas.areaTotal) || 0,
      padraoId: respostas.padraoId,
      tipoReformaId: respostas.tipoReformaId,
      complexidadeId: respostas.complexidadeId,
      condicaoImovelId: respostas.condicaoImovelId,
      regiaoId: respostas.regiaoId,
      ambientes: respostas.ambientes.length ? respostas.ambientes : undefined,
      itens: respostas.itens.length ? respostas.itens : undefined,
    };
  }

  function finish() {
    saveInput(buildInput());
    saveLead(respostas.lead);
    app.navigate("#/resultado");
  }

  function avancar(skip) {
    const step = steps[idx];
    if (!skip) {
      step.commit && step.commit();
      const erro = step.validate && step.validate();
      if (erro) {
        const el = qs(root, "#step-erro");
        if (el) el.textContent = erro;
        return;
      }
    }
    if (idx < steps.length - 1) {
      idx++;
      render();
    } else {
      finish();
    }
  }

  function voltar() {
    if (idx > 0) {
      idx--;
      render();
    }
  }

  function render() {
    const step = steps[idx];
    const pct = totalCount > 0 ? (idx / totalCount) * 100 : 0;

    root.innerHTML = `
      <div class="wizard">
        ${
          step.hero
            ? ""
            : `<div class="progress">
                 <div class="progress-bar"><span style="width:${pct.toFixed(0)}%"></span></div>
                 <div class="progress-meta">Passo ${idx} de ${totalCount}</div>
               </div>`
        }
        <section class="card step ${step.hero ? "step-hero" : ""}">
          ${
            step.hero
              ? ""
              : `<div class="step-head">
                   <span class="step-icon">${icon(step.icon, { size: 26 })}</span>
                   <div>
                     <h1 class="step-title">${esc(step.titulo)}</h1>
                     ${step.subtitulo ? `<p class="muted">${esc(step.subtitulo)}</p>` : ""}
                   </div>
                 </div>`
          }
          <div class="step-body">${step.body()}</div>
          <div class="step-erro" id="step-erro"></div>
          <div class="step-nav">
            ${idx > 0 ? `<button class="btn-secondary" id="voltar">${icon("arrow-left", { size: 18 })} Voltar</button>` : "<span></span>"}
            <div class="step-nav-right">
              ${step.canSkip ? `<button class="btn-text" id="pular">Pular etapa</button>` : ""}
              <button class="btn-primary" id="avancar">${esc(step.avancar || "Avançar")} ${icon("arrow-right", { size: 18 })}</button>
            </div>
          </div>
        </section>
      </div>
    `;

    // auto-avanço em passos de escolha única
    if (step.auto) {
      qsa(root, ".option-card").forEach((cardEl) => {
        cardEl.addEventListener("click", () => {
          qsa(root, ".option-card").forEach((b) => b.classList.remove("selected"));
          cardEl.classList.add("selected");
          respostas[step.auto] = cardEl.dataset.value;
          setTimeout(() => avancar(false), 220);
        });
      });
    }

    step.wire && step.wire();

    qs(root, "#voltar")?.addEventListener("click", voltar);
    qs(root, "#pular")?.addEventListener("click", () => avancar(true));
    qs(root, "#avancar").addEventListener("click", () => avancar(false));

    window.scrollTo(0, 0);
  }

  render();
}
