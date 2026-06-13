// Tipos de entrada (o que o cliente preenche) e saída (o orçamento calculado).

import type { PadraoId } from "./config";

/** Ambiente escolhido pelo cliente no nível "por ambiente". */
export interface AmbienteSelecionado {
  ambienteId: string;
  area: number; // m²
}

/** Quantidade de um serviço no nível "detalhado". */
export interface ItemDetalhado {
  servicoId: string;
  quantidade: number;
}

/** Nível de detalhe efetivamente usado no cálculo (progressive disclosure). */
export type NivelCalculo = "estimativaRapida" | "porAmbiente" | "detalhado";

/** Tudo que o cliente informa no wizard. */
export interface CalcInput {
  areaTotal: number; // m²
  padraoId: PadraoId;
  tipoReformaId: string;
  complexidadeId: string;
  condicaoImovelId: string;
  regiaoId: string;
  ambientes?: AmbienteSelecionado[];
  itens?: ItemDetalhado[];
}

export interface LinhaOrcamento {
  rotulo: string;
  detalhe?: string;
  valor: number;
}

export interface FaseCalculada {
  nome: string;
  custo: number;
  inicioDia: number;
  fimDia: number;
}

export interface PontoDesembolso {
  fase: string;
  diaFim: number;
  acumulado: number; // 0..1 do total
}

/** Resultado completo do motor de cálculo. */
export interface CalcResult {
  nivel: NivelCalculo;
  subtotalDireto: number;
  bdiValor: number;
  total: number;
  faixa: { min: number; max: number };
  porCategoria: LinhaOrcamento[];
  porAmbiente: LinhaOrcamento[];
  cronograma: {
    prazoDias: number;
    fases: FaseCalculada[];
  };
  curvaDesembolso: PontoDesembolso[];
}
