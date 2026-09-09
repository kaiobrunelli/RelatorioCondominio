export type TipoDespesa = 'unica' | 'recorrente' | 'parcelada';

export interface Despesa {
  id: string;
  categoriaId: string;
  descricao: string;
  valor: number;
  /** Mês de competência no formato AAAA-MM. */
  competencia: string;
  tipo: TipoDespesa;
  /** Identifica lançamentos gerados juntos (recorrência ou parcelamento). */
  grupoId: string | null;
  parcelaAtual: number | null;
  parcelaTotal: number | null;
  fornecedorNome: string;
  fornecedorContato: string;
  observacoes: string;
  criadoEm: string;
}
