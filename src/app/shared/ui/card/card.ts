import { Component, input } from '@angular/core';

@Component({
  selector: 'app-card',
  template: `
    <div class="rounded-2xl border border-primary-100 bg-white p-5 shadow-sm md:p-6">
      @if (title()) {
        <div class="mb-4 flex items-center gap-3">
          @if (hasIcon()) {
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600"
            >
              <ng-content select="[icon]"></ng-content>
            </span>
          }
          <div>
            <h3 class="text-base font-bold text-ink">{{ title() }}</h3>
            @if (subtitle()) {
              <p class="text-sm text-ink-soft">{{ subtitle() }}</p>
            }
          </div>
        </div>
      }
      <ng-content></ng-content>
    </div>
  `,
})
export class Card {
  readonly title = input<string>();
  readonly subtitle = input<string>();
  readonly hasIcon = input<boolean>(false);
}
