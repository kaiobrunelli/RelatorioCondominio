import { Injectable, computed, signal } from '@angular/core';
import { competenciaAtual, somarMeses } from '../utils/competencia.util';

/** Mês de competência selecionado globalmente, compartilhado entre as telas do app. */
@Injectable({ providedIn: 'root' })
export class MonthService {
  private readonly state = signal<string>(competenciaAtual());

  readonly competencia = computed(() => this.state());

  irPara(competencia: string): void {
    this.state.set(competencia);
  }

  proximoMes(): void {
    this.state.set(somarMeses(this.state(), 1));
  }

  mesAnterior(): void {
    this.state.set(somarMeses(this.state(), -1));
  }

  voltarParaAtual(): void {
    this.state.set(competenciaAtual());
  }
}
