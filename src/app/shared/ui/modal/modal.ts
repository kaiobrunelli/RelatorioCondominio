import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-primary-950/50 backdrop-blur-sm" (click)="closed.emit()"></div>
        <div
          class="relative flex max-h-[90vh] w-full flex-col rounded-2xl bg-white shadow-2xl"
          [class]="maxWidth()"
        >
          <div class="flex items-center justify-between border-b border-primary-100 px-6 py-4">
            <h2 class="text-lg font-bold text-ink">{{ title() }}</h2>
            <button
              type="button"
              (click)="closed.emit()"
              class="rounded-lg p-1.5 text-ink-soft transition hover:bg-surface-alt hover:text-ink"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
          <div class="overflow-y-auto px-6 py-5">
            <ng-content></ng-content>
          </div>
        </div>
      </div>
    }
  `,
})
export class Modal {
  readonly open = input.required<boolean>();
  readonly title = input<string>('');
  readonly maxWidth = input<string>('max-w-lg');
  readonly closed = output<void>();
}
