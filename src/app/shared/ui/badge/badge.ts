import { Component, input } from '@angular/core';

export type BadgeTone = 'primary' | 'green' | 'amber' | 'red' | 'neutral';

@Component({
  selector: 'app-badge',
  template: `
    <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" [class]="classes()">
      <ng-content></ng-content>
    </span>
  `,
})
export class Badge {
  readonly tone = input<BadgeTone>('neutral');

  classes(): string {
    const map: Record<BadgeTone, string> = {
      primary: 'bg-primary-100 text-primary-700',
      green: 'bg-accent-green-bg text-accent-green',
      amber: 'bg-accent-amber-bg text-accent-amber',
      red: 'bg-accent-red-bg text-accent-red',
      neutral: 'bg-surface-alt text-ink-soft',
    };
    return map[this.tone()];
  }
}
