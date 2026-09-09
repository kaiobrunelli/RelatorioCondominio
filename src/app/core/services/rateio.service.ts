import { Injectable, inject } from '@angular/core';
import { Categoria, Unidade } from '../models';
import { CategoriasService } from './categorias.service';
import { ConfigService } from './config.service';
import { DespesasService } from './despesas.service';
import { UnidadesService } from './unidades.service';

export interface RateioPorCategoria {
  categoriaId: string;
  categoriaNome: string;
  total: number;
  diferenciado: boolean;
}

export interface RateioUnidade {
  unidade: Unidade;
  valorPorCategoria: Map<string, number>;
  total: number;
}

export interface RateioMes {
  competencia: string;
  totalDespesas: number;
  categorias: RateioPorCategoria[];
  unidades: RateioUnidade[];
  totalRateado: number;
  cotaBase: number;
  cotaCobertura: number;
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
    const categoriasMap = new Map<string, Categoria>(this.categorias.all().map((c) => [c.id, c]));

    const totalPorCategoria = new Map<string, number>();
    for (const despesa of despesasMes) {
      totalPorCategoria.set(despesa.categoriaId, (totalPorCategoria.get(despesa.categoriaId) ?? 0) + despesa.valor);
    }

    const categoriasResumo: RateioPorCategoria[] = [...totalPorCategoria.entries()].map(([categoriaId, total]) => {
      const categoria = categoriasMap.get(categoriaId);
      return {
        categoriaId,
        categoriaNome: categoria?.nome ?? 'Sem categoria',
        total,
        diferenciado: !!categoria?.rateioDiferenciadoCobertura,
      };
    });

    const totalDespesas = despesasMes.reduce((s, d) => s + d.valor, 0);

    const linhas = new Map<string, RateioUnidade>(
      unidadesAtivas.map((u) => [u.id, { unidade: u, valorPorCategoria: new Map<string, number>(), total: 0 }]),
    );

    const n = unidadesAtivas.length;
    const coberturas = unidadesAtivas.filter((u) => u.tipo === 'cobertura');
    const c = coberturas.length;
    const r = n - c;

    let cotaBaseAgua = 0;
    let cotaCoberturaAgua = 0;

    for (const resumo of categoriasResumo) {
      if (n === 0) continue;

      const aplicaDiferenciado = resumo.diferenciado && cfg.regraCoberturaAtiva && c > 0 && r > 0;

      if (!aplicaDiferenciado) {
        const cota = resumo.total / n;
        const valores = distribuirComArredondamento(
          unidadesAtivas.map(() => cota),
          resumo.total,
        );
        unidadesAtivas.forEach((u, i) => {
          const linha = linhas.get(u.id)!;
          linha.valorPorCategoria.set(resumo.categoriaId, valores[i]);
        });
        continue;
      }

      let cotaNormal: number;
      let cotaCobertura: number;

      if (cfg.tipoAcrescimo === 'fixo') {
        const acrescimo = cfg.valorAcrescimo;
        cotaNormal = (resumo.total - acrescimo * c) / n;
        cotaCobertura = cotaNormal + acrescimo;
      } else {
        const p = cfg.valorAcrescimo / 100;
        cotaNormal = resumo.total / (r + c * (1 + p));
        cotaCobertura = cotaNormal * (1 + p);
      }

      if (cotaNormal < 0) {
        cotaNormal = resumo.total / n;
        cotaCobertura = cotaNormal;
      }

      cotaBaseAgua = cotaNormal;
      cotaCoberturaAgua = cotaCobertura;

      const valoresBrutos = unidadesAtivas.map((u) => (u.tipo === 'cobertura' ? cotaCobertura : cotaNormal));
      const valores = distribuirComArredondamento(valoresBrutos, resumo.total);
      unidadesAtivas.forEach((u, i) => {
        const linha = linhas.get(u.id)!;
        linha.valorPorCategoria.set(resumo.categoriaId, valores[i]);
      });
    }

    for (const linha of linhas.values()) {
      linha.total = [...linha.valorPorCategoria.values()].reduce((s, v) => s + v, 0);
    }

    const unidadesResultado = [...linhas.values()];
    const totalRateado = unidadesResultado.reduce((s, l) => s + l.total, 0);

    return {
      competencia,
      totalDespesas,
      categorias: categoriasResumo,
      unidades: unidadesResultado,
      totalRateado,
      cotaBase: cotaBaseAgua,
      cotaCobertura: cotaCoberturaAgua,
    };
  }
}
