import { Component, inject } from '@angular/core';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';
import { MonthService } from '../../../core/services/month.service';
import { CompetenciaPipe } from '../../pipes/competencia.pipe';

@Component({
  selector: 'app-month-switcher',
  imports: [LucideChevronLeft, LucideChevronRight, CompetenciaPipe],
  template: `
    <div class="flex items-center gap-1 rounded-xl border border-primary-100 bg-white p-1 shadow-sm">
      <button
        type="button"
        (click)="month.mesAnterior()"
        class="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition hover:bg-primary-50 hover:text-primary-700"
        aria-label="Mês anterior"
      >
        <svg lucideChevronLeft class="h-4 w-4"></svg>
      </button>
      <span class="min-w-[9.5rem] text-center text-sm font-bold text-ink">
        {{ month.competencia() | competencia: 'extenso' }}
      </span>
      <button
        type="button"
        (click)="month.proximoMes()"
        class="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition hover:bg-primary-50 hover:text-primary-700"
        aria-label="Próximo mês"
      >
        <svg lucideChevronRight class="h-4 w-4"></svg>
      </button>
    </div>
  `,
})
export class MonthSwitcher {
  readonly month = inject(MonthService);
}
