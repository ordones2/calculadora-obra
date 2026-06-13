// Wizard do cliente — fluxo "por ambiente" (inspirado no app de referência) e
// gamificado: perfil do imóvel -> ambientes -> padrão -> serviços por ambiente ->
// detalhes da obra -> contato. O PREÇO só é revelado no /resultado (lead gate).
//
// O cálculo usa o nível "porAmbiente" do motor (área × R$/m² por padrão, calibrado
// pelo arquiteto). A seleção de serviços por ambiente entra como ESCOPO incluído
// (aparece na proposta/PDF) e não altera os números.

import { esc, qs, qsa } from "../dom.js";
import { icon } from "../icons.js";
import { saveInput } from "../inputStore.js";
import { saveLead } from "../leadStore.js";

const ICONE_AMBIENTE = {
  cozinha: "utensils",
  banheiro: "droplet",
  suite: "bed",
  sala: "sofa",
  lavabo: "droplets",
  "area-servico": "washing-machine",
  "area-externa": "trees",
};
const iconeAmb = (id) => ICONE_AMBIENTE[id] || "door-open";

// Ícones distintos por nível de padrão (sem repetir).
const ICONE_PADRAO = { economico: "wallet", medio: "gem", alto: "sparkles", luxo: "crown" };
const iconePadrao = (p) => ICONE_PADRAO[p.id] || "gem";

// Perfis pré-configurados: [ambienteId, área m²] (ids de config.ambientes).
const PERFIS = {
  pequeno: {
    nome: "Pequeno",
    sub: "2 dormitórios",
    icon: "home",
    ambientes: [["sala", 18], ["cozinha", 10], ["area-servico", 4], ["banheiro", 5], ["suite", 12], ["suite", 10]],
  },
  medio: {
    nome: "Médio",
    sub: "3 dormitórios",
    icon: "building-2",
    ambientes: [["sala", 22], ["cozinha", 12], ["area-servico", 5], ["area-externa", 8], ["lavabo", 3], ["banheiro", 5], ["banheiro", 5], ["suite", 14], ["suite", 12], ["suite", 10]],
  },
  grande: {
    nome: "Grande",
    sub: "4 dormitórios",
    icon: "building",
    ambientes: [["sala", 28], ["cozinha", 16], ["area-servico", 6], ["area-externa", 12], ["lavabo", 4], ["banheiro", 6], ["banheiro", 5], ["suite", 16], ["suite", 14], ["suite", 12], ["suite", 10]],
  },
};

