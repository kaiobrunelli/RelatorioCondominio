const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

/** Competência no formato AAAA-MM referente ao mês atual. */
export function competenciaAtual(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
}

/** Soma (ou subtrai) meses a uma competência AAAA-MM, retornando outra competência AAAA-MM. */
export function somarMeses(competencia: string, quantidade: number): string {
  const [ano, mes] = competencia.split('-').map(Number);
  const data = new Date(ano, mes - 1 + quantidade, 1);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
}

/** Formata AAAA-MM como "Setembro de 2026". */
export function formatarCompetenciaExtenso(competencia: string): string {
  const [ano, mes] = competencia.split('-').map(Number);
  return `${MESES[mes - 1]} de ${ano}`;
}

/** Formata AAAA-MM como "Set/2026". */
export function formatarCompetenciaCurta(competencia: string): string {
  const [ano, mes] = competencia.split('-').map(Number);
  return `${MESES[mes - 1].slice(0, 3)}/${ano}`;
}

export function competenciaValida(valor: string): boolean {
  return /^\d{4}-\d{2}$/.test(valor);
}
