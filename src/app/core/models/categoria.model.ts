export interface Categoria {
  id: string;
  nome: string;
  /** Quando true, aplica a regra diferenciada de rateio (ex.: água com acréscimo para coberturas). */
  rateioDiferenciadoCobertura: boolean;
  cor: string;
  criadoEm: string;
}
