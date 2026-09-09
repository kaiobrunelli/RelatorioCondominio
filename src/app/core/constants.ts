/**
 * Primeira competência controlada pelo fluxo de caixa do sistema. As despesas anteriores
 * a este mês são apenas históricas (importadas da planilha original) e seu efeito líquido já
 * está refletido no lançamento manual "Saldo inicial de caixa" — por isso ficam de fora do
 * cálculo de saldo acumulado, evitando contá-las em dobro.
 */
export const INICIO_CONTROLE_CAIXA = '2026-09';
