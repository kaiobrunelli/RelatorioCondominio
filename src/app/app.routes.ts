import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { Shell } from './layout/shell/shell';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.LoginPage),
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'despesas',
        loadComponent: () => import('./features/despesas/despesas').then((m) => m.DespesasPage),
      },
      {
        path: 'unidades',
        loadComponent: () => import('./features/unidades/unidades').then((m) => m.UnidadesPage),
      },
      {
        path: 'rateio',
        loadComponent: () => import('./features/rateio/rateio').then((m) => m.RateioPage),
      },
      {
        path: 'caixa',
        loadComponent: () => import('./features/caixa/caixa').then((m) => m.CaixaPage),
      },
      {
        path: 'relatorio',
        loadComponent: () => import('./features/relatorio/relatorio').then((m) => m.RelatorioPage),
      },
      {
        path: 'configuracoes',
        loadComponent: () =>
          import('./features/configuracoes/configuracoes').then((m) => m.ConfiguracoesPage),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
