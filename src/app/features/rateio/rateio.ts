import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideCalculator, LucideDroplets } from '@lucide/angular';
import { ConfigService } from '../../core/services/config.service';
import { MonthService } from '../../core/services/month.service';
import { RateioService } from '../../core/services/rateio.service';
import { BrlPipe } from '../../shared/pipes/brl.pipe';
import { CompetenciaPipe } from '../../shared/pipes/competencia.pipe';
import { Badge, BadgeTone } from '../../shared/ui/badge/badge';
import { Card } from '../../shared/ui/card/card';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { KpiCard } from '../../shared/ui/kpi-card/kpi-card';
import { MonthSwitcher } from '../../shared/ui/month-switcher/month-switcher';
import { PageHeader } from '../../shared/ui/page-header/page-header';

@Component({
  selector: 'app-rateio',
  imports: [
    RouterLink,
    BrlPipe,
    CompetenciaPipe,
    Badge,
    Card,
    EmptyState,
    KpiCard,
    MonthSwitcher,
    PageHeader,
    LucideCalculator,
    LucideDroplets,
  ],
  templateUrl: './rateio.html',
})
export class RateioPage {
  private readonly rateioService = inject(RateioService);
  protected readonly config = inject(ConfigService);
  protected readonly month = inject(MonthService);

  protected readonly rateio = computed(() => this.rateioService.calcular(this.month.competencia()));

  protected readonly unidadesOrdenadas = computed(() =>
    [...this.rateio().unidades].sort((a, b) =>
      a.unidade.identificacao.localeCompare(b.unidade.identificacao, 'pt-BR', { numeric: true }),
    ),
  );

  toneTipo(tipo: 'padrao' | 'cobertura'): BadgeTone {
    return tipo === 'cobertura' ? 'amber' : 'primary';
  }
}
