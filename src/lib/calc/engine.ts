// Motor de cálculo puro: recebe a Config (tabela de preços) + CalcInput (respostas
// do cliente) e devolve o CalcResult. Sem dependência de React — totalmente testável.

import type { Config, FatorOpcao } from "../../types/config";
import type {
  CalcInput,
  CalcResult,
  FaseCalculada,
  LinhaOrcamento,
  NivelCalculo,
  PontoDesembolso,
} from "../../types/calc";

function mult(opcoes: FatorOpcao[], id: string): number {
  return opcoes.find((o) => o.id === id)?.mult ?? 1;
}

/** Produto dos fatores globais (tipo de reforma, complexidade, condição, região). */
function fatorGlobal(config: Config, input: CalcInput): number {
  return (
    mult(config.fatores.tipoReforma, input.tipoReformaId) *
    mult(config.fatores.complexidade, input.complexidadeId) *
    mult(config.fatores.condicaoImovel, input.condicaoImovelId) *
    mult(config.fatores.regiao, input.regiaoId)
  );
}

/** Define qual nível usar: o mais detalhado que o cliente preencheu. */
export function definirNivel(input: CalcInput): NivelCalculo {
  if (input.itens && input.itens.length > 0) return "detalhado";
  if (input.ambientes && input.ambientes.length > 0) return "porAmbiente";
  return "estimativaRapida";
}

function precoServico(
  config: Config,
  servicoId: string,
  padraoId: string
): number {
  const s = config.servicos.find((x) => x.id === servicoId);
  if (!s) return 0;
  return s.valorPorPadrao?.[padraoId] ?? s.valorUnitario;
}

interface Direto {
  subtotal: number;
  porCategoria: LinhaOrcamento[];
  porAmbiente: LinhaOrcamento[];
}

function custoEstimativaRapida(config: Config, input: CalcInput): Direto {
  const padrao = config.padroes.find((p) => p.id === input.padraoId);
  const valorM2 = padrao?.valorM2 ?? 0;
  const subtotal = input.areaTotal * valorM2 * fatorGlobal(config, input);
  return {
    subtotal,
    porCategoria: [
      {
        rotulo: "Obra (estimativa por m²)",
        detalhe: `${input.areaTotal} m² · padrão ${padrao?.nome ?? "-"}`,
        valor: subtotal,
      },
    ],
    porAmbiente: [],
  };
}

function custoPorAmbiente(config: Config, input: CalcInput): Direto {
  const fator = fatorGlobal(config, input);
  const porAmbiente: LinhaOrcamento[] = [];
  let subtotal = 0;
  for (const sel of input.ambientes ?? []) {
    const amb = config.ambientes.find((a) => a.id === sel.ambienteId);
    if (!amb) continue;
    const valorM2 = amb.valorM2PorPadrao[input.padraoId] ?? 0;
    const valor = sel.area * valorM2 * fator;
    subtotal += valor;
    porAmbiente.push({
      rotulo: amb.nome,
      detalhe: `${sel.area} m²`,
      valor,
    });
  }
  return { subtotal, porCategoria: [], porAmbiente };
}

function custoDetalhado(config: Config, input: CalcInput): Direto {
  const fator = fatorGlobal(config, input);
  const categorias = new Map<string, number>();
  let subtotal = 0;
  for (const item of input.itens ?? []) {
    const s = config.servicos.find((x) => x.id === item.servicoId);
    if (!s) continue;
    const preco = precoServico(config, item.servicoId, input.padraoId);
    const valor = item.quantidade * preco * fator;
    subtotal += valor;
    categorias.set(s.categoria, (categorias.get(s.categoria) ?? 0) + valor);
  }
  const porCategoria: LinhaOrcamento[] = [...categorias.entries()].map(
    ([rotulo, valor]) => ({ rotulo, valor })
  );
  return { subtotal, porCategoria, porAmbiente: [] };
}

function calcularDireto(config: Config, input: CalcInput, nivel: NivelCalculo): Direto {
  switch (nivel) {
    case "detalhado":
      return custoDetalhado(config, input);
    case "porAmbiente":
      return custoPorAmbiente(config, input);
    default:
      return custoEstimativaRapida(config, input);
  }
}

function montarCronograma(config: Config, input: CalcInput, total: number) {
  const { produtividadeM2PorDia, fases } = config.cronograma;
  const prazoDias = Math.max(
    1,
    Math.ceil((input.areaTotal || 1) / Math.max(produtividadeM2PorDia, 0.1))
  );

  const fasesCalc: FaseCalculada[] = [];
  const curva: PontoDesembolso[] = [];
  let diaCorrente = 0;
  let acumulado = 0;
  for (const f of fases) {
    const dur = Math.max(1, Math.round(prazoDias * f.pesoPrazo));
    const inicioDia = diaCorrente;
    const fimDia = diaCorrente + dur;
    fasesCalc.push({
      nome: f.nome,
      custo: total * f.pesoCusto,
      inicioDia,
      fimDia,
    });
    acumulado += f.pesoCusto;
    curva.push({ fase: f.nome, diaFim: fimDia, acumulado });
    diaCorrente = fimDia;
  }
  return { cronograma: { prazoDias: diaCorrente, fases: fasesCalc }, curvaDesembolso: curva };
}

/** Função principal. */
export function calcular(config: Config, input: CalcInput): CalcResult {
  const nivel = definirNivel(input);
  const direto = calcularDireto(config, input, nivel);

  const subtotalDireto = direto.subtotal;
  const bdiValor = subtotalDireto * (config.bdi.percentual / 100);
  const total = subtotalDireto + bdiValor;

  const faixaPct = config.incerteza[nivel];
  const faixa = {
    min: total * (1 + faixaPct.min),
    max: total * (1 + faixaPct.max),
  };

  const { cronograma, curvaDesembolso } = montarCronograma(config, input, total);

  return {
    nivel,
    subtotalDireto,
    bdiValor,
    total,
    faixa,
    porCategoria: direto.porCategoria,
    porAmbiente: direto.porAmbiente,
    cronograma,
    curvaDesembolso,
  };
}
