import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-primary-200 bg-primary-50/40 px-6 py-12 text-center">
      <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-600">
        <ng-content select="[icon]"></ng-content>
      </div>
      <h3 class="text-base font-bold text-ink">{{ title() }}</h3>
      <p class="max-w-sm text-sm text-ink-soft">{{ description() }}</p>
      <ng-content></ng-content>
    </div>
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly description = input<string>('');
}