export function renderHome(root, app) {
  const c = app.config;
  let uidSeq = 1;

  // Constrói as instâncias de ambiente a partir de uma lista [id, area], dando
  // nomes sequenciais quando o mesmo tipo se repete (Suíte 1, Suíte 2...).
  function instanciar(lista) {
    const contagem = {};
    const total = {};
    lista.forEach(([id]) => (total[id] = (total[id] || 0) + 1));
    return lista
      .map(([id, area]) => {
        const amb = c.ambientes.find((a) => a.id === id);
        if (!amb) return null;
        contagem[id] = (contagem[id] || 0) + 1;
        const nome = total[id] > 1 ? `${amb.nome} ${contagem[id]}` : amb.nome;
        return { uid: uidSeq++, ambienteId: id, nome, area, servicos: [...(amb.servicosSugeridos || [])] };
      })
      .filter(Boolean);
  }

  const respostas = {
    perfil: null,
    ambientes: [],
    padraoId: null,
    tipoReformaId: c.fatores.tipoReforma[1]?.id || c.fatores.tipoReforma[0]?.id,
    complexidadeId: c.fatores.complexidade[1]?.id || c.fatores.complexidade[0]?.id,
    condicaoImovelId: c.fatores.condicaoImovel[1]?.id || c.fatores.condicaoImovel[0]?.id,
    regiaoId: c.fatores.regiao[0]?.id,
    lead: { nome: "", whatsapp: "", email: "" },
  };

  let idx = 0;

  // ---------- helpers ----------
  function cardsUnicos(field, opcoes, iconeDe) {
    return `<div class="option-cards">
      ${opcoes
        .map(
          (o) => `
        <button type="button" class="option-card ${respostas[field] === o.id ? "selected" : ""}" data-value="${esc(o.id)}">
          <span class="oc-icon">${icon(iconeDe(o), { size: 24 })}</span>
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
          .map((o) => `<option value="${esc(o.id)}" ${respostas[field] === o.id ? "selected" : ""}>${esc(o.nome)}</option>`)
          .join("")}
      </select>
    </label>`;
  }

  // Sincroniza as áreas digitadas (antes de re-renderizar em add/remover).
  function syncAreas() {
    qsa(root, ".room-card").forEach((card) => {
      const inp = qs(card, ".room-area input");
      if (!inp) return;
      const r = respostas.ambientes.find((a) => a.uid === Number(card.dataset.uid));
      if (r) r.area = Number(inp.value) || 0;
    });
  }

  // ---------- passos ----------
  const steps = [
    {
      hero: true,
      avancarOcultar: true,
      body: () => `
        <div class="step-hero">
          <span class="hero-ic">${icon("calculator", { size: 30 })}</span>
          <p class="hero-eyebrow">Calculadora de reforma</p>
          <h1 class="hero-title">Descubra o investimento da sua reforma</h1>
          <p class="hero-sub">Em poucos minutos você recebe uma estimativa de custo, prazo e proposta — sem visita técnica. Comece escolhendo o perfil do imóvel:</p>
          <div class="perfil-cards">
            ${Object.entries(PERFIS)
              .map(
                ([id, p]) => `
              <button type="button" class="perfil-card" data-perfil="${id}">
                <span class="perfil-ic">${icon(p.icon, { size: 24 })}</span>
                <span class="perfil-nome">${esc(p.nome)}</span>
                <span class="perfil-sub">${esc(p.sub)}</span>
              </button>`
              )
              .join("")}
          </div>
          <p class="muted small" style="margin-top:1rem">
            <button type="button" class="btn-text" id="custom">Ou montar os ambientes do zero</button>
          </p>
        </div>`,
      wire: () => {
        qsa(root, ".perfil-card").forEach((card) =>
          card.addEventListener("click", () => {
            respostas.perfil = card.dataset.perfil;
            respostas.ambientes = instanciar(PERFIS[card.dataset.perfil].ambientes);
            avancar(false);
          })
        );
        qs(root, "#custom").addEventListener("click", () => {
          respostas.perfil = "custom";
          if (!respostas.ambientes.length) respostas.ambientes = instanciar([["sala", 18], ["cozinha", 10]]);
          avancar(false);
        });
      },
    },
    {
      icon: "door-open",
      titulo: "Confira os ambientes",
      subtitulo: "Ajuste a área de cada ambiente, adicione ou remova. Já preenchemos com tamanhos típicos.",
      body: () => `
        <div class="rooms-grid">
          ${respostas.ambientes.map((a) => roomCard(a)).join("")}
        </div>
        <div class="room-add-row">
          <select id="add-amb">
            ${c.ambientes.map((a) => `<option value="${esc(a.id)}">${esc(a.nome)}</option>`).join("")}
          </select>
          <button type="button" class="btn-secondary" id="add-room">${icon("plus", { size: 18 })} Adicionar</button>
        </div>`,
      wire: () => {
        qsa(root, ".room-del").forEach((b) =>
          b.addEventListener("click", () => {
            syncAreas();
            respostas.ambientes = respostas.ambientes.filter((a) => a.uid !== Number(b.dataset.uid));
            render();
          })
        );
        qs(root, "#add-room").addEventListener("click", () => {
          syncAreas();
          const id = qs(root, "#add-amb").value;
          respostas.ambientes = respostas.ambientes.concat(instanciarUm(id));
          render();
        });
      },
      commit: () => syncAreas(),
      validate: () => {
        syncAreas();
        if (!respostas.ambientes.length) return "Adicione pelo menos um ambiente.";
        if (respostas.ambientes.some((a) => !a.area || a.area < 1)) return "Cada ambiente precisa de uma área maior que zero.";
        return null;
      },
    },
    {
      icon: "gem",
      titulo: "Qual padrão de acabamento?",
      subtitulo: "Define a qualidade dos materiais e do acabamento.",
      auto: "padraoId",
      body: () => cardsUnicos("padraoId", c.padroes, iconePadrao),
      validate: () => (respostas.padraoId ? null : "Escolha um padrão para continuar."),
    },
    {
      icon: "list-checks",
      titulo: "Serviços de cada ambiente",
      subtitulo: "Pré-selecionamos os serviços típicos. Toque para incluir ou remover — isso define o escopo da sua proposta.",
      body: () => respostas.ambientes.map((a, i) => roomServicos(a, i === 0)).join(""),
      wire: () => {
        qsa(root, ".svc-chip").forEach((chip) =>
          chip.addEventListener("click", () => {
            const on = chip.getAttribute("aria-pressed") === "true";
            chip.setAttribute("aria-pressed", on ? "false" : "true");
            const det = chip.closest(".svc-room");
            const n = qsa(det, '.svc-chip[aria-pressed="true"]').length;
            qs(det, ".svc-count").textContent = `${n} ${n === 1 ? "serviço" : "serviços"}`;
          })
        );
      },
      commit: () => {
        qsa(root, ".svc-room").forEach((det) => {
          const r = respostas.ambientes.find((a) => a.uid === Number(det.dataset.uid));
          if (r) r.servicos = qsa(det, '.svc-chip[aria-pressed="true"]').map((ch) => ch.dataset.servico);
        });
      },
    },
    {
      icon: "hammer",
      titulo: "Sobre a obra",
      subtitulo: "Esses detalhes ajustam a estimativa à sua realidade.",
      body: () => `
        <div class="grid-2">
          ${selectField("tipoReformaId", "Tipo de reforma", c.fatores.tipoReforma)}
          ${selectField("condicaoImovelId", "Condição do imóvel", c.fatores.condicaoImovel)}
          ${selectField("complexidadeId", "Complexidade da obra", c.fatores.complexidade)}
          ${selectField("regiaoId", "Região", c.fatores.regiao)}
        </div>`,
      commit: () => qsa(root, "[data-field]").forEach((sel) => (respostas[sel.dataset.field] = sel.value)),
    },
    {
      icon: "message-circle",
      titulo: "Falta só 1 passo para ver sua estimativa 🎉",
      subtitulo: "Deixe seu contato para liberar a estimativa e a proposta.",
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
          <p class="muted small">Usamos seus dados apenas para enviar a estimativa e falar sobre o seu projeto.</p>
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

  function instanciarUm(id) {
    const inst = instanciar([[id, 10]]);
    // renomeia considerando os já existentes do mesmo tipo
    const mesmos = respostas.ambientes.filter((a) => a.ambienteId === id).length;
    const amb = c.ambientes.find((a) => a.id === id);
    if (inst[0] && amb && mesmos >= 1) inst[0].nome = `${amb.nome} ${mesmos + 1}`;
    return inst;
  }

  function roomCard(a) {
    return `
      <div class="room-card" data-uid="${a.uid}">
        <span class="room-ic">${icon(iconeAmb(a.ambienteId), { size: 20 })}</span>
        <div class="room-info">
          <div class="room-nome">${esc(a.nome)}</div>
          <div class="room-area"><input type="number" min="1" value="${esc(a.area)}" /><span>m²</span></div>
        </div>
        <button type="button" class="room-del" data-uid="${a.uid}" aria-label="Remover">${icon("trash-2", { size: 18 })}</button>
      </div>`;
  }

  function roomServicos(a, aberto) {
    const sel = new Set(a.servicos);
    const n = sel.size;
    return `
      <details class="svc-room" data-uid="${a.uid}" ${aberto ? "open" : ""}>
        <summary>
          <span class="room-ic">${icon(iconeAmb(a.ambienteId), { size: 18 })}</span>
          ${esc(a.nome)} <span class="svc-count">${n} ${n === 1 ? "serviço" : "serviços"}</span>
          <span class="chev">${icon("chevron-down", { size: 18 })}</span>
        </summary>
        <div class="svc-chips">
          ${c.servicos
            .map(
              (s) => `
            <button type="button" class="svc-chip" data-servico="${esc(s.id)}" aria-pressed="${sel.has(s.id)}">
              ${icon("check", { size: 14 })}${esc(s.nome)}
            </button>`
            )
            .join("")}
        </div>
      </details>`;
  }

  const totalCount = steps.length - 1; // exclui o hero

  // ---------- navegação ----------
  function buildInput() {
    return {
      areaTotal: respostas.ambientes.reduce((s, a) => s + (Number(a.area) || 0), 0),
      padraoId: respostas.padraoId,
      tipoReformaId: respostas.tipoReformaId,
      complexidadeId: respostas.complexidadeId,
      condicaoImovelId: respostas.condicaoImovelId,
      regiaoId: respostas.regiaoId,
      ambientes: respostas.ambientes.map((a) => ({
        ambienteId: a.ambienteId,
        area: Number(a.area) || 0,
        nome: a.nome,
        servicos: a.servicos,
      })),
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
        <section class="card step">
          ${
            step.hero
              ? ""
              : `<div class="step-head">
                   <span class="step-icon">${icon(step.icon, { size: 24 })}</span>
                   <div>
                     <h1 class="step-title">${esc(step.titulo)}</h1>
                     ${step.subtitulo ? `<p class="muted">${esc(step.subtitulo)}</p>` : ""}
                   </div>
                 </div>`
          }
          <div class="step-body">${step.body()}</div>
          <div class="step-erro" id="step-erro"></div>
          ${
            step.avancarOcultar
              ? ""
              : `<div class="step-nav">
                   ${idx > 0 ? `<button class="btn-secondary" id="voltar">${icon("arrow-left", { size: 18 })} Voltar</button>` : "<span></span>"}
                   <div class="step-nav-right">
                     <button class="btn-primary" id="avancar">${esc(step.avancar || "Avançar")} ${icon("arrow-right", { size: 18 })}</button>
                   </div>
                 </div>`
          }
        </section>
      </div>
    `;

    if (step.auto) {
      qsa(root, ".option-card").forEach((cardEl) =>
        cardEl.addEventListener("click", () => {
          qsa(root, ".option-card").forEach((b) => b.classList.remove("selected"));
          cardEl.classList.add("selected");
          respostas[step.auto] = cardEl.dataset.value;
          setTimeout(() => avancar(false), 200);
        })
      );
    }

    step.wire && step.wire();

    qs(root, "#voltar")?.addEventListener("click", voltar);
    qs(root, "#avancar")?.addEventListener("click", () => avancar(false));

    window.scrollTo(0, 0);
  }

  render();
}
