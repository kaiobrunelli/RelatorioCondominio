import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  template: `
    <div class="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-xl font-extrabold text-ink md:text-2xl">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="mt-1 text-sm text-ink-soft">{{ subtitle() }}</p>
        }
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}
