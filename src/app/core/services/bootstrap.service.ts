import { Injectable, inject, signal } from '@angular/core';
import { CategoriasService } from './categorias.service';
import { ConfigService } from './config.service';
import { DespesasService } from './despesas.service';
import { MovimentacoesService } from './movimentacoes.service';
import { PagamentosService } from './pagamentos.service';
import { UnidadesService } from './unidades.service';

/** Carrega, uma única vez por sessão, todos os dados vindos do Supabase antes de exibir as telas. */
@Injectable({ providedIn: 'root' })
export class BootstrapService {
  private readonly categorias = inject(CategoriasService);
  private readonly unidades = inject(UnidadesService);
  private readonly despesas = inject(DespesasService);
  private readonly pagamentos = inject(PagamentosService);
  private readonly movimentacoes = inject(MovimentacoesService);
  private readonly config = inject(ConfigService);

  readonly pronto = signal(false);
  private carregamento: Promise<void> | null = null;

  carregar(): Promise<void> {
    if (!this.carregamento) {
      this.carregamento = Promise.all([
        this.categorias.load(),
        this.unidades.load(),
        this.despesas.load(),
        this.pagamentos.load(),
        this.movimentacoes.load(),
        this.config.load(),
      ]).then(() => {
        this.pronto.set(true);
      });
    }
    return this.carregamento;
  }
}
