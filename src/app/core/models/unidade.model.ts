export type TipoUnidade = 'padrao' | 'cobertura';

export interface Unidade {
  id: string;
  identificacao: string;
  morador: string;
  email: string;
  telefone: string;
  tipo: TipoUnidade;
  ativo: boolean;
  criadoEm: string;
}
