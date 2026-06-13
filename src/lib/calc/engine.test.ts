import { describe, expect, it } from "vitest";
import config from "../../data/config.default.json";
import type { Config } from "../../types/config";
import type { CalcInput } from "../../types/calc";
import { calcular, definirNivel } from "./engine";

const cfg = config as Config;

const baseInput: CalcInput = {
  areaTotal: 100,
  padraoId: "alto",
  tipoReformaId: "parcial", // mult 1.0
  complexidadeId: "media", // mult 1.0
  condicaoImovelId: "usado", // mult 1.0
  regiaoId: "interior-sp", // mult 1.0
};

describe("definirNivel", () => {
  it("usa estimativa rápida sem ambientes nem itens", () => {
    expect(definirNivel(baseInput)).toBe("estimativaRapida");
  });

  it("usa por ambiente quando há ambientes", () => {
    expect(
      definirNivel({ ...baseInput, ambientes: [{ ambienteId: "cozinha", area: 12 }] })
    ).toBe("porAmbiente");
  });

  it("usa detalhado quando há itens (mais específico vence)", () => {
    expect(
      definirNivel({
        ...baseInput,
        ambientes: [{ ambienteId: "cozinha", area: 12 }],
        itens: [{ servicoId: "demolicao", quantidade: 10 }],
      })
    ).toBe("detalhado");
  });
});

describe("estimativa rápida", () => {
  it("calcula área × R$/m² + BDI com fatores neutros", () => {
    const r = calcular(cfg, baseInput);
    // 100 m² × 4200 (alto) × 1.0 = 420.000 de custo direto
    expect(r.subtotalDireto).toBe(420_000);
    // BDI 25% => 105.000; total 525.000
    expect(r.bdiValor).toBe(105_000);
    expect(r.total).toBe(525_000);
    // faixa estimativaRapida -20% / +25%
    expect(r.faixa.min).toBeCloseTo(525_000 * 0.8, 2);
    expect(r.faixa.max).toBeCloseTo(525_000 * 1.25, 2);
    expect(r.nivel).toBe("estimativaRapida");
  });

  it("aplica os fatores globais (região aumenta o custo)", () => {
    const r = calcular(cfg, { ...baseInput, regiaoId: "sp-capital" }); // mult 1.1
    expect(r.subtotalDireto).toBeCloseTo(420_000 * 1.1, 2);
  });
});

describe("por ambiente", () => {
  it("soma o custo dos ambientes selecionados", () => {
    const r = calcular(cfg, {
      ...baseInput,
      ambientes: [
        { ambienteId: "cozinha", area: 12 }, // 12 × 5800 = 69.600
        { ambienteId: "banheiro", area: 6 }, // 6 × 6500 = 39.000
      ],
    });
    expect(r.nivel).toBe("porAmbiente");
    expect(r.subtotalDireto).toBe(69_600 + 39_000);
    expect(r.porAmbiente).toHaveLength(2);
    // faixa porAmbiente é mais estreita que a da estimativa rápida
    expect(r.faixa.max / r.total).toBeCloseTo(1.15, 2);
  });
});

describe("detalhado", () => {
  it("soma serviços por categoria usando preço por padrão quando existir", () => {
    const r = calcular(cfg, {
      ...baseInput,
      itens: [
        { servicoId: "revestimento-piso", quantidade: 50 }, // alto: 420 → 21.000
        { servicoId: "demolicao", quantidade: 30 }, // 90 → 2.700
      ],
    });
    expect(r.nivel).toBe("detalhado");
    expect(r.subtotalDireto).toBe(21_000 + 2_700);
    expect(r.porCategoria.length).toBeGreaterThan(0);
  });
});

describe("cronograma", () => {
  it("gera fases e curva de desembolso acumulando até ~100%", () => {
    const r = calcular(cfg, baseInput);
    expect(r.cronograma.fases.length).toBe(cfg.cronograma.fases.length);
    expect(r.cronograma.prazoDias).toBeGreaterThan(0);
    const ultimo = r.curvaDesembolso[r.curvaDesembolso.length - 1];
    expect(ultimo.acumulado).toBeCloseTo(1, 2);
  });
});
