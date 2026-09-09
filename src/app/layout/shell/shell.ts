import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideBuilding2,
  LucideCalculator,
  LucideFileBarChart,
  LucideLandmark,
  LucideLayoutDashboard,
  LucideLoaderCircle,
  LucideLogOut,
  LucideMenu,
  LucideReceiptText,
  LucideSettings,
  LucideX,
} from '@lucide/angular';
import { AuthService } from '../../core/services/auth.service';
import { BootstrapService } from '../../core/services/bootstrap.service';
import { ConfigService } from '../../core/services/config.service';

@Component({
  selector: 'app-shell',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    LucideLayoutDashboard,
    LucideReceiptText,
    LucideBuilding2,
    LucideCalculator,
    LucideLandmark,
    LucideFileBarChart,
    LucideSettings,
    LucideMenu,
    LucideX,
    LucideLogOut,
    LucideLoaderCircle,
  ],
  templateUrl: './shell.html',
})
export class Shell {
  protected readonly config = inject(ConfigService);
  protected readonly bootstrap = inject(BootstrapService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly sidebarOpen = signal(false);

  constructor() {
    this.bootstrap.carregar();
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  async sair(): Promise<void> {
    await this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
