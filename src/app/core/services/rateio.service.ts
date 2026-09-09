import { Injectable, inject } from '@angular/core';
import { Unidade } from '../models';
import { CategoriasService } from './categorias.service';
import { ConfigService } from './config.service';
import { DespesasService } from './despesas.service';
import { UnidadesService } from './unidades.service';

export interface RateioUnidade {
  unidade: Unidade;
  /** Taxa fixa de condomínio (igual para todas as unidades). */
  valorCondominio: number;
  /** Cota da água desta unidade no mês (única parte que é rateada). */
  valorAgua: number;
  total: number;
}

export interface RateioMes {
  competencia: string;
  /** Total de todas as despesas lançadas no mês (inclui contas que o condomínio paga com o caixa, não rateadas). */
  totalDespesas: number;
  /** Taxa fixa de condomínio por unidade, vinda de Configurações. */
  valorCondominioUnidade: number;
  /** Total da conta de água lançada no mês (soma das despesas da categoria marcada como "água"). */
  totalAgua: number;
  cotaAguaBase: number;
  cotaAguaCobertura: number;
  unidades: RateioUnidade[];
  /** Soma do que deve ser cobrado de todas as unidades (condomínio fixo + água rateada). */
  totalCobrado: number;
}

/** Arredonda para centavos distribuindo o resto de arredondamento na última posição, evitando perda de centavos. */
function distribuirComArredondamento(valores: number[], total: number): number[] {
  if (valores.length === 0) return [];
  const arredondados = valores.map((v) => Math.round(v * 100) / 100);
  const somaArredondada = arredondados.reduce((s, v) => s + v, 0);
  const diferenca = Math.round((total - somaArredondada) * 100) / 100;
  if (diferenca !== 0) {
    arredondados[arredondados.length - 1] = Math.round((arredondados[arredondados.length - 1] + diferenca) * 100) / 100;
  }
  return arredondados;
}

/**
 * A cobrança de cada unidade é sempre: taxa fixa de condomínio (igual pra todo mundo, definida em
 * Configurações) + a cota da água daquele mês (essa sim rateada, com acréscimo para coberturas). As
 * demais despesas (luz, DARF, faxineira, elevador, fundo de reserva etc.) são pagas com o caixa do
 * condomínio e só entram no controle de "pago/não pago" da tela Despesas — não são rateadas.
 */
@Injectable({ providedIn: 'root' })
export class RateioService {
  private readonly despesas = inject(DespesasService);
  private readonly categorias = inject(CategoriasService);
  private readonly unidades = inject(UnidadesService);
  private readonly config = inject(ConfigService);

  calcular(competencia: string): RateioMes {
    const cfg = this.config.config();
    const unidadesAtivas = this.unidades.ativas();
    const despesasMes = this.despesas.porCompetencia(competencia);
    const totalDespesas = despesasMes.reduce((s, d) => s + d.valor, 0);

    const categoriaAgua = this.categorias.all().find((c) => c.rateioDiferenciadoCobertura);
    const totalAgua = categoriaAgua
      ? despesasMes.filter((d) => d.categoriaId === categoriaAgua.id).reduce((s, d) => s + d.valor, 0)
      : 0;

    const n = unidadesAtivas.length;
    const coberturas = unidadesAtivas.filter((u) => u.tipo === 'cobertura');
    const c = coberturas.length;
    const r = n - c;

    let cotaAguaBase = 0;
    let cotaAguaCobertura = 0;
    let valoresAgua: number[] = unidadesAtivas.map(() => 0);

    if (n > 0 && totalAgua > 0) {
      const aplicaDiferenciado = cfg.regraCoberturaAtiva && c > 0 && r > 0;

      if (aplicaDiferenciado) {
        if (cfg.tipoAcrescimo === 'fixo') {
          const acrescimo = cfg.valorAcrescimo;
          cotaAguaBase = (totalAgua - acrescimo * c) / n;
          cotaAguaCobertura = cotaAguaBase + acrescimo;
        } else {
          const p = cfg.valorAcrescimo / 100;
          cotaAguaBase = totalAgua / (r + c * (1 + p));
          cotaAguaCobertura = cotaAguaBase * (1 + p);
        }
        if (cotaAguaBase < 0) {
          cotaAguaBase = totalAgua / n;
          cotaAguaCobertura = cotaAguaBase;
        }
      } else {
        cotaAguaBase = totalAgua / n;
        cotaAguaCobertura = cotaAguaBase;
      }

      valoresAgua = distribuirComArredondamento(
        unidadesAtivas.map((u) => (u.tipo === 'cobertura' ? cotaAguaCobertura : cotaAguaBase)),
        totalAgua,
      );
    }

    const valorCondominioUnidade = cfg.valorCondominio;

    const unidadesResultado: RateioUnidade[] = unidadesAtivas.map((unidade, i) => {
      const valorAgua = valoresAgua[i] ?? 0;
      return {
        unidade,
        valorCondominio: valorCondominioUnidade,
        valorAgua,
        total: valorCondominioUnidade + valorAgua,
      };
    });

    const totalCobrado = unidadesResultado.reduce((s, l) => s + l.total, 0);

    return {
      competencia,
      totalDespesas,
      valorCondominioUnidade,
      totalAgua,
      cotaAguaBase,
      cotaAguaCobertura,
      unidades: unidadesResultado,
      totalCobrado,
    };
  }
}
