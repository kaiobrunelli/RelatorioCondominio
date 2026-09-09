/** Converte `camelCase` (entidades TS) em `snake_case` (colunas Postgres) e vice-versa. */

function paraSnake(chave: string): string {
  return chave.replace(/[A-Z]/g, (letra) => `_${letra.toLowerCase()}`);
}

function paraCamel(chave: string): string {
  return chave.replace(/_([a-z0-9])/g, (_, letra: string) => letra.toUpperCase());
}

export function linhaParaEntidade<T>(linha: Record<string, unknown>): T {
  const resultado: Record<string, unknown> = {};
  for (const chave of Object.keys(linha)) {
    resultado[paraCamel(chave)] = linha[chave];
  }
  return resultado as T;
}

export function entidadeParaLinha(entidade: object): Record<string, unknown> {
  const origem = entidade as Record<string, unknown>;
  const resultado: Record<string, unknown> = {};
  for (const chave of Object.keys(origem)) {
    resultado[paraSnake(chave)] = origem[chave];
  }
  return resultado;
}
