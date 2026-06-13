// Tipos da "tabela de preços" / parâmetros editáveis pelo arquiteto (CMS).
// É o formato do arquivo src/data/config.default.json e do que é exportado/importado.

export type PadraoId = string;

export interface Meta {
  moeda: string; // ex.: "BRL"
  versaoTabela: string; // ex.: "2026-06"
  atualizadoEm: string; // ISO date
}

export interface Marca {
  nome: string;
  logoUrl: string;
  cor: string; // hex, usada no PDF/UI
  contato: {
    email: string;
    telefone: string;
    whatsapp: string; // só dígitos, ex.: "5511999999999"
  };
}

/** Padrão de acabamento — base da estimativa rápida (R$/m²). */
export interface Padrao {
  id: PadraoId;
  nome: string;
  valorM2: number;
  descricao?: string;
}

/** Valor por padrão de acabamento (mapa id->valor). */
export type ValorPorPadrao = Record<PadraoId, number>;

export interface FatorOpcao {
  id: string;
  nome: string;
  mult: number; // multiplicador aplicado ao subtotal
}

export interface Fatores {
  tipoReforma: FatorOpcao[];
  complexidade: FatorOpcao[];
  condicaoImovel: FatorOpcao[];
  regiao: FatorOpcao[];
}

/** Ambiente do catálogo (nível "por ambiente"). */
export interface Ambiente {
  id: string;
  nome: string;
  valorM2PorPadrao: ValorPorPadrao;
  servicosSugeridos: string[]; // ids de serviços
}

export type Unidade = "m2" | "m" | "ponto" | "un" | "vb";

/** Serviço/composição (nível "itens detalhados"). */
export interface Servico {
  id: string;
  nome: string;
  categoria: string;
  unidade: Unidade;
  valorUnitario: number;
  /** Opcional: preço por padrão de acabamento; se ausente, usa valorUnitario. */
  valorPorPadrao?: ValorPorPadrao;
}

export interface Bdi {
  percentual: number; // ex.: 25 (=25%)
  descricao?: string;
}

export interface FaixaIncerteza {
  min: number; // negativo, ex.: -0.2
  max: number; // positivo, ex.: 0.25
}

export interface Incerteza {
  estimativaRapida: FaixaIncerteza;
  porAmbiente: FaixaIncerteza;
  detalhado: FaixaIncerteza;
}

export interface FaseCronograma {
  id: string;
  nome: string;
  pesoCusto: number; // 0..1, soma ~1
  pesoPrazo: number; // 0..1, soma ~1
}

export interface Cronograma {
  produtividadeM2PorDia: number;
  fases: FaseCronograma[];
}

/** Configuração completa (a "tabela de preços" publicada). */
export interface Config {
  meta: Meta;
  marca: Marca;
  padroes: Padrao[];
  fatores: Fatores;
  ambientes: Ambiente[];
  servicos: Servico[];
  bdi: Bdi;
  incerteza: Incerteza;
  cronograma: Cronograma;
}
