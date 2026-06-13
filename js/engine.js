// Motor de cálculo puro: recebe a config (tabela de preços) + input (respostas
// do cliente) e devolve o resultado. Sem dependência de DOM — usado pela UI e
// pelos testes (node:test). Estrutura dos objetos documentada no SPEC.md.

function mult(opcoes, id) {
  const o = (opcoes || []).find((x) => x.id === id);
  return o ? o.mult : 1;
}

/** Produto dos fatores globais (tipo de reforma, complexidade, condição, região). */
function fatorGlobal(config, input) {
  return (
    mult(config.fatores.tipoReforma, input.tipoReformaId) *
    mult(config.fatores.complexidade, input.complexidadeId) *
    mult(config.fatores.condicaoImovel, input.condicaoImovelId) *
    mult(config.fatores.regiao, input.regiaoId)
  );
}

/** Define qual nível usar: o mais detalhado que o cliente preencheu. */
export function definirNivel(input) {
  if (input.itens && input.itens.length > 0) return "detalhado";
  if (input.ambientes && input.ambientes.length > 0) return "porAmbiente";
  return "estimativaRapida";
}

function precoServico(config, servicoId, padraoId) {
  const s = config.servicos.find((x) => x.id === servicoId);
  if (!s) return 0;
  return (s.valorPorPadrao && s.valorPorPadrao[padraoId]) || s.valorUnitario;
}

function custoEstimativaRapida(config, input) {
  const padrao = config.padroes.find((p) => p.id === input.padraoId);
  const valorM2 = padrao ? padrao.valorM2 : 0;
  const subtotal = input.areaTotal * valorM2 * fatorGlobal(config, input);
  return {
    subtotal,
    porCategoria: [
      {
        rotulo: "Obra (estimativa por m²)",
        detalhe: `${input.areaTotal} m² · padrão ${padrao ? padrao.nome : "-"}`,
        valor: subtotal,
      },
    ],
    porAmbiente: [],
  };
}

function custoPorAmbiente(config, input) {
  const fator = fatorGlobal(config, input);
  const porAmbiente = [];
  let subtotal = 0;
  for (const sel of input.ambientes || []) {
    const amb = config.ambientes.find((a) => a.id === sel.ambienteId);
    if (!amb) continue;
    const valorM2 = amb.valorM2PorPadrao[input.padraoId] || 0;
    const valor = sel.area * valorM2 * fator;
    subtotal += valor;
    porAmbiente.push({ rotulo: amb.nome, detalhe: `${sel.area} m²`, valor });
  }
  return { subtotal, porCategoria: [], porAmbiente };
}

function custoDetalhado(config, input) {
  const fator = fatorGlobal(config, input);
  const categorias = new Map();
  let subtotal = 0;
  for (const item of input.itens || []) {
    const s = config.servicos.find((x) => x.id === item.servicoId);
    if (!s) continue;
    const preco = precoServico(config, item.servicoId, input.padraoId);
    const valor = item.quantidade * preco * fator;
    subtotal += valor;
    categorias.set(s.categoria, (categorias.get(s.categoria) || 0) + valor);
  }
  const porCategoria = [...categorias.entries()].map(([rotulo, valor]) => ({ rotulo, valor }));
  return { subtotal, porCategoria, porAmbiente: [] };
}

function calcularDireto(config, input, nivel) {
  if (nivel === "detalhado") return custoDetalhado(config, input);
  if (nivel === "porAmbiente") return custoPorAmbiente(config, input);
  return custoEstimativaRapida(config, input);
}

function montarCronograma(config, input, total) {
  const { produtividadeM2PorDia, fases } = config.cronograma;
  const prazoBase = Math.max(
    1,
    Math.ceil((input.areaTotal || 1) / Math.max(produtividadeM2PorDia, 0.1))
  );

  const fasesCalc = [];
  const curva = [];
  let diaCorrente = 0;
  let acumulado = 0;
  for (const f of fases) {
    const dur = Math.max(1, Math.round(prazoBase * f.pesoPrazo));
    const inicioDia = diaCorrente;
    const fimDia = diaCorrente + dur;
    fasesCalc.push({ nome: f.nome, custo: total * f.pesoCusto, inicioDia, fimDia });
    acumulado += f.pesoCusto;
    curva.push({ fase: f.nome, diaFim: fimDia, acumulado });
    diaCorrente = fimDia;
  }
  return { cronograma: { prazoDias: diaCorrente, fases: fasesCalc }, curvaDesembolso: curva };
}

/** Função principal: config + input -> resultado completo. */
export function calcular(config, input) {
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
