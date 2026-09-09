import { Component, input } from '@angular/core';

export type KpiTone = 'primary' | 'green' | 'amber' | 'red' | 'neutral';

@Component({
  selector: 'app-kpi-card',
  template: `
    <div class="flex items-start justify-between rounded-2xl border border-primary-100 bg-white p-5 shadow-sm">
      <div class="flex flex-col gap-1.5">
        <span class="text-xs font-semibold uppercase tracking-wide text-ink-soft">{{ label() }}</span>
        <span class="text-2xl font-extrabold text-ink">{{ value() }}</span>
        @if (hint()) {
          <span class="text-xs text-ink-soft">{{ hint() }}</span>
        }
      </div>
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" [class]="iconBg()">
        <ng-content></ng-content>
      </span>
    </div>
  `,
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly hint = input<string>();
  readonly tone = input<KpiTone>('primary');

  iconBg(): string {
    const map: Record<KpiTone, string> = {
      primary: 'bg-primary-100',
      green: 'bg-accent-green-bg',
      amber: 'bg-accent-amber-bg',
      red: 'bg-accent-red-bg',
      neutral: 'bg-surface-alt',
    };
    return map[this.tone()];
  }
}
