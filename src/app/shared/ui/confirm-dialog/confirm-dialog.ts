import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-primary-950/50 backdrop-blur-sm" (click)="cancelled.emit()"></div>
        <div class="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
          <h2 class="text-base font-bold text-ink">{{ title() }}</h2>
          <p class="mt-2 text-sm text-ink-soft">{{ message() }}</p>
          <div class="mt-6 flex justify-end gap-2">
            <button
              type="button"
              (click)="cancelled.emit()"
              class="rounded-lg px-4 py-2 text-sm font-semibold text-ink-soft transition hover:bg-surface-alt"
            >
              Cancelar
            </button>
            <button
              type="button"
              (click)="confirmed.emit()"
              class="rounded-lg bg-accent-red px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {{ confirmLabel() }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialog {
  readonly open = input.required<boolean>();
  readonly title = input<string>('Confirmar ação');
  readonly message = input<string>('Essa ação não pode ser desfeita.');
  readonly confirmLabel = input<string>('Excluir');
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
