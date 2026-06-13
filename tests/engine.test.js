import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calcular, definirNivel } from "../js/engine.js";

const cfg = JSON.parse(
  readFileSync(new URL("../data/config.default.json", import.meta.url))
);

const baseInput = {
  areaTotal: 100,
  padraoId: "alto",
  tipoReformaId: "parcial", // 1.0
  complexidadeId: "media", // 1.0
  condicaoImovelId: "usado", // 1.0
  regiaoId: "interior-sp", // 1.0
};

test("definirNivel: estimativa rápida sem ambientes nem itens", () => {
  assert.equal(definirNivel(baseInput), "estimativaRapida");
});

test("definirNivel: por ambiente quando há ambientes", () => {
  assert.equal(
    definirNivel({ ...baseInput, ambientes: [{ ambienteId: "cozinha", area: 12 }] }),
    "porAmbiente"
  );
});

test("definirNivel: detalhado vence quando há itens", () => {
  assert.equal(
    definirNivel({
      ...baseInput,
      ambientes: [{ ambienteId: "cozinha", area: 12 }],
      itens: [{ servicoId: "demolicao", quantidade: 10 }],
    }),
    "detalhado"
  );
});

test("estimativa rápida: área × R$/m² + BDI com fatores neutros", () => {
  const r = calcular(cfg, baseInput);
  assert.equal(r.subtotalDireto, 420_000); // 100 × 4200
  assert.equal(r.bdiValor, 105_000); // 25%
  assert.equal(r.total, 525_000);
  assert.ok(Math.abs(r.faixa.min - 525_000 * 0.8) < 0.01);
  assert.ok(Math.abs(r.faixa.max - 525_000 * 1.25) < 0.01);
  assert.equal(r.nivel, "estimativaRapida");
});

test("estimativa rápida: fator de região aumenta o custo", () => {
  const r = calcular(cfg, { ...baseInput, regiaoId: "sp-capital" }); // 1.1
  assert.ok(Math.abs(r.subtotalDireto - 420_000 * 1.1) < 0.01);
});

test("por ambiente: soma os ambientes e usa faixa mais estreita", () => {
  const r = calcular(cfg, {
    ...baseInput,
    ambientes: [
      { ambienteId: "cozinha", area: 12 }, // 12 × 5800 = 69.600
      { ambienteId: "banheiro", area: 6 }, // 6 × 6500 = 39.000
    ],
  });
  assert.equal(r.nivel, "porAmbiente");
  assert.equal(r.subtotalDireto, 69_600 + 39_000);
  assert.equal(r.porAmbiente.length, 2);
  assert.ok(Math.abs(r.faixa.max / r.total - 1.15) < 0.01);
});

test("detalhado: soma serviços por categoria usando preço por padrão", () => {
  const r = calcular(cfg, {
    ...baseInput,
    itens: [
      { servicoId: "revestimento-piso", quantidade: 50 }, // alto: 420 → 21.000
      { servicoId: "demolicao", quantidade: 30 }, // 90 → 2.700
    ],
  });
  assert.equal(r.nivel, "detalhado");
  assert.equal(r.subtotalDireto, 21_000 + 2_700);
  assert.ok(r.porCategoria.length > 0);
});

test("cronograma: fases e curva de desembolso acumulam ~100%", () => {
  const r = calcular(cfg, baseInput);
  assert.equal(r.cronograma.fases.length, cfg.cronograma.fases.length);
  assert.ok(r.cronograma.prazoDias > 0);
  const ultimo = r.curvaDesembolso[r.curvaDesembolso.length - 1];
  assert.ok(Math.abs(ultimo.acumulado - 1) < 0.01);
});
