export type TipoMovimentacao = 'entrada' | 'saida';

/** Lançamento manual de caixa (ex.: saldo inicial, retirada para reforma, aporte extra). */
export interface Movimentacao {
  id: string;
  data: string;
  descricao: string;
  tipo: TipoMovimentacao;
  valor: number;
  criadoEm: string;
}
