export type StatusPagamento = 'pago' | 'parcial' | 'pendente';

export interface Pagamento {
  id: string;
  unidadeId: string;
  /** Mês de competência no formato AAAA-MM. */
  competencia: string;
  valorPago: number;
  dataPagamento: string | null;
  formaPagamento: string;
  observacoes: string;
  criadoEm: string;
}
