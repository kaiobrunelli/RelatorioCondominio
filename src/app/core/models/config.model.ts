export type TipoAcrescimo = 'percentual' | 'fixo';

export interface ConfigCondominio {
  nomeCondominio: string;
  endereco: string;
  /** Valor fixo da taxa de condomínio, igual para todas as unidades (não entra em rateio). */
  valorCondominio: number;
  /** Habilita o acréscimo diferenciado para unidades tipo "cobertura" na água. */
  regraCoberturaAtiva: boolean;
  tipoAcrescimo: TipoAcrescimo;
  /** Se percentual: pontos percentuais acima da cota normal. Se fixo: valor em R$ acima da cota normal. */
  valorAcrescimo: number;
}

/**
 * Regra padrão do rateio da água: divide o valor total por partes, onde cada unidade
 * padrão vale 1 cota e cada cobertura vale 1,5 cota (ex.: 6 padrão + 2 cobertura = 6 + 3 = 9
 * partes). Isso é o mesmo que aplicar 50% de acréscimo percentual sobre a cota normal.
 */
export const CONFIG_PADRAO: ConfigCondominio = {
  nomeCondominio: 'Residencial Catalunha',
  endereco: '',
  valorCondominio: 400,
  regraCoberturaAtiva: true,
  tipoAcrescimo: 'percentual',
  valorAcrescimo: 50,
};
